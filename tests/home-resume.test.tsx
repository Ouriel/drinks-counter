// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act, useInsertionEffect } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import Home from "@/app/[locale]/page";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Next's app router writes the new URL in a useInsertionEffect, i.e. only AFTER the new page
// has rendered. SessionClient's router.replace("/?slug=…") goes through it.
function NextHistoryUpdater({ url }: { url: string }) {
  useInsertionEffect(() => window.history.replaceState(null, "", url));
  return null;
}

async function renderHome(startUrl: string, softNavigationUrl?: string) {
  window.history.replaceState(null, "", startUrl);
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Home />
        {softNavigationUrl && <NextHistoryUpdater url={softNavigationUrl} />}
      </NextIntlClientProvider>
    );
  });
  return container.textContent;
}

describe("home resume flow (?slug=)", () => {
  it("shows the bar step and the notice after a soft navigation", async () => {
    const text = await renderHome("/en/s/fizzy-julep", "/en?slug=fizzy-julep");
    expect(text).toContain("Where are you?");
    expect(text).toContain("No active session “fizzy-julep”");
  });

  it.each(["admin", "Not a slug!"])("shows the start screen for ?slug=%s", async (slug) => {
    const text = await renderHome(`/en?${new URLSearchParams({ slug })}`);
    expect(text).toContain("Start counting");
    expect(text).not.toContain("Where are you?");
  });
});
