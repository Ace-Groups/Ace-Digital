export function isInternJobTitle(jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false;
  return /\bintern\b/i.test(jobTitle);
}
