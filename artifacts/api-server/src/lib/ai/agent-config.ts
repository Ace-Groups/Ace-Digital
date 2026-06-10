import { isGeminiConfigured } from "./gemini-client";
import { isOpenRouterConfigured } from "./openrouter-client";

export function isAgentConfigured(): boolean {
  return isGeminiConfigured() || isOpenRouterConfigured();
}
