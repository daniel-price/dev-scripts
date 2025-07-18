import { DateUtil, Http, Json, R } from "..";

type Params = {
  whereProperties: Record<string, string>;
  fromDate: Date;
  toDate: Date;
};

export async function query<T>(
  bearerToken: string,
  projectId: string,
  eventNames: string[],
  runtype: R.Runtype<T>,
  params: Partial<Params> = {},
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
    "https://data-eu.mixpanel.com/api/2.0/export",
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
