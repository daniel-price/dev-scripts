import { Database } from "bun:sqlite";

import * as R from "./runtypes";

type ValueType = string | number | boolean | null;

export { Database };

function constructClauses(
  wheres: Record<string, ValueType>,
): [string[], ValueType[]] {
  return Object.entries(wheres).reduce(
    (acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      acc[0].push(`"${key}" = ?`);
      acc[1].push(value);
      return acc;
    },
    [new Array<string>(), new Array<ValueType>()],
  );
}

function constructSetClause(
  sets: Record<string, ValueType>,
): [string, ValueType[]] {
  if (Object.keys(sets).length === 0) {
    throw new Error("Nothing to set!");
  }

  const [setClauses, setValues] = constructClauses(sets);

  return [`SET ${setClauses.join(",\n")}`, setValues];
}

function constructWhereClause(
  wheres: Record<string, ValueType>,
): [string, ValueType[]] {
  if (Object.keys(wheres).length === 0) {
    return ["", []];
  }

  const [whereClauses, whereValues] = constructClauses(wheres);

  return [`WHERE ${whereClauses.join("\nAND ")}`, whereValues];
}

export async function select<T>(
  database: Database,
  table: string,
  runtype: R.Runtype<T>,
  wheres: Record<string, ValueType> = {},
): Promise<T> {
  const [whereClause, whereValues] = constructWhereClause(wheres);
  const query = database.query(
    `
SELECT * 
FROM "${table}"
${whereClause}
`,
  );
  const results = await query.get(...whereValues);
  return R.assertType(runtype, results);
}

export function selectAll<T>(
  database: Database,
  table: string,
  runtype: R.Runtype<T>,
  wheres: Record<string, ValueType> = {},
): T[] {
  const [whereClause, whereValues] = constructWhereClause(wheres);
  const query = database.query(`
SELECT * 
FROM "${table}"
${whereClause}
`);
  const results = query.all(...whereValues);
  return R.assertType(R.Array(runtype), results);
}

export function update(
  database: Database,
  table: string,
  sets: Record<string, ValueType>,
  wheres: Record<string, ValueType> = {},
): void {
  const [setClause, setValues] = constructSetClause(sets);
  const [whereClause, whereValues] = constructWhereClause(wheres);

  const query = database.query(`
UPDATE "${table}"
${setClause}
${whereClause}
`);

  const parameters = [...setValues, ...whereValues];

  if (query.paramsCount !== parameters.length) {
    throw new Error(
      `Parameter count mismatch: expected ${query.paramsCount}, got ${parameters.length}`,
    );
  }

  query.run(...parameters);
}
