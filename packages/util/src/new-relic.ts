import * as Http from "./http";
import * as Logger from "./logger";
import * as R from "./runtypes";

export async function query<T>(
  apiKey: string,
  accountId: number,
  query: string,
  runtype: R.Runtype<T>,
): Promise<T[]> {
  const headers = {
    "Content-Type": "application/json",
    "API-Key": apiKey,
  };
  const oneLineQuery = query.replace(/\n/g, " ");

  const res = await Http.post(
    "https://api.eu.newrelic.com/graphql",
    R.Union(
      R.Record({
        data: R.Record({
          actor: R.Record({
            account: R.Record({
              nrql: R.Record({
                results: R.Array(runtype),
              }),
            }),
          }),
        }),
      }),
      R.Record({ errors: R.Array(R.Record({ message: R.String })) }),
    ),
    {
      headers,
      body: {
        query: `
{
  actor {
    account(id: ${accountId}) {
      nrql(query: "${oneLineQuery} LIMIT 5000") {
        results
      }
    }
  }
}
`,
      },
    },
  );

  if ("errors" in res) {
    Logger.error("Error running New Relic query", JSON.stringify(res.errors));
    throw new Error("Error running New Relic query");
  }

  return res.data.actor.account.nrql.results;
}
