export { formatCurrency } from "./utils";

/** Format number for Indian currency input display (₹2,00,000) */
export function formatCurrencyInput(value: string | number): string {
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function parseCurrencyInput(formatted: string): number | null {
  const digits = formatted.replace(/[^\d]/g, "");
  if (!digits) return null;
  const num = Number(digits);
  return Number.isNaN(num) ? null : num;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ""}`.trim();
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** Indian numbering: lakh, crore */
export function amountInWordsINR(amount: number): string {
  if (!amount || amount < 0) return "";
  if (amount === 0) return "Zero Rupees Only";

  const n = Math.floor(amount);
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${words} Rupees Only`;
}
