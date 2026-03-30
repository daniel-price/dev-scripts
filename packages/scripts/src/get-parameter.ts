import { ParameterStore } from "@dev/aws";
import { Logger, R } from "@dev/util";

export async function main(): Promise<void> {
  const ssm = ParameterStore.getSsmClient();
  const res = await ParameterStore.getJSONParameterValue(
    ssm,
    "/param/PMS_API_URL",
    R.Record({}),
  );
  Logger.info("Parameter value:", res);
}
