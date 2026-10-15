// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { Drink } from "@/lib/types";
import { SessionClient } from "@/app/[locale]/s/[slug]/SessionClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/s/fizzy-julep",
}));
vi.mock("@/lib/api", () => ({
  api: { getDrinks: vi.fn(), getTableRanking: vi.fn(async () => null) },
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = Date.parse("2026-10-14T22:00:00Z");
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const nine: Drink[] = [
  { id: "d1", name: "ipa", count: 9, category: "beer", createdAt: minutesAgo(90) },
];

async function open(initialDrinks: Drink[], notFound = false) {
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SessionClient
          slug="fizzy-julep"
          notFound={notFound}
          initialDrinks={initialDrinks}
          initialMenuItems={[]}
          initialBarName="le salon"
          initialTableCode={null}
          initialNickname={null}
        />
      </NextIntlClientProvider>
    );
  });
  return container;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("opening a session", () => {
  it("adds it to this phone's recent sessions, dated from its first drink", async () => {
    await open([
      { id: "d1", name: "beer", count: 1, category: "beer", createdAt: minutesAgo(120) },
    ]);
    const [stored] = JSON.parse(localStorage.getItem("tipsytap_recent")!);
    expect(stored).toEqual({ slug: "fizzy-julep", barName: "le salon", date: minutesAgo(120) });
  });

  it("does not remember an expired session", async () => {
    await open([], true);
    expect(localStorage.getItem("tipsytap_recent")).toBeNull();
  });

  it("refreshes the pace while the screen stays idle", async () => {
    const tapped = minutesAgo(4);
    const container = await open([
      { id: "d1", name: "beer", count: 1, category: "beer", tappedAt: [tapped], createdAt: tapped },
    ]);
    expect(container.textContent).not.toContain("☄️"); // under 5 min: no pace yet
    await act(async () => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(container.textContent).toContain("☄️"); // 1 drink in 6 min → "Send Help"
  });

  it("sets both theme colours as CSS variables, so light mode never flashes dark", async () => {
    const container = await open(nine);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.backgroundColor).toBe("");
    expect(root.style.getPropertyValue("--session-bg-light")).toContain("hsl(");
    expect(root.style.getPropertyValue("--session-bg-dark")).toContain("hsl(");
  });

  it("tilts only the drink list, not the page, the picker or the Add button", async () => {
    const container = await open(nine);
    const root = container.firstElementChild as HTMLElement;
    const list = container
      .querySelector(`[aria-label="${messages.drinkCard.add}"]`)!
      .closest("[data-drink-list]") as HTMLElement;
    expect(root.style.transform).toBe("");
    expect(list.style.transform).toContain("rotate");
  });
});
