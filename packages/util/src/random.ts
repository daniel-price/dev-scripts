import { randomBytes } from "node:crypto";

export function string(length: number): string {
  return randomBytes(length).toString("hex");
}
