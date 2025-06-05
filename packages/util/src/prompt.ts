import { createPrompt, createSelection, SelectionItem } from "bun-promptx";

type SelectableItem = SelectionItem | string;

export class PromptCancelledError extends Error {}

export async function confirm(message: string): Promise<boolean> {
  const result = await select(message, [{ text: "Yes" }, { text: "No" }]);
  return result === "Yes";
}

export async function string(message: string): Promise<string> {
  const response = createPrompt(`${message}`);
  const { value, error } = response;
  if (error === "Cancelled") throw new PromptCancelledError();
  if (error) throw new Error(error);
  if (value === null) throw new Error("No value");
  return value;
}

export async function select(
  message: string,
  choices: SelectableItem[],
  footerText?: string,
): Promise<string> {
  const selectionItems = choices.map((choice) =>
    typeof choice === "string" ? { text: choice } : choice,
  );

  const { selectedIndex, error } = createSelection(selectionItems, {
    headerText: message,
    perPage: 100,
    footerText,
  });
  if (error === "Cancelled") throw new PromptCancelledError();
  if (error) throw new Error(error);
  if (selectedIndex === null) throw new Error("No index");
  const result = selectionItems[selectedIndex];

  if (result === null)
    throw new Error(`No result for selected index ${selectedIndex}`);

  return result.text;
}
