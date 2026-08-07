import { expect } from "bun:test";

import { CapturedStatement } from "./pg-protocol";

type BindParams = (string | number | Buffer | null)[];

function sqlOnly(statements: CapturedStatement[]): string[] {
  return statements.filter((s): s is string => typeof s === "string");
}

function paramsOnly(statements: CapturedStatement[]): BindParams[] {
  return statements.filter((s): s is BindParams => Array.isArray(s));
}

/** Asserts the captured Parse messages (SQL text) match `expected` in order. */
export function expectSqlStatements(
  statements: CapturedStatement[],
  expected: string[],
): void {
  expect(sqlOnly(statements)).toEqual(expected);
}

/** Asserts the captured Bind messages (parameter arrays) match `expected`. */
export function expectParamStatements(
  statements: CapturedStatement[],
  expected: BindParams[],
): void {
  expect(paramsOnly(statements)).toEqual(expected);
}
