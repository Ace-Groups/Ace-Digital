export function messageListPreview(body: string, messageKind: string): string {
  const text = body.trim();
  if (text) {
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }
  if (messageKind === "poll") return "Poll";
  if (messageKind === "event") return "Event";
  return "Attachment";
}
