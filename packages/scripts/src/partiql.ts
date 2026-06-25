import { DynamoDB } from "@dev/aws";
import { Logger, R } from "@dev/util";

import { defineScript } from "./script";

const TABLE = "dentr-apis-verification-live-patient-accounts";

export default defineScript({
  help: () => {
    return `This script runs a PartiQL query on the DynamoDB table "${TABLE}".`;
  },
  run: async () => {
    const dynamoClient = DynamoDB.getDynamoDBClient();

    const all = await DynamoDB.partiql(
      dynamoClient,
      `
SELECT attempts_left
FROM "${TABLE}"
`,
      R.Record({ attempts_left: R.Number.optional() }),
    );

    const locked = all.filter((item) => item.attempts_left === 0);

    Logger.info(
      `Locked accounts: ${locked.length}/${locked.length + all.length}`,
    );
  },
});
