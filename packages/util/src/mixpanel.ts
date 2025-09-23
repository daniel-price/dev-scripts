import * as DateUtil from "./date";
import * as Http from "./http";
import * as Json from "./json";
import * as Logger from "./logger";
import * as R from "./runtypes";

type ListEventsParams = {
  whereProperties: Record<string, string>;
  fromDate: Date;
  toDate: Date;
};

export async function listEvents<T>(
  bearerToken: string,
  projectId: string,
  eventNames: string[],
  runtype: R.Runtype<T>,
  params: Partial<ListEventsParams> = {},
): Promise<T[]> {
  const fromDate = DateUtil.format(
    params.fromDate || DateUtil.subDays(new Date(), 1),
    "yyyy-MM-dd",
  );
  const toDate = DateUtil.format(params.toDate || new Date(), "yyyy-MM-dd");

  const queryParams: Record<string, string | undefined> = {
    project_id: projectId,
  };

  const whereArray = Object.entries(params.whereProperties || {});
  const filterStatement = whereArray.length
    ? `.filter(event => ${whereArray
        .map(([key, value]) => `event.properties['${key}'] === '${value}'`)
        .join(").filter(event => ")})`
    : ""; // Each property being filtered must be in it's own filter function

  const script = `
      function main() {
        return Events({
          from_date: '${fromDate}',
          to_date: '${toDate}',
          event_selectors: [${eventNames.map((selector) => `{event: '${selector}'}`).join(",")}]
        })
        ${filterStatement}
      }
`;

  const res = await Http.post(
    "https://eu.mixpanel.com/api/query/jql",
    R.Array(runtype),
    {
      queryParams,
      headers: {
        Accept: "application/json",
        authorization: `Basic ${bearerToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `script=${script.replace(/[\n\r]/g, "")}`,
    },
  );

  return res as T[];
}

export async function listProfile<T>(
  bearerToken: string,
  projectId: string,
  runtype: R.Runtype<T>,
  distinctId: string,
): Promise<T | null> {
  const base64EncodedBearerToken = Buffer.from(bearerToken).toString("base64");
  const queryParams: Record<string, string | undefined> = {
    project_id: projectId,
  };

  const res = await Http.post(
    "https://eu.mixpanel.com/api/query/engage",
    R.String,
    {
      queryParams,
      headers: {
        authorization: `Basic ${base64EncodedBearerToken}`,
      },
      responseAsText: true,
      body: JSON.stringify({
        distinct_id: distinctId,
      }),
    },
  );

  const parsedRes = Json.parse(res, R.Record({ results: R.Array(runtype) }));

  Logger.info("Mixpanel profile response:", res);

  return parsedRes.results[0] || null;
}
