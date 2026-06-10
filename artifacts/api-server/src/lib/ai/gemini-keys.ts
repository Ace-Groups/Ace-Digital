import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../logger";
import { isGeminiQuotaExhausted, isGeminiRetryable } from "./gemini-errors";

/** Stable model IDs — avoid aliases like gemini-flash-latest that vary by region/tier. */
const MODEL_ALIASES: Record<string, string> = {
  "gemini-flash-latest": "gemini-2.0-flash",
  "gemini-pro-latest": "gemini-2.0-flash",
  "gemini-2.0-flash-latest": "gemini-2.0-flash",
};

export function resolveGeminiModelName(): string {
  const raw = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  return MODEL_ALIASES[raw] ?? raw;
}

/** Primary + optional fallback keys (comma-separated GEMINI_API_KEYS or GEMINI_API_KEY_FALLBACK). */
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const list = process.env.GEMINI_API_KEYS?.trim();
  if (list) {
    for (const part of list.split(",")) {
      const k = part.trim();
      if (k) keys.push(k);
    }
  }
  const primary = process.env.GEMINI_API_KEY?.trim();
  if (primary) keys.push(primary);
  const fallback = process.env.GEMINI_API_KEY_FALLBACK?.trim();
  if (fallback) keys.push(fallback);
  return [...new Set(keys)];
}

export function isAnyGeminiKeyConfigured(): boolean {
  return getGeminiApiKeys().length > 0;
}

export function getGeminiClientForKey(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a Gemini call with optional fallback API keys and light retry for transient errors.
 */
export async function withGeminiResilience<T>(
  operation: (client: GoogleGenerativeAI) => Promise<T>,
): Promise<T> {
  const keys = getGeminiApiKeys();
  if (!keys.length) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  let lastError: unknown;

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const client = getGeminiClientForKey(keys[keyIndex]!);
    const maxAttempts = keyIndex === 0 ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation(client);
      } catch (err) {
        lastError = err;
        const hasNextKey = keyIndex < keys.length - 1;

        if (isGeminiQuotaExhausted(err) && hasNextKey) {
          logger.warn(
            { keyIndex },
            "Gemini primary key quota exhausted; trying fallback API key",
          );
          break;
        }

        if (isGeminiRetryable(err) && attempt < maxAttempts - 1) {
          await sleep(800 * (attempt + 1));
          continue;
        }

        if (hasNextKey && isGeminiQuotaExhausted(err)) {
          break;
        }

        throw err;
      }
    }
  }

  throw lastError ?? new Error("Gemini request failed");
}
