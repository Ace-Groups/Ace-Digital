import assert from "node:assert/strict";
import { test } from "node:test";
import { signCertificateCode, verifyCertificateSignature } from "./verification";

test("certificate signature rejects a missing or blank sig", () => {
  assert.equal(verifyCertificateSignature("ACE-INT-1", undefined), false);
  assert.equal(verifyCertificateSignature("ACE-INT-1", ""), false);
  assert.equal(verifyCertificateSignature("ACE-INT-1", "   "), false);
});

test("certificate signature accepts only the matching HMAC", () => {
  const code = "ACE-INT-42";
  const sig = signCertificateCode(code);
  assert.equal(verifyCertificateSignature(code, sig), true);
  assert.equal(verifyCertificateSignature(code, `${sig}x`), false);
  assert.equal(verifyCertificateSignature("ACE-INT-43", sig), false);
});
