import { randomUUID } from "crypto";

import * as R from "../../runtypes";
import { insert } from "../insert";
import { sql, SQL } from "../util";

export const personRuntype = R.Object({
  age: R.Number,
  id: R.Number,
  name: R.String,
});

export const personNullableNameRuntype = R.Object({
  age: R.Number,
  id: R.Number,
  name: R.Nullable(R.String),
});

export type Person = R.Static<typeof personRuntype>;

export function uniqueTableName(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "_")}`;
}

export async function createPersonTable(
  client: SQL,
  table: string,
): Promise<void> {
  await client`DROP TABLE IF EXISTS ${sql(table)}`;
  await client`CREATE TABLE IF NOT EXISTS ${sql(
    table,
  )} (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)`;
}

export async function dropTable(client: SQL, table: string): Promise<void> {
  await client`DROP TABLE IF EXISTS ${sql(table)}`;
}

export async function seedPeople(
  client: SQL,
  table: string,
  people: Person[],
): Promise<void> {
  await insert(client, table, people);
}
