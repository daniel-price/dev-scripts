enum OPERATOR {
  CONTAINS = "contains",
  STARTS_WITH = "starts_with",
  EQUALS = "==",
}

export function startsWith(field: string, value: string): string {
  return q(OPERATOR.STARTS_WITH, field, value);
}

export function equals(field: string, value: string): string {
  return `${field} ${OPERATOR.EQUALS} \`${value}\``;
}

export function notStartsWith(field: string, value: string): string {
  return q(OPERATOR.STARTS_WITH, field, value, true);
}

export function notContains(field: string, value: string): string {
  return q(OPERATOR.CONTAINS, field, value, true);
}

export function contains(field: string, value: string): string {
  return q(OPERATOR.CONTAINS, field, value);
}

/**
 * JMESPath syntax
 * field can be @ if it is just an array of strings, e.g.
 * getSqsQueues([contains("@", "brands")]);
 */
function q(
  operator: OPERATOR,
  field: string,
  value: string,
  inverse = false,
): string {
  return `${operator}(${field}, \`${value}\`) == \`${
    inverse ? "false" : "true"
  }\``;
}
