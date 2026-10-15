import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

// White text on the amber primary colour is about 2:1 (WCAG AA needs 4.5:1); the black-text
// override used to apply in dark mode only, so light mode buttons were hard to read.
describe("primary button contrast", () => {
  it("uses black text on amber in both themes", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const [, selector, body] = css.match(/([^{}]*button--primary[^{}]*)\{([^}]*)\}/) ?? [];
    expect(selector).toBeDefined();
    expect(selector).not.toContain(".dark");
    expect(body).toContain("color: #000");
  });
});
