import { defineConfig, devices } from "@playwright/test";

// Smoke test of a preview deployment (Neon `preview` branch, never prod), run by
// .github/workflows/preview-smoke.yml. Locally: VERCEL_PREVIEW_URL=<preview url>
// VERCEL_AUTOMATION_BYPASS_SECRET=<secret> npm run test:e2e
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "e2e",
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    ...devices["Pixel 7"],
    baseURL: process.env.VERCEL_PREVIEW_URL ?? "http://localhost:3000",
    // Previews sit behind Vercel SSO: the automation bypass lets the test in.
    extraHTTPHeaders: bypass
      ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
      : {},
  },
});
