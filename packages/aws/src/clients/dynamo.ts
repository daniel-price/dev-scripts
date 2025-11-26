import {
  AttributeValue,
  BatchWriteItemCommand,
  DeleteItemCommand,
  DeleteItemInput,
  DeleteItemOutput,
  DescribeTableCommand,
  DynamoDBClient,
  ExecuteStatementCommand,
  GetItemCommand,
  GetItemInput,
  PutItemCommand,
  PutItemInput,
  PutItemOutput,
  ScanCommand,
  ScanInput,
  TableDescription,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Async, Logger, R, retry } from "@dev/util";
import { confirmChangeItems } from "@dev/util/src/change-items";

import { yieldAll } from "../helpers/aws";

const ddb = new DynamoDBClient();

export enum Filter {
  BEGINS_WITH = "begins_with",
}

type A = {
  FilterExpression: string;
  ExpressionAttributeValues: Record<string, AttributeValue>;
};

type Options = {
  skipPrompt: boolean;
};

export function filterOptions(
  filterType: Filter,
  fieldName: string,
  value: unknown,
): A {
  const filterExpression = `${filterType}(${fieldName}, :${fieldName})`;

  return {
    FilterExpression: filterExpression,
    ExpressionAttributeValues: marshall({
      [`:${fieldName}`]: value,
    }),
  };
}

export async function put(
  tableName: string,
  item: Record<string, unknown>,
): Promise<PutItemOutput> {
  const marshalledItem = marshall(item);

  const params: PutItemInput = { TableName: tableName, Item: marshalledItem };
  const result = await ddb.send(new PutItemCommand(params));

  Logger.info("put result", result);

  return result;
}

export async function get(
  tableName: string,
  attributeName: string,
  attributeValue: AttributeValue,
): Promise<Record<string, AttributeValue> | undefined> {
  const params: GetItemInput = {
    TableName: tableName,
    Key: {
      [attributeName]: attributeValue,
    },
  };
  const result = await ddb.send(new GetItemCommand(params));

  Logger.info("get result", result);

  return result.Item;
}

export function scan<T>(
  tableName: string,
  runtype: R.Runtype<T>,
  options: Partial<ScanInput> = {},
): AsyncGenerator<T> {
  const params: ScanInput = {
    TableName: tableName,
    ...options,
  };

  return yieldAll(async (token?: Record<string, AttributeValue>) => {
    const response = await ddb.send(
      new ScanCommand({ ...params, ExclusiveStartKey: token, Limit: 1000 }),
    );

    if (!response.Items) throw new Error("No items on scan result");

    const unmarshalledItems = response.Items.map((i) => unmarshall(i)) as T[];

    const results = R.assertType(R.Array(runtype), unmarshalledItems);

    const nextToken = response.LastEvaluatedKey;
    return { results, nextToken };
  });
}

export async function partiql<T>(
  statement: string,
  runtype: R.Runtype<T>,
  nextToken?: string,
  queryNumber = 0,
): Promise<T[]> {
  const params = {
    Statement: statement,
    NextToken: nextToken,
  };

  const data = await ddb.send(new ExecuteStatementCommand(params));
  const { Items, NextToken } = data;
  if (!Items) throw new Error("No items on partiql result");

  const unmarshalledItems = Items.map((i) => unmarshall(i)) as T[];
  if (NextToken) {
    const nextData = await partiql(
      statement,
      runtype,
      NextToken,
      queryNumber + 1,
    );
    unmarshalledItems.push(...nextData);
  } else {
    Logger.info(`No NextToken for queryNumber ${queryNumber}`);
  }

  return R.assertType(R.Array(runtype), unmarshalledItems);
}

export async function deleteItems(
  tableName: string,
  keysGenerator: AsyncGenerator<Record<string, unknown>>,
  options: Partial<Options> & { totalCount?: number } = {},
): Promise<void> {
  const batchSize = 25; // DynamoDB batch write limit
  const batchGenerator = Async.batch(keysGenerator, batchSize);
  let totalCount = 0;
  for await (const batch of batchGenerator) {
    if (!options.skipPrompt) {
      await confirmChangeItems("delete items", batch);
    }
    const deleteRequests = batch.map((key) => ({
      DeleteRequest: {
        Key: marshall(key),
      },
    }));

    await retry(() =>
      ddb.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: deleteRequests,
          },
        }),
      ),
    );

    totalCount += batch.length;
    Logger.info(
      `Deleted batch of ${
        batch.length
      } items from ${tableName}, total: ${totalCount}${
        options.totalCount ? `/${options.totalCount}` : ""
      }`,
    );
  }
}

export async function deleteItem(
  tableName: string,
  key: Record<string, string>,
  options: Partial<Options> = {},
): Promise<DeleteItemOutput> {
  if (!options.skipPrompt) {
    await confirmChangeItems(`delete item from ${tableName}`, [key]);
  }

  const marshalledKey = marshall(key);
  const params: DeleteItemInput = {
    TableName: tableName,
    Key: marshalledKey,
  };
  const result = await ddb.send(new DeleteItemCommand(params));

  return result;
}

export async function describeTable(
  tableName: string,
): Promise<TableDescription> {
  const data = await ddb.send(
    new DescribeTableCommand({
      TableName: tableName,
    }),
  );

  const res = data.Table;
  if (!res) throw new Error(`Table ${tableName} not found`);
  return res;
}

export async function update(
  tableName: string,
  key: Record<string, AttributeValue>,
  updateObject: Record<string, AttributeValue>,
): Promise<void> {
  const updateExpression = `SET ${Object.keys(updateObject)
    .map((key) => `#${key} = :${key}`)
    .join(", ")}`;
  const expressionAttributeNames = Object.keys(updateObject).reduce(
    (acc, key) => ({ ...acc, [`#${key}`]: key }),
    {},
  );

  const expressionAttributeValues = Object.keys(updateObject).reduce(
    (acc, key) => ({ ...acc, [`:${key}`]: updateObject[key] }),
    {},
  );

  const updateCmd: UpdateItemCommandInput = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  await ddb.send(new UpdateItemCommand(updateCmd));
}
