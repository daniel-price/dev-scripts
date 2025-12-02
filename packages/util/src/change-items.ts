import * as Json from "./json";
import * as Logger from "./logger";
import * as Prompt from "./prompt";

export async function changeItems<T extends string | object>(
  description: string,
  items: T[],
  changeFn: (value: T) => Promise<unknown>,
  itemNameFn = (value: T): unknown => Json.stringify(value, false),
): Promise<boolean> {
  if (items.length === 0) {
    Logger.info(`no items to ${description}`);
    return true;
  }
  await confirmChangeItems(description, items.map(itemNameFn));

  let allSuccessful = true;
  for (const item of items) {
    const value = itemNameFn(item);
    Logger.info(`${description}: ${value}`);
    try {
      await changeFn(item);
    } catch (e) {
      Logger.error(`${description} failed for ${value}:`, e);
      allSuccessful = false;
    }
  }

  return allSuccessful;
}

export async function confirmChangeItems(
  description: string,
  items: Array<unknown>,
): Promise<void> {
  Logger.info(`about to ${description} for:`, items, `(${items.length} items)`);
  const result = await Prompt.confirm("Is this okay?");
  if (!result) {
    Logger.info(`not going to ${description}`);
    process.exit(0);
  }
}
