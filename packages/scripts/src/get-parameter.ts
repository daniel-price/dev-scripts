import { ParameterStore } from "@daniel-price/aws";
import { Logger, R } from "@daniel-price/util";

import { defineScript } from "./script";

export default defineScript({
  args: {
    name: { type: R.String, description: "The name of the parameter to get." },
  },
  run: async ({ name }) => {
    const ssm = ParameterStore.getSsmClient("us-east-1");
    const res = await ParameterStore.getJSONParameterValue(
      ssm,
      `/param/${name}`,
      R.Record(R.String, R.String),
    );
    Logger.info("Parameter value:", res);
  },
});
