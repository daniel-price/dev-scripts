import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import * as bunSql from "bun";

import { withQueryLogging } from "../logging";
import { SQL as SqlClient } from "../util";
import { CapturedStatement, parsePgMessage } from "./pg-protocol";

const { SQL } = bunSql;

export type PgTestEnvironment = {
  client: SqlClient;
  flushStatements: () => CapturedStatement[];
  close: () => Promise<void>;
};

let nextPort = 9876;

type CapturingPGlite = PGlite & { _statements: CapturedStatement[] };

export async function createPgTestEnvironment(): Promise<PgTestEnvironment> {
  const port = nextPort++;

  const db = (await PGlite.create()) as unknown as CapturingPGlite;
  db._statements = [];

  const originalFn = db.execProtocolRaw.bind(db);
  db.execProtocolRaw = (buf: Uint8Array): Promise<Uint8Array> => {
    const message = parsePgMessage(buf);
    if (message) db._statements.push(message);
    return originalFn(buf);
  };

  const socket = new PGLiteSocketServer({
    db,
    port,
    host: "127.0.0.1",
  });
  await socket.start();

  const client = withQueryLogging(
    new SQL({
      hostname: "127.0.0.1",
      port,
      username: "postgres",
      password: "postgres",
      database: "postgres",
    }),
  );

  return {
    client,
    flushStatements: (): CapturedStatement[] => {
      const captured = db._statements;
      db._statements = [];
      return captured;
    },
    close: async (): Promise<void> => {
      // Best-effort teardown. Bun's SQL client can hang on `end()` when
      // the peer socket is closing, so we swallow errors and rely on a
      // short timeout to guarantee forward progress.
      await Promise.race([
        client.end({ timeout: 1 }).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      await socket.stop().catch(() => {});
      await db.close().catch(() => {});
    },
  };
}
