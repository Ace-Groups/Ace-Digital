export const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Miss.", "Dr.", "Mx."] as const;
export type Salutation = (typeof SALUTATIONS)[number];

export type ClientCustomField = { key: string; value: string };

export function formatContactName(
  salutation: string | null | undefined,
  contactName: string,
): string {
  const name = contactName.trim();
  if (!name) return "";
  const sal = salutation?.trim();
  return sal ? `${sal} ${name}` : name;
}

export function formatClientLabel(
  salutation: string | null | undefined,
  contactName: string,
  companyName: string,
): string {
  const contact = formatContactName(salutation, contactName);
  return companyName ? `${companyName} — ${contact}` : contact;
}
