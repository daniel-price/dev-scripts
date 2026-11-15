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
      // Socket shutdown may wait indefinitely for a pending Bun SQL connection
      // on some platforms. Bound every best-effort cleanup stage so test hooks
      // cannot hang, while still attempting to release all resources.
      const settle = async (promise: Promise<unknown>): Promise<void> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            promise.then(() => {}, () => {}),
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, 250);
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      };

      await settle(client.end({ timeout: 1 }));
      await settle(socket.stop());
      await settle(db.close());

    },
  };
}
