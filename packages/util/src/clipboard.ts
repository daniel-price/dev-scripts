import clipboard from "copy-paste";

export function get(): string {
  return clipboard.paste();
}

export function add(text: string): void {
  clipboard.copy(text);
}
