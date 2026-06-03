/** Parse `?channel=` from the current URL (wouter ignores search params). */
export function parseChannelIdFromSearch(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("channel");
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setChannelIdInSearch(channelId: number | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (channelId == null) {
    url.searchParams.delete("channel");
  } else {
    url.searchParams.set("channel", String(channelId));
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
