import { createPrompt, createSelection, SelectionItem } from "bun-promptx";

export class PromptCancelledError extends Error {}

type LabelFn<T> = (choice: T, index: number) => string;
type SelectOptions<T> = [T] extends [string | SelectionItem]
  ? [labelFn?: LabelFn<T>]
  : [labelFn: LabelFn<T>];

export async function confirm(message: string): Promise<boolean> {
  const result = await select(message, ["Yes", "No"]);
  return result === "Yes";
}

export async function string(message: string): Promise<string> {
  const response = createPrompt(`${message}`);
  const { value, error } = response;
  if (error === "Cancelled") throw new PromptCancelledError();
  if (error) throw new Error(error);
  if (value === null) throw new Error("No value");
  if (value === "") throw new PromptCancelledError();
  return value;
}

export async function select<T>(
  message: string,
  choices: T[],
  ...[labelFn = defaultLabel as LabelFn<T>]: SelectOptions<T>
): Promise<T> {
  const selectionItems = choices.map((choice, index) => ({
    text: labelFn(choice, index),
  }));
  const selectedIndex = promptSelection(message, selectionItems);

  if (selectedIndex < 0 || selectedIndex >= choices.length) {
    throw new Error(`No result for selected index ${selectedIndex}`);
  }

  return choices[selectedIndex];
}

function promptSelection(
  message: string,
  selectionItems: SelectionItem[],
): number {
  const { selectedIndex, error } = createSelection(selectionItems, {
    headerText: message,
    perPage: 100,
  });
  if (error === "Cancelled") throw new PromptCancelledError();
  if (error) throw new Error(error);
  if (selectedIndex === null) throw new Error("No index");

  return selectedIndex;
}

function defaultLabel(choice: unknown): string {
  if (typeof choice === "string") return choice;
  if (isSelectionItem(choice)) return choice.text;
  return String(choice);
}

function isSelectionItem(choice: unknown): choice is SelectionItem {
  return typeof choice === "object" && choice !== null && "text" in choice;
}
