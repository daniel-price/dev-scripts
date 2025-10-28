import { ParameterStore } from "@dev/aws";
import { Logger, R } from "@dev/util";

export async function main(): Promise<void> {
  const res = await ParameterStore.getJSONParameterValue(
    "/param/PMS_API_URL",
    R.Record({}),
  );
  Logger.info("Parameter value:", res);
}
