import { afterAll, beforeAll } from "bun:test";

beforeAll(() => {
  process.env.LOG_LEVEL = "error";
});

afterAll(() => {
  // global teardown
});
