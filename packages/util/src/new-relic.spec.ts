import { mockFetch } from "@aryzing/bun-mock-fetch";
import { describe, expect, it } from "bun:test";

import { Json } from "..";
import * as NewRelic from "./new-relic";
import * as R from "./runtypes";

describe("NewRelic", () => {
  describe("query", () => {
    it("should make request and return an array of objects", async () => {
      mockFetch(
        "https://api.eu.newrelic.com/graphql",
        new Response(
          Json.stringify({
            data: {
              actor: {
                account: {
                  nrql: {
                    results: [{ count: 1 }],
                  },
                },
              },
            },
          }),
        ),
      );

      const result = await NewRelic.query(
        "API_KEY",
        123456,
        `
    SELECT count(*) 
    FROM Log
    SINCE 1 week ago
  `,
        R.Record({ count: R.Number }),
      );

      expect(result).toEqual([{ count: 1 }]);
    });
  });
});
