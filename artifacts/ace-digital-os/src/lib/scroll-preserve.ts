/** Preserve scroll position when content is prepended above the viewport. */
export function captureScrollAnchor(el: HTMLElement): { height: number; top: number } {
  return { height: el.scrollHeight, top: el.scrollTop };
}

export function restoreScrollAnchor(
  el: HTMLElement,
  anchor: { height: number; top: number },
): void {
  const delta = el.scrollHeight - anchor.height;
  el.scrollTop = anchor.top + delta;
}
