import { SQL, sql as bunsql } from "bun";

import * as Logger from "./logger";
import * as R from "./runtypes";

export const sql = bunsql;

type Wheres = Record<string, unknown>;

type Options = {
  stagePrefix?: string;
  wheres?: Wheres;
  cascade?: boolean;
};

type ForeignKeyReference = {
  referencing_table: string;
  referencing_column: string;
  referenced_column: string;
};

function quotedRegclass(tableName: string): string {
  return `"${tableName.replace(/"/g, '""')}"`;
}

function tableNameFromRegclass(regclass: string): string {
  const unqualified = regclass.includes(".")
    ? regclass.split(".").pop()!
    : regclass;
  return unqualified.replace(/^"(.*)"$/, "$1");
}

function prefixedTableName(table: string, options: Options): string {
  return `${options.stagePrefix ? `${options.stagePrefix}_` : ""}${table}`;
}

export async function select<T>(
  client: SQL,
  table: string,
  runtype: R.Runtype<T>,
  options: Options = {},
): Promise<{
  records: T[];
  count: number;
  affectedRows: number | null;
  lastInsertRowid: number | null;
}> {
  const query = client`
SELECT *
FROM ${sql(prefixedTableName(table, options))}
${constructWhere(options.wheres)}
`;
  const result = await query;
  if (!(result && typeof result === "object")) {
    throw new Error("Unexpected result from database query");
  }
  const records = Object.keys(result)
    .filter((k) => !isNaN(Number(k)))
    .map((key) => {
      return result[key];
    });

  const finalResult = {
    records,
    count: result.count,
    affectedRows: result.affectedRows,
    lastInsertRowid: result.lastInsertRowid,
  };

  return R.assertType(
    R.Record({
      records: R.Array(runtype),
      count: R.Number,
      affectedRows: R.Nullable(R.Number),
      lastInsertRowid: R.Nullable(R.Number),
    }),
    finalResult,
  );
}

function getSymbolProperty(obj: unknown, symbolName: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  for (const prop of Object.getOwnPropertySymbols(obj)) {
    if (prop.toString() === `Symbol(${symbolName})`) {
      return (obj as Record<symbol, unknown>)[prop];
    }
  }
  return undefined;
}

function extractQueryString(
  query: unknown,
  paramOffset: number = 0,
): { queryString: string; paramCount: number } {
  const strings = getSymbolProperty(query, "strings");
  const values = getSymbolProperty(query, "values");

  if (!strings || !values) {
    return { queryString: "", paramCount: 0 };
  }

  // Handle array of strings (SQL template parts)
  const stringParts = Array.isArray(strings) ? strings : [strings];

  // Handle array of values (interpolated values)
  const valueArray = Array.isArray(values) ? values : [];

  // Reconstruct the query string by interleaving strings and parameter placeholders
  let queryString = "";
  let currentParamIndex = paramOffset;

  for (let i = 0; i < stringParts.length; i++) {
    queryString += stringParts[i] || "";
    if (i < valueArray.length) {
      // For nested SQL queries (like WHERE clauses), recursively extract them
      const value = valueArray[i];
      if (
        value &&
        typeof value === "object" &&
        getSymbolProperty(value, "strings")
      ) {
        const nested = extractQueryString(value, currentParamIndex);
        queryString += nested.queryString;
        currentParamIndex += nested.paramCount;
      } else {
        // Use parameter placeholder format ($1, $2, etc.)
        currentParamIndex++;
        queryString += `$${currentParamIndex}`;
      }
    }
  }

  return {
    queryString: queryString.trim().replace(/\s+/g, " "),
    paramCount: currentParamIndex - paramOffset,
  };
}

function extractQueryParams(query: unknown): unknown[] {
  const values = getSymbolProperty(query, "values");
  if (!values) {
    return [];
  }

  const valueArray = Array.isArray(values) ? values : [];
  const params: unknown[] = [];

  for (const value of valueArray) {
    // For nested SQL queries, recursively extract their parameters
    if (
      value &&
      typeof value === "object" &&
      getSymbolProperty(value, "strings")
    ) {
      const nestedParams = extractQueryParams(value);
      params.push(...nestedParams);
    } else {
      params.push(value);
    }
  }

  return params;
}

function logQuery(query: unknown): void {
  const { queryString } = extractQueryString(query);
  const params = extractQueryParams(query);

  if (queryString) {
    Logger.info("Executing SQL query:", queryString);
    if (params.length > 0) {
      Logger.info("Query parameters:", params);
    }
  } else {
    Logger.warn("Unable to extract query string from SQL query object");
  }
}

/**
 * Wraps an SQL client with a Proxy that automatically logs all queries.
 * This intercepts template literal calls (client`...`) and logs the query
 * before execution.
 */
export function withQueryLogging(client: SQL): SQL {
  return new Proxy(client, {
    apply(target: SQL, thisArg: unknown, args: unknown[]): unknown {
      // Intercept template literal calls: client`...`
      // args[0] is the template strings array, args[1+] are the values
      const query = Reflect.apply(
        target as (...args: unknown[]) => unknown,
        thisArg,
        args,
      );

      // Log the query
      logQuery(query);

      // Wrap the query result to intercept await (then method)
      if (query && typeof query === "object") {
        return new Proxy(query as Record<string | symbol, unknown>, {
          get(
            target: Record<string | symbol, unknown>,
            prop: string | symbol,
          ): unknown {
            const value = Reflect.get(target, prop);

            // Intercept the 'then' method for await
            if (prop === "then" && typeof value === "function") {
              return function (
                onFulfilled?: (value: unknown) => unknown,
                onRejected?: (reason: unknown) => unknown,
              ): Promise<unknown> {
                return (
                  value as (
                    onFulfilled?: (value: unknown) => unknown,
                    onRejected?: (reason: unknown) => unknown,
                  ) => Promise<unknown>
                ).call(
                  target,
                  onFulfilled
                    ? (result: unknown): unknown => {
                        // Could log result here if needed
                        return onFulfilled(result);
                      }
                    : undefined,
                  onRejected,
                );
              };
            }

            return value;
          },
        });
      }

      return query;
    },
  }) as SQL;
}

async function getForeignKeyReferences(
  client: SQL,
  tableName: string,
): Promise<ForeignKeyReference[]> {
  const refs = await client`
SELECT
  conrelid::regclass::text AS referencing_table,
  (
    SELECT attname
    FROM pg_attribute
    WHERE attrelid = c.conrelid
      AND attnum = c.conkey[1]
  ) AS referencing_column,
  (
    SELECT attname
    FROM pg_attribute
    WHERE attrelid = c.confrelid
      AND attnum = c.confkey[1]
  ) AS referenced_column
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.confrelid = to_regclass(${quotedRegclass(tableName)})
`;
  return refs as ForeignKeyReference[];
}

async function isColumnNullable(
  client: SQL,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const result = await client`
SELECT NOT a.attnotnull AS is_nullable
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
WHERE c.oid = to_regclass(${quotedRegclass(tableName)})
  AND a.attname = ${columnName}
  AND a.attnum > 0
  AND NOT a.attisdropped
`;
  return Boolean(result[0]?.is_nullable);
}

async function getMatchingColumnValues(
  client: SQL,
  tableName: string,
  columnName: string,
  wheres: Wheres,
): Promise<unknown[]> {
  const query = client`
SELECT ${sql(columnName)} AS value
FROM ${sql(tableName)}
${constructWhere(wheres)}
`;
  const rows = await query;
  return Object.keys(rows)
    .filter((key) => !isNaN(Number(key)))
    .map((key) => rows[key].value);
}

async function deleteReferencingRows(
  client: SQL,
  table: string,
  wheres: Wheres,
  options: Options,
): Promise<void> {
  const tableName = prefixedTableName(table, options);
  const refs = await getForeignKeyReferences(client, tableName);

  for (const ref of refs) {
    const childTable = tableNameFromRegclass(ref.referencing_table);
    const childWheresList: Wheres[] = [];

    if (wheres[ref.referenced_column] !== undefined) {
      childWheresList.push({
        [ref.referencing_column]: wheres[ref.referenced_column],
      });
    } else {
      const referencedValues = await getMatchingColumnValues(
        client,
        tableName,
        ref.referenced_column,
        wheres,
      );
      for (const value of referencedValues) {
        childWheresList.push({ [ref.referencing_column]: value });
      }
    }

    for (const childWheres of childWheresList) {
      if (await isColumnNullable(client, childTable, ref.referencing_column)) {
        await update(
          client,
          childTable,
          { [ref.referencing_column]: null },
          { ...options, wheres: childWheres },
        );
        continue;
      }

      await deleteReferencingRows(client, childTable, childWheres, options);
      await deleteAll(client, childTable, {
        ...options,
        wheres: childWheres,
        cascade: false,
      });
    }
  }
}

export async function deleteAll(
  client: SQL,
  table: string,
  options: Options = {},
): Promise<void> {
  if (options.cascade && options.wheres) {
    await deleteReferencingRows(client, table, options.wheres, options);
  }

  const query = client`
DELETE FROM ${sql(prefixedTableName(table, options))}
${constructWhere(options.wheres)}
`;
  const res = await query;
  Logger.info(`Deleted ${res.count} rows from ${table}`);
  return res.count;
}

export async function insert<T>(
  client: SQL,
  table: string,
  items: Array<T>,
  options: Partial<Options> = {},
): Promise<void> {
  const query = client`
INSERT INTO ${sql(prefixedTableName(table, options))}
${sql(items)}
`;
  await query;
}

export async function update(
  client: SQL,
  table: string,
  set: Record<string, unknown>,
  options: Options = {},
): Promise<void> {
  const tableName = prefixedTableName(table, options);

  const setClause = Object.entries(set)
    .map(([key, value]) => sql`${sql(key)} = ${value}`)
    .reduce((prev, curr, idx) => (idx === 0 ? curr : sql`${prev}, ${curr}`));

  const query = client`
UPDATE ${sql(tableName)} 
SET ${setClause} 
${constructWhere(options.wheres)}`;
  await query;
}

function constructWhere(wheres?: Wheres): Bun.SQLQuery {
  const whereEntries = Object.entries(wheres || {});
  return whereEntries.length
    ? sql`WHERE ${whereEntries
        .map(([key, value]) => sql`${sql(key)} = ${value}`)
        .reduce((prev, curr, idx) =>
          idx === 0 ? curr : sql`${prev} AND ${curr}`,
        )}`
    : sql``;
}
