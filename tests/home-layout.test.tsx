// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import Home from "@/app/[locale]/page";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderHome() {
  window.history.replaceState(null, "", "/en");
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Home />
      </NextIntlClientProvider>
    );
  });
  return container;
}

beforeEach(() => localStorage.clear());

describe("home start screen (design review)", () => {
  it("B2: keeps the language and theme controls in the page flow, off the logo", async () => {
    const container = await renderHome();
    const controls = container.querySelector("select")!.closest("div")!;
    expect(controls.className).not.toContain("absolute");
  });

  it("B6: tells apart two recent sessions at the same bar on the same day", async () => {
    const at = (hour: number) => new Date(2026, 9, 14, hour, 5).toISOString();
    localStorage.setItem(
      "tipsytap_recent",
      JSON.stringify([
        { slug: "late", barName: "le salon", date: at(23) },
        { slug: "early", barName: "le salon", date: at(20) },
      ])
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 15, 1));
    const container = await renderHome();
    vi.useRealTimers();
    const rows = [...container.querySelectorAll("button")]
      .filter((button) => button.textContent?.includes("le salon"))
      .map((button) => button.textContent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).not.toBe(rows[1]);
  });
});
