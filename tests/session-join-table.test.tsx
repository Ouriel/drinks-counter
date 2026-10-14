// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { api } from "@/lib/api";
import { SessionClient } from "@/app/[locale]/s/[slug]/SessionClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/s/fizzy-julep",
}));
vi.mock("@/lib/api", () => ({
  api: {
    getDrinks: vi.fn(),
    getTableRanking: vi.fn(async () => ({ code: "ABC234", members: [] })),
    joinTable: vi.fn(async () => ({ code: "ABC234", nickname: "fox" })),
    createTable: vi.fn(async () => ({ code: "ABC234", nickname: "fox" })),
    getSession: vi.fn(async () => ({
      session: {
        id: "s1",
        slug: "fizzy-julep",
        barName: "le salon",
        tableCode: "ABC234",
        nickname: "fox",
      },
      menuItems: [{ name: "spritz", category: "cocktail" }],
    })),
  },
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const button = (container: HTMLElement, label: string) =>
  [...container.querySelectorAll("button")].find((element) => element.textContent === label)!;

// Joining a table by code on the session page switches the session to the table's bar:
// its name and menu used to appear only after a reload.
describe("joining a table from the session page", () => {
  it("shows the table's bar and menu without a reload", async () => {
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <SessionClient
            slug="fizzy-julep"
            notFound={false}
            initialDrinks={[]}
            initialMenuItems={[]}
            initialBarName=""
            initialTableCode={null}
            initialNickname={null}
          />
        </NextIntlClientProvider>
      );
    });

    await act(async () => button(container, messages.table.joinTable).click());
    const input = container.querySelector<HTMLInputElement>(
      `input[aria-label="${messages.table.code}"]`
    )!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setValue.call(input, "abc234");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button(container, messages.table.join).click());

    await act(() =>
      vi.waitFor(() =>
        expect(container.querySelector("h1, [role=heading]")?.textContent).toContain("Le Salon")
      )
    );
    await act(async () => button(container, messages.session.addDrink).click());
    await act(() => vi.waitFor(() => expect(container.textContent).toContain("spritz")));
    expect(api.getSession).toHaveBeenCalledWith("fizzy-julep");
  });

  it("keeps a menu that lives only on this page when the server has no bar", async () => {
    vi.mocked(api.getSession).mockResolvedValueOnce({
      session: {
        id: "s1",
        slug: "fizzy-julep",
        barName: null,
        tableCode: "ABC234",
        nickname: "fox",
      },
      menuItems: [],
    });
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <SessionClient
            slug="fizzy-julep"
            notFound={false}
            initialDrinks={[]}
            initialMenuItems={[{ name: "negroni", category: "cocktail" }]}
            initialBarName=""
            initialTableCode={null}
            initialNickname={null}
          />
        </NextIntlClientProvider>
      );
    });
    await act(async () => button(container, messages.table.createTable).click());
    await act(() => vi.waitFor(() => expect(api.getSession).toHaveBeenCalled()));
    await act(async () => button(container, messages.session.addDrink).click());
    await act(() => vi.waitFor(() => expect(container.textContent).toContain("negroni")));
  });
});
