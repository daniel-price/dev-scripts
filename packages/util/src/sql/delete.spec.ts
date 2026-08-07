import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

import { deleteAll } from "./delete";
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

describe("Sql.deleteAll", () => {
  let env: PgTestEnvironment;
  let table: string;

  beforeAll(async () => {
    env = await createPgTestEnvironment();
  });

  afterAll(async () => {
    await env.close();
  });

  beforeEach(async () => {
    table = uniqueTableName("delete");
    await createPersonTable(env.client, table);
    await seedPeople(env.client, table, [
      { id: 1, name: "name_1", age: 10 },
      { id: 2, name: "name_2", age: 20 },
    ]);
    env.flushStatements();
  });

  afterEach(async () => {
    await dropTable(env.client, table);
  });

  it("removes matching rows when a WHERE clause is provided", async () => {
    await deleteAll(env.client, table).withWheres({ name: "name_1" });

    const statements = env.flushStatements();
    expectSqlStatements(statements, [
      `DELETE FROM "${table}" WHERE "name" = $1`,
    ]);
    expectParamStatements(statements, [["name_1"]]);

    const result = await select(env.client, table, personRuntype);
    expect(result.count).toBe(1);
    expect(result.records).toEqual([{ id: 2, name: "name_2", age: 20 }]);
  });

  it("removes every row when no WHERE clause is provided", async () => {
    await deleteAll(env.client, table);

    expectSqlStatements(env.flushStatements(), [`DELETE FROM "${table}"`]);

    const result = await select(env.client, table, personRuntype);
    expect(result.count).toBe(0);
    expect(result.records).toEqual([]);
  });
});
