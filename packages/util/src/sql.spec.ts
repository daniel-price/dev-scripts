import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import * as bunSql from "bun";
import { describe, expect, it } from "bun:test";

import { R, Sql } from "..";

const { SQL } = bunSql;

// Create a PGlite instance for testing via unit tests
const db = (await PGlite.create()) as unknown as PGlite & {
  _statements: Array<unknown>;
  getStatements: () => Array<unknown>;
};

function parsePgMessage(
  buf: Uint8Array,
): string | (string | number | Buffer | null)[] | null {
  const buffer = Buffer.from(buf);
  const type = String.fromCharCode(buffer[0]);

  if (type === "P") {
    // Parse message
    // Format:
    // Byte1('P'), Int32(len), String(statement_name, \0), String(query, \0)

    let offset = 5;
    const stmtNameEnd = buffer.indexOf(0, offset);
    if (stmtNameEnd === -1) throw new Error("No null after statement name");

    offset = stmtNameEnd + 1;

    const queryEnd = buffer.indexOf(0, offset);
    if (queryEnd === -1) throw new Error("No null after query string");

    const query = buffer.toString("utf8", offset, queryEnd);

    return query.trim().replace(/\s+/g, " ");
  }

  if (type === "B") {
    // Parse 'B' (Bind) message params array

    let offset = 5; // after type byte + length (4 bytes)

    // Parse portal name (string terminated by \0)
    const portalEnd = buffer.indexOf(0, offset);
    if (portalEnd === -1) throw new Error("No null after portal name");
    offset = portalEnd + 1;

    // Parse statement name (string terminated by \0)
    const stmtEnd = buffer.indexOf(0, offset);
    if (stmtEnd === -1) throw new Error("No null after statement name");
    offset = stmtEnd + 1;

    // Number of parameter format codes (Int16)
    const paramFormatCount = buffer.readUInt16BE(offset);
    offset += 2;

    // Read parameter formats (not used here, but skip)
    const paramFormats = [];
    for (let i = 0; i < paramFormatCount; i++) {
      paramFormats.push(buffer.readUInt16BE(offset));
      offset += 2;
    }

    // Number of parameters (Int16)
    const paramCount = buffer.readUInt16BE(offset);
    offset += 2;

    const params = [];

    for (let i = 0; i < paramCount; i++) {
      const paramLen = buffer.readInt32BE(offset);
      offset += 4;

      if (paramLen === -1) {
        params.push(null);
      } else {
        const paramBytes = buffer.subarray(offset, offset + paramLen);
        offset += paramLen;

        if (paramFormats.length === 0 || paramFormats[i] === 0) {
          // text format
          params.push(paramBytes.toString("utf8"));
        } else {
          // binary format - convert buffer to number
          if (paramBytes.length === 4) {
            params.push(paramBytes.readInt32BE(0));
          } else if (paramBytes.length === 2) {
            params.push(paramBytes.readInt16BE(0));
          } else if (paramBytes.length === 1) {
            params.push(paramBytes.readInt8(0));
          } else {
            params.push(paramBytes); // unknown format, fallback
          }
        }
      }
    }

    // Ignore result-column format codes (Int16 + codes)
    // Optional: parse or skip them
    // const resultFormatCount = buffer.readUInt16BE(offset);
    // offset += 2 + 2 * resultFormatCount;

    return params;
  }

  return null;
}

db._statements = new Array<string | (string | number | Buffer | null)[]>();
const originalFn = db.execProtocolRaw.bind(db);
db.execProtocolRaw = (buf: Uint8Array): Promise<Uint8Array> => {
  const message = parsePgMessage(buf);
  if (message) {
    //strip off leading and trailing whites
    db._statements.push(message);
  }
  return originalFn(buf);
};

db.getStatements = (): Array<unknown> => {
  const statement = db._statements;
  db._statements = [];
  return statement;
};

// Wrap PGlite instance
const socket = new PGLiteSocketServer({
  db,
  port: 9876,
  host: "127.0.0.1",
});
await socket.start();

const tableName = "test_table";

describe("Sql", () => {
  it("should select, insert, update and delete correctly", async () => {
    const client = new SQL({
      hostname: "127.0.0.1",
      port: 9876,
      username: "postgres",
      password: "postgres",
      database: "postgres",
    });
    await client`SELECT 1`;
    expect(db.getStatements()).toEqual(["SELECT 1"]);
    await client`DROP TABLE IF EXISTS ${Sql.sql(tableName)}`;
    expect(db.getStatements()).toEqual([`DROP TABLE IF EXISTS "test_table"`]);
    await client`CREATE TABLE IF NOT EXISTS ${Sql.sql(tableName)} (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)`;
    expect(db.getStatements()).toEqual([
      `CREATE TABLE IF NOT EXISTS "test_table" (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)`,
    ]);

    await Sql.insert(client, tableName, [{ id: 1, name: "name_1", age: 10 }]);

    expect(db.getStatements()).toEqual([
      `INSERT INTO "test_table" ("id", "name", "age") VALUES($1, $2, $3)`,
      [1, "name_1", 10],
    ]);

    await Sql.insert(client, tableName, [{ id: 2, name: "name_2", age: 20 }]);
    expect(db.getStatements()).toEqual([[2, "name_2", 20]]);

    await Sql.insert(client, tableName, [
      { id: 3, name: "name_3", age: 30 },
      { id: 4, name: "name_4", age: 40 },
    ]);
    expect(db.getStatements()).toEqual([
      `INSERT INTO "test_table" ("id", "name", "age") VALUES($1, $2, $3),($4, $5, $6)`,
      [3, "name_3", 30, 4, "name_4", 40],
    ]);

    await Sql.update(
      client,
      tableName,
      { name: "name_1_updated" },
      { wheres: { id: 1 } },
    );

    expect(db.getStatements()).toEqual([
      `UPDATE "test_table" SET "name" = $1 WHERE "id" = $2`,
      ["name_1_updated", 1],
    ]);

    const updated = await Sql.select(client, tableName, R.Record({}));
    expect(db.getStatements()).toEqual([`SELECT * FROM "test_table"`]);
    expect(updated).toEqual([
      {
        age: 20,
        id: 2,
        name: "name_2",
      },
      {
        age: 30,
        id: 3,
        name: "name_3",
      },
      {
        age: 40,
        id: 4,
        name: "name_4",
      },
      {
        age: 10,
        id: 1,
        name: "name_1_updated",
      },
    ]);

    await Sql.update(client, tableName, { name: "name_updated" });

    expect(db.getStatements()).toEqual([
      `UPDATE "test_table" SET "name" = $1`,
      ["name_updated"],
    ]);

    const updated2 = await Sql.select(client, tableName, R.Record({}));
    expect(db.getStatements()).toEqual([[]]);
    expect(updated2).toEqual([
      {
        age: 20,
        id: 2,
        name: "name_updated",
      },
      {
        age: 30,
        id: 3,
        name: "name_updated",
      },
      {
        age: 40,
        id: 4,
        name: "name_updated",
      },
      {
        age: 10,
        id: 1,
        name: "name_updated",
      },
    ]);

    await Sql.update(
      client,
      tableName,
      { name: "name_1_updated" },
      { wheres: { id: 1 } },
    );
    expect(db.getStatements()).toEqual([["name_1_updated", 1]]);

    const updated3 = await Sql.select(client, tableName, R.Record({}));
    expect(db.getStatements()).toEqual([[]]);
    expect(updated3).toEqual([
      {
        age: 20,
        id: 2,
        name: "name_updated",
      },
      {
        age: 30,
        id: 3,
        name: "name_updated",
      },
      {
        age: 40,
        id: 4,
        name: "name_updated",
      },
      {
        age: 10,
        id: 1,
        name: "name_1_updated",
      },
    ]);
    await Sql.deleteAll(client, tableName, { id: 1 });
    expect(db.getStatements()).toEqual([
      `DELETE FROM "test_table" WHERE "id" = $1`,
      [1],
    ]);
    const afterDeleteAll = await Sql.select(client, tableName, R.Record({}));
    expect(db.getStatements()).toEqual([[]]);
    expect(afterDeleteAll).toEqual([
      {
        age: 20,
        id: 2,
        name: "name_updated",
      },
      {
        age: 30,
        id: 3,
        name: "name_updated",
      },
      {
        age: 40,
        id: 4,
        name: "name_updated",
      },
    ]);

    await Sql.deleteAll(client, tableName);
    expect(db.getStatements()).toEqual([`DELETE FROM "test_table"`]);
    const afterDeleteAll2 = await Sql.select(client, tableName, R.Record({}));
    expect(db.getStatements()).toEqual([[]]);
    expect(afterDeleteAll2).toEqual([]);
  });
});
