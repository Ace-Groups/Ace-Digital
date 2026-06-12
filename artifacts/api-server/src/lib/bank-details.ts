const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_REGEX = /^\d{9,18}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_REGEX = /^[\w.-]{2,}@[\w.-]{2,}$/;
const ACCOUNT_TYPES = new Set(["savings", "current", "salary"]);

export type BankDetailsBody = {
  bankAccountNumber?: unknown;
  confirmBankAccountNumber?: unknown;
  bankIfscCode?: unknown;
  bankName?: unknown;
  bankAccountHolderName?: unknown;
  panNumber?: unknown;
  bankAccountType?: unknown;
  upiId?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIfsc(value: string): string {
  return value.trim().toUpperCase();
}

function normalizePan(value: string): string {
  return value.trim().toUpperCase();
}

export function parseBankDetails(body: BankDetailsBody): {
  ok: true;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankName: string | null;
  bankAccountHolderName: string | null;
  panNumber: string | null;
  bankAccountType: string | null;
  upiId: string | null;
} | { ok: false; error: string } {
  const account = text(body.bankAccountNumber);
  const confirm = text(body.confirmBankAccountNumber);
  const ifsc = normalizeIfsc(text(body.bankIfscCode));
  const bankName = text(body.bankName);
  const holder = text(body.bankAccountHolderName);
  const pan = normalizePan(text(body.panNumber));
  const accountType = text(body.bankAccountType).toLowerCase();
  const upi = text(body.upiId).toLowerCase();

  const values = [account, confirm, ifsc, bankName, holder, pan, accountType, upi];
  const anyFilled = values.some(Boolean);
  if (!anyFilled) {
    return {
      ok: true,
      bankAccountNumber: null,
      bankIfscCode: null,
      bankName: null,
      bankAccountHolderName: null,
      panNumber: null,
      bankAccountType: null,
      upiId: null,
    };
  }

  if (!account) return { ok: false, error: "Bank account number is required" };
  if (!ACCOUNT_REGEX.test(account)) {
    return { ok: false, error: "Bank account number must be 9–18 digits" };
  }
  if (confirm && account !== confirm) {
    return { ok: false, error: "Bank account numbers do not match" };
  }
  if (!ifsc) return { ok: false, error: "IFSC code is required" };
  if (!IFSC_REGEX.test(ifsc)) return { ok: false, error: "Invalid IFSC code format" };
  if (!bankName) return { ok: false, error: "Bank name is required" };
  if (!holder) return { ok: false, error: "Name as per bank records is required" };
  if (!pan) return { ok: false, error: "PAN number is required" };
  if (!PAN_REGEX.test(pan)) return { ok: false, error: "Invalid PAN format" };
  if (!accountType) return { ok: false, error: "Account type is required" };
  if (!ACCOUNT_TYPES.has(accountType)) {
    return { ok: false, error: "Account type must be savings, current, or salary" };
  }
  if (!upi) return { ok: false, error: "UPI ID is required" };
  if (!UPI_REGEX.test(upi)) return { ok: false, error: "Invalid UPI ID format" };

  return {
    ok: true,
    bankAccountNumber: account,
    bankIfscCode: ifsc,
    bankName,
    bankAccountHolderName: holder,
    panNumber: pan,
    bankAccountType: accountType,
    upiId: upi,
  };
}
