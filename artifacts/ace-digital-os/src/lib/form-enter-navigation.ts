/** Fields that participate in Enter → next / Enter → submit. */
export function getFormEnterFields(form: HTMLFormElement): HTMLElement[] {
  const selector = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([disabled]):not([aria-hidden="true"])',
    "select:not([disabled])",
  ].join(", ");

  return Array.from(form.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    if (el.closest("[data-skip-enter-nav]")) return false;
    return el.getClientRects().length > 0;
  });
}

export function handleFormEnterKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Enter") return;
  if (event.isComposing) return;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName === "TEXTAREA") return;

  if (target instanceof HTMLInputElement) {
    if (
      ["submit", "button", "reset", "checkbox", "radio", "file", "hidden"].includes(
        target.type,
      )
    ) {
      return;
    }
  } else if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  const form = target.closest("form");
  if (!form || form.dataset.skipEnterNav === "true") return;

  const fields = getFormEnterFields(form);
  const index = fields.indexOf(target);
  if (index === -1) return;

  if (index < fields.length - 1) {
    event.preventDefault();
    const next = fields[index + 1];
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== "password") {
      next.select();
    }
    return;
  }

  event.preventDefault();
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }
}
