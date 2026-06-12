const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_REGEX = /^\d{9,18}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const UPI_REGEX = /^[\w.-]{2,}@[\w.-]{2,}$/i;

export type BankDetailsFields = {
  bankAccountNumber: string;
  confirmBankAccountNumber: string;
  bankIfscCode: string;
  bankName: string;
  bankAccountHolderName: string;
  panNumber: string;
  bankAccountType: string;
  upiId: string;
};

export function normalizeIfsc(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizePan(value: string): string {
  return value.trim().toUpperCase();
}

export function validateBankDetails(
  input: Partial<BankDetailsFields>,
  options?: { required?: boolean },
): Partial<Record<keyof BankDetailsFields, string>> {
  const errors: Partial<Record<keyof BankDetailsFields, string>> = {};
  const required = options?.required ?? false;

  const account = input.bankAccountNumber?.trim() ?? "";
  const confirm = input.confirmBankAccountNumber?.trim() ?? "";
  const ifsc = normalizeIfsc(input.bankIfscCode ?? "");
  const bankName = input.bankName?.trim() ?? "";
  const holder = input.bankAccountHolderName?.trim() ?? "";
  const pan = normalizePan(input.panNumber ?? "");
  const accountType = input.bankAccountType?.trim().toLowerCase() ?? "";
  const upi = input.upiId?.trim().toLowerCase() ?? "";

  const anyFilled = [account, confirm, ifsc, bankName, holder, pan, accountType, upi].some(Boolean);
  if (!required && !anyFilled) return errors;

  if (!account) errors.bankAccountNumber = "Account number required";
  else if (!ACCOUNT_REGEX.test(account)) errors.bankAccountNumber = "Enter 9–18 digits";

  if (!confirm) errors.confirmBankAccountNumber = "Confirm account number";
  else if (account && account !== confirm) {
    errors.confirmBankAccountNumber = "Account numbers do not match";
  }

  if (!ifsc) errors.bankIfscCode = "IFSC code required";
  else if (!IFSC_REGEX.test(ifsc)) errors.bankIfscCode = "Invalid IFSC format";

  if (!bankName) errors.bankName = "Bank name required";
  if (!holder) errors.bankAccountHolderName = "Name as per bank records required";

  if (!pan) errors.panNumber = "PAN number required";
  else if (!PAN_REGEX.test(pan)) errors.panNumber = "Invalid PAN format";

  if (!accountType) errors.bankAccountType = "Account type required";
  else if (!["savings", "current", "salary"].includes(accountType)) {
    errors.bankAccountType = "Select a valid account type";
  }

  if (!upi) errors.upiId = "UPI ID required";
  else if (!UPI_REGEX.test(upi)) errors.upiId = "Invalid UPI ID";

  return errors;
}

export function bankDetailsApiPayload(input: Partial<BankDetailsFields>) {
  return {
    bankAccountNumber: input.bankAccountNumber?.trim() || undefined,
    confirmBankAccountNumber: input.confirmBankAccountNumber?.trim() || undefined,
    bankIfscCode: normalizeIfsc(input.bankIfscCode ?? "") || undefined,
    bankName: input.bankName?.trim() || undefined,
    bankAccountHolderName: input.bankAccountHolderName?.trim() || undefined,
    panNumber: normalizePan(input.panNumber ?? "") || undefined,
    bankAccountType: input.bankAccountType?.trim().toLowerCase() || undefined,
    upiId: input.upiId?.trim().toLowerCase() || undefined,
  };
}
