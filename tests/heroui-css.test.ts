import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// globals.css imports HeroUI's CSS per component, so a component rendered
// without its CSS line would silently lose its styles.
const root = path.resolve(__dirname, "..");
const globalsCss = readFileSync(path.join(root, "app/globals.css"), "utf8");

const usedComponents = new Set(
  ["app", "components", "lib"].flatMap((directory) =>
    readdirSync(path.join(root, directory), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file))
      .flatMap((file) => {
        const source = readFileSync(path.join(root, directory, file), "utf8");
        return [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@heroui\/react"/g)].flatMap(
          (match) =>
            match[1]
              .split(",")
              .map((name) => name.trim().split(/\s+as\s+/)[0])
              .filter((name) => /^[A-Z]/.test(name))
        );
      })
  )
);

const toKebabCase = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

describe("HeroUI CSS imports", () => {
  it("finds the HeroUI components the app renders", () => {
    expect(usedComponents).toContain("Button");
  });

  it.each([...usedComponents])("app/globals.css imports the CSS of %s", (name) => {
    expect(globalsCss).toContain(`@import "@heroui/styles/components/${toKebabCase(name)}.css"`);
  });
});
