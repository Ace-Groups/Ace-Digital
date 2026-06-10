import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAgentModelResponse } from "./agent-response";

test("parseAgentModelResponse unwraps JSON envelope", () => {
  const raw = JSON.stringify({
    text: "Hello **world**",
    table: null,
  });
  const result = parseAgentModelResponse(raw);
  assert.equal(result.text, "Hello **world**");
  assert.equal(result.metadata, null);
});

test("parseAgentModelResponse unwraps fenced JSON", () => {
  const raw = '```json\n{"text":"Finance access","table":null}\n```';
  const result = parseAgentModelResponse(raw);
  assert.equal(result.text, "Finance access");
});

test("parseAgentModelResponse keeps plain markdown", () => {
  const raw = "Plain answer without JSON.";
  const result = parseAgentModelResponse(raw);
  assert.equal(result.text, raw);
});
