import { describe, expect, it } from "bun:test";

import { paginate } from "./paginate";

describe("paginate", () => {
  it("collects results across pages until nextToken is empty", async () => {
    const pages = [
      { results: [1, 2], nextToken: "page-2" },
      { results: [3], nextToken: "page-3" },
      { results: [4, 5] },
    ];

    const output = await paginate(async (token) => {
      if (!token) return pages[0];
      if (token === "page-2") return pages[1];
      return pages[2];
    });

    expect(output).toEqual([1, 2, 3, 4, 5]);
  });

  it("starts from an initial token", async () => {
    const output = await paginate(
      async (token) => ({
        results: [token ?? "missing"],
      }),
      "start",
    );

    expect(output).toEqual(["start"]);
  });
});
