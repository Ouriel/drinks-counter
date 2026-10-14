// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "@heroui/react";
import messages from "@/messages/en.json";
import { api } from "@/lib/api";
import { TableView } from "@/components/TableView";

vi.mock("@heroui/react", async (importOriginal) => {
  const real = await importOriginal<typeof import("@heroui/react")>();
  return { ...real, toast: Object.assign(vi.fn(), { danger: vi.fn() }) };
});
vi.mock("@/lib/api", () => ({ api: { getTableRanking: vi.fn() } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ranking = (fox: number, owl: number) => ({
  code: "ABC234",
  members: [
    { nickname: "fox", total: fox },
    { nickname: "owl", total: owl },
  ],
});

describe("TableView leaderboard fun", () => {
  it("marks who moved up and celebrates a table milestone", async () => {
    vi.mocked(api.getTableRanking)
      .mockResolvedValueOnce(ranking(5, 4)) // 9 on open: baseline, no celebration
      .mockResolvedValueOnce(ranking(7, 4)); // 11 after a refresh
    const onCelebrate = vi.fn();
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <TableView
            slug="fizzy-julep"
            tableCode="ABC234"
            nickname="owl"
            drinkTotal={4}
            onCelebrate={onCelebrate}
          />
        </NextIntlClientProvider>
      );
    });
    expect(container.textContent).not.toContain("+2");
    expect(onCelebrate).not.toHaveBeenCalled();

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(`[aria-label="${messages.table.refresh}"]`)!
        .click()
    );
    expect(container.textContent).toContain("+2");
    expect(vi.mocked(toast).mock.calls[0]?.[0]).toContain("10");
    expect(onCelebrate).toHaveBeenCalledTimes(1);
  });
});
