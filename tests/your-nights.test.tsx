// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { api } from "@/lib/api";
import { SessionClient } from "@/app/[locale]/s/[slug]/SessionClient";
import Home from "@/app/[locale]/page";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/lib/api", () => ({
  api: {
    getDrinks: vi.fn(async () => null),
    getTableRanking: vi.fn(async () => null),
    addDrink: vi.fn(),
  },
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const nights = () => JSON.parse(localStorage.getItem("tipsytap_nights") || "[]");

beforeEach(() => localStorage.clear());

describe("your nights", () => {
  it("are saved on this phone when a session opens and on each tap", async () => {
    vi.mocked(api.addDrink).mockResolvedValue({ count: 2 });
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <SessionClient
            slug="fizzy-julep"
            notFound={false}
            initialDrinks={[
              {
                id: "d1",
                name: "ipa",
                count: 1,
                category: "beer",
                createdAt: "2026-10-14T20:00:00.000Z",
              },
            ]}
            initialMenuItems={[]}
            initialBarName="le salon"
            initialTableCode={null}
            initialNickname={null}
          />
        </NextIntlClientProvider>
      );
    });
    expect(nights()).toEqual([
      {
        slug: "fizzy-julep",
        barName: "le salon",
        date: "2026-10-14T20:00:00.000Z",
        total: 1,
        topDrink: "ipa",
      },
    ]);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(`[aria-label="${messages.drinkCard.add}"]`)!
        .click()
    );
    expect(nights()[0].total).toBe(2);
  });

  it("are listed on the home screen, beyond the 48 h recent list", async () => {
    localStorage.setItem(
      "tipsytap_nights",
      JSON.stringify([
        {
          slug: "old-night",
          barName: "the frog",
          date: "2026-09-01T20:00:00.000Z",
          total: 7,
          topDrink: "stout",
        },
      ])
    );
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <Home />
        </NextIntlClientProvider>
      );
    });
    expect(container.textContent).toContain(messages.home.yourNights);
    expect(container.textContent).toContain("The Frog");
    expect(container.textContent).toContain("7 drinks");
    expect(container.textContent).toContain("stout");
  });
});
