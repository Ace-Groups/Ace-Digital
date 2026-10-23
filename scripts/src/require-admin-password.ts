/**
 * Password for one-off admin upsert/reset scripts.
 * Set ADMIN_PASSWORD in the shell. Never commit it and never log it.
 */
export function requireAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  if (password.length < 12) {
    console.error(
      "Refusing to run: set ADMIN_PASSWORD to a new password of at least 12 characters. Do not commit it.",
    );
    process.exit(1);
  }
  return password;
}
