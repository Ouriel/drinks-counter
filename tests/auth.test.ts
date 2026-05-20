import { describe, it, expect } from "vitest";
import { verifySecret } from "../lib/auth";

describe("verifySecret", () => {
  it("returns true for matching secret", () => {
    expect(verifySecret("Bearer my-secret-123", "my-secret-123")).toBe(true);
  });

  it("returns false for wrong secret", () => {
    expect(verifySecret("Bearer wrong", "my-secret-123")).toBe(false);
  });

  it("returns false for missing header", () => {
    expect(verifySecret(null, "my-secret-123")).toBe(false);
  });

  it("returns false for undefined secret", () => {
    expect(verifySecret("Bearer something", undefined)).toBe(false);
  });

  it("returns false for empty secret", () => {
    expect(verifySecret("Bearer ", "")).toBe(false);
  });

  it("returns false for header without Bearer prefix", () => {
    expect(verifySecret("my-secret-123", "my-secret-123")).toBe(false);
  });

  it("returns false for different length strings", () => {
    expect(verifySecret("Bearer short", "a-much-longer-secret-value")).toBe(false);
  });
});
