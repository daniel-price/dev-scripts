import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

import { select } from "./select";
import {
  expectParamStatements,
  expectSqlStatements,
} from "./test-support/expect-statements";
import {
  createPgTestEnvironment,
  PgTestEnvironment,
} from "./test-support/pg-environment";
import {
  createPersonTable,
  dropTable,
  personRuntype,
  seedPeople,
  uniqueTableName,
} from "./test-support/table-fixtures";

describe("Sql.select", () => {
  let env: PgTestEnvironment;
  let table: string;

  beforeAll(async () => {
    env = await createPgTestEnvironment();
  });

  afterAll(async () => {
    await env.close();
  });

  beforeEach(async () => {
    table = uniqueTableName("select");
    await createPersonTable(env.client, table);
    env.flushStatements();
  });

  afterEach(async () => {
    await dropTable(env.client, table);
  });

  it("generates a bare SELECT * query", async () => {
    await select(env.client, table, personRuntype);

    expectSqlStatements(env.flushStatements(), [`SELECT * FROM "${table}"`]);
  });

  it("returns records parsed against the provided runtype", async () => {
    await seedPeople(env.client, table, [{ id: 1, name: "name_1", age: 10 }]);
    env.flushStatements();

    const result = await select(env.client, table, personRuntype).withWheres({
      id: 1,
    });

    expect(result).toEqual({
      affectedRows: null,
      count: 1,
      lastInsertRowid: null,
      records: [{ age: 10, id: 1, name: "name_1" }],
    });
  });

  it("hides non-runtyped fields from the record type", async () => {
    await seedPeople(env.client, table, [{ id: 1, name: "name_1", age: 10 }]);

    const result = await select(env.client, table, personRuntype);

    for (const record of result.records) {
      expect(record.age).toBeTypeOf("number");
      // @ts-expect-error not_a_field is not on personRuntype
      expect(record.not_a_field).toBeUndefined();
    }
  });

  describe("withWheres", () => {
    it("adds a WHERE clause with bound params and filters records", async () => {
      await seedPeople(env.client, table, [
        { id: 1, name: "name_1", age: 10 },
        { id: 2, name: "name_2", age: 20 },
      ]);
      env.flushStatements();

      const result = await select(env.client, table, personRuntype).withWheres({
        age: 20,
      });

      const statements = env.flushStatements();
      expectSqlStatements(statements, [
        `SELECT * FROM "${table}" WHERE "age" = $1`,
      ]);
      expectParamStatements(statements, [[20]]);
      expect(result.records).toEqual([{ age: 20, id: 2, name: "name_2" }]);
    });
  });

  describe("withTablePrefix", () => {
    it("prepends the prefix and underscore to the table name", async () => {
      const bare = uniqueTableName("prefixed");
      const prefixed = `stage_${bare}`;
      await createPersonTable(env.client, prefixed);
      env.flushStatements();

      try {
        await select(env.client, bare, personRuntype).withTablePrefix("stage");

        expectSqlStatements(env.flushStatements(), [
          `SELECT * FROM "${prefixed}"`,
        ]);
      } finally {
        await dropTable(env.client, prefixed);
      }
    });
  });
});
