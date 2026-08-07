import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "bun:test";

import { insert } from "./insert";
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
  uniqueTableName,
} from "./test-support/table-fixtures";

describe("Sql.insert", () => {
  let env: PgTestEnvironment;
  let table: string;

  beforeAll(async () => {
    env = await createPgTestEnvironment();
  });

  afterAll(async () => {
    await env.close();
  });

  beforeEach(async () => {
    table = uniqueTableName("insert");
    await createPersonTable(env.client, table);
    env.flushStatements();
  });

  afterEach(async () => {
    await dropTable(env.client, table);
  });

  it("parameterizes and binds a single-row insert", async () => {
    await insert(env.client, table, [{ id: 1, name: "name_1", age: 10 }]);

    const statements = env.flushStatements();
    expectSqlStatements(statements, [
      `INSERT INTO "${table}" ("id", "name", "age") VALUES($1, $2, $3)`,
    ]);
    expectParamStatements(statements, [[1, "name_1", 10]]);
  });

  it("parameterizes a multi-row insert with one flat bind param list", async () => {
    await insert(env.client, table, [
      { id: 3, name: "name_3", age: 30 },
      { id: 4, name: "name_4", age: 40 },
    ]);

    const statements = env.flushStatements();
    expectSqlStatements(statements, [
      `INSERT INTO "${table}" ("id", "name", "age") VALUES($1, $2, $3),($4, $5, $6)`,
    ]);
    expectParamStatements(statements, [[3, "name_3", 30, 4, "name_4", 40]]);
  });
});
