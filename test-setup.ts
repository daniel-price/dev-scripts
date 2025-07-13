import { afterAll, beforeAll } from "bun:test";

beforeAll(() => {
  if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = "error";
});

afterAll(() => {
  // global teardown
});
