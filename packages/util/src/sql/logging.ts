import * as Logger from "../logger";
import { SQL } from "./util";

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
    Logger.info(`Executing SQL query:
${queryString}
${params.length > 0 ? `with parameters: ${JSON.stringify(params)}` : ""}`);
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
