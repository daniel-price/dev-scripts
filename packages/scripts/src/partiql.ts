import { DynamoDB } from "@dev/aws";
import { Logger, R } from "@dev/util";

const R_MockDentallyApisItem = R.Record({ entity: R.String });

export async function main(): Promise<void> {
  const updated_results = await DynamoDB.partiql(
    `
SELECT * FROM "danp2-mock-dentally-apis" 
WHERE _updated = true
`,
    R_MockDentallyApisItem,
  );

  Logger.info(`Found ${updated_results.length} updated results`);
}
