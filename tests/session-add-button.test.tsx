// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
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

async function renderSession(initialDrinks: Drink[]) {
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SessionClient
          slug="fizzy-julep"
          notFound={false}
          initialDrinks={initialDrinks}
          initialMenuItems={[]}
          initialBarName="le salon"
          initialTableCode={null}
          initialNickname={null}
        />
      </NextIntlClientProvider>
    );
  });
  const addButtons = [...container.querySelectorAll("button")].filter(
    (button) => button.textContent === messages.session.addDrink
  );
  return { container, addButtons };
}

// P29 — toasts land at the bottom: the first "Add a drink" must not sit there.
describe("session Add a drink button", () => {
  it("sits in the empty state, with no fixed bottom bar, when there are no drinks", async () => {
    const { container, addButtons } = await renderSession([]);
    const emptyState = [...container.querySelectorAll("p")].find(
      (paragraph) => paragraph.textContent === messages.session.noDrinks
    )!.parentElement!;
    expect(addButtons).toHaveLength(1);
    expect(emptyState.contains(addButtons[0])).toBe(true);
    expect(container.querySelector(".fixed")).toBeNull();
  });

  it("moves to the fixed bottom bar from the first drink", async () => {
    const { addButtons } = await renderSession([
      { id: "d1", name: "beer", count: 1, category: "beer" },
    ]);
    expect(addButtons).toHaveLength(1);
    expect(addButtons[0].closest(".fixed")).not.toBeNull();
  });
});
