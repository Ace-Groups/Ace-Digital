/** Wrap selection in markdown markers for the composer toolbar. */
export function wrapMarkdownSelection(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string = before,
): { value: string; cursor: number } {
  const selected = text.slice(selectionStart, selectionEnd);
  const inner = selected || "text";
  const value =
    text.slice(0, selectionStart) + before + inner + after + text.slice(selectionEnd);
  const cursor = selectionStart + before.length + inner.length + after.length;
  return { value, cursor };
}

export function wrapMarkdownLink(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; cursor: number } {
  const selected = text.slice(selectionStart, selectionEnd) || "link text";
  const value =
    text.slice(0, selectionStart) + `[${selected}](url)` + text.slice(selectionEnd);
  return { value, cursor: selectionStart + selected.length + 3 };
}

export function insertMarkdownPrefix(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): { value: string; cursor: number } {
  const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
  const block = text.slice(lineStart, selectionEnd);
  const lines = block.split("\n").map((line) => `${prefix}${line}`);
  const value = text.slice(0, lineStart) + lines.join("\n") + text.slice(selectionEnd);
  return { value, cursor: lineStart + lines.join("\n").length };
}
