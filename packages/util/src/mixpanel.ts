import { DateUtil, Http, Json, Logger, R } from "..";

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
  const where = params.whereProperties
    ? Object.entries(params.whereProperties)
        .map(([key, value]) => {
          return `properties["${key}"] == "${value}"`;
        })
        .join(" and ")
    : undefined;

  const fromDate = DateUtil.format(
    params.fromDate || DateUtil.subDays(new Date(), 1),
    "yyyy-MM-dd",
  );
  const toDate = DateUtil.format(params.toDate || new Date(), "yyyy-MM-dd");

  const queryParams: Record<string, string | undefined> = {
    project_id: projectId,
    from_date: fromDate,
    to_date: toDate,
    event: JSON.stringify(eventNames),
    where,
  };

  const res = await Http.get(
    "https://data-eu.mixpanel.com/api/query/engage",
    R.String,
    {
      queryParams,
      headers: {
        authorization: `Basic ${bearerToken}`,
      },
      responseAsText: true,
    },
  );

  return res
    .split("\n")
    .filter((line) => !!line)
    .map((line) => {
      return Json.parse(line, runtype);
    });
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
