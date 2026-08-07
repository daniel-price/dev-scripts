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
  personNullableNameRuntype,
  seedPeople,
  uniqueTableName,
} from "./test-support/table-fixtures";
import { update } from "./update";

describe("Sql.update", () => {
  let env: PgTestEnvironment;
  let table: string;

  beforeAll(async () => {
    env = await createPgTestEnvironment();
  });

  afterAll(async () => {
    await env.close();
  });

  beforeEach(async () => {
    table = uniqueTableName("update");
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

  it("applies a targeted update with a WHERE clause", async () => {
    await update(env.client, table, { name: "name_1_updated" }).withWheres({
      id: 1,
    });

    const statements = env.flushStatements();
    expectSqlStatements(statements, [
      `UPDATE "${table}" SET "name" = $1 WHERE "id" = $2`,
    ]);
    expectParamStatements(statements, [["name_1_updated", 1]]);
  });

  it("updates every row when no WHERE clause is provided", async () => {
    await update(env.client, table, { name: "name_updated" });

    const statements = env.flushStatements();
    expectSqlStatements(statements, [`UPDATE "${table}" SET "name" = $1`]);
    expectParamStatements(statements, [["name_updated"]]);
  });

  it("sends null through as a bind parameter", async () => {
    await update(env.client, table, { name: null }).withWheres({ id: 1 });

    const statements = env.flushStatements();
    expectSqlStatements(statements, [
      `UPDATE "${table}" SET "name" = $1 WHERE "id" = $2`,
    ]);
    expectParamStatements(statements, [[null, 1]]);

    const result = await select(
      env.client,
      table,
      personNullableNameRuntype,
    ).withWheres({ id: 1 });
    expect(result.records).toEqual([{ id: 1, name: null, age: 10 }]);
  });

  it("binds long strings without truncation or escaping", async () => {
    const longValue = "danp-dentally.danp.sandbox.portal.dental";

    await update(env.client, table, { name: longValue }).withWheres({ id: 1 });

    expectParamStatements(env.flushStatements(), [[longValue, 1]]);
  });
});
