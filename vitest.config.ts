import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // .agents holds local, untracked plans and review artifacts.
    exclude: [...configDefaults.exclude, ".agents/**", "e2e/**"],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      // Server + hook logic only: pages/components untested until an e2e smoke exists.
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      reporter: ["text-summary"],
      // Floor, not goal: raise it when a PR adds tests (never lower it to make CI pass).
      thresholds: { statements: 82, branches: 77, functions: 87, lines: 84 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
