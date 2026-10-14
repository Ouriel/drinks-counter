// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { TableView } from "@/components/TableView";

vi.mock("@/lib/api", () => ({ api: { getTableRanking: vi.fn().mockResolvedValue(null) } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const page = (): ReactNode => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <TableView slug="fizzy-julep" tableCode="ABC234" nickname="happy-fox" drinkTotal={3} />
  </NextIntlClientProvider>
);

afterEach(() => localStorage.clear());

// Same class as B9: the re-roll counter lives in localStorage, which the server can't read.
describe("TableView hydrates without mismatch", () => {
  it("shows the stored re-roll count only after hydration", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(page()); // server: no localStorage → "(3)"
    localStorage.setItem("tipsytap_rerolls_fizzy-julep", "1"); // browser: one re-roll used
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, page(), { onRecoverableError: (error) => errors.push(error) });
    });
    expect(errors).toEqual([]);
    expect(container.textContent).toContain("(2)");
  });
});
