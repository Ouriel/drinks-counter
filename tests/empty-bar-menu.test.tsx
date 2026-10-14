// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import Home from "@/app/[locale]/page";
import { api } from "@/lib/api";
import { DrinkPicker } from "@/components/DrinkPicker";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/lib/api", () => ({
  api: {
    searchMenus: vi.fn(async () => ({
      menus: [{ id: "b1", barName: "kenavo", items: [], createdAt: "2026-05-20T00:00:00.000Z" }],
    })),
  },
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// A saved bar with no menu should invite the first group to scan it, not say "0 items".
describe("a bar without a menu", () => {
  it("asks to be scanned in the suggestions and once picked", async () => {
    window.history.replaceState(null, "", "/en?slug=fizzy-julep"); // land on the bar step
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <Home />
        </NextIntlClientProvider>
      );
    });
    const input = container.querySelector<HTMLInputElement>('input:not([type="file"])')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setValue.call(input, "kenavo");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(() =>
      vi.waitFor(() => expect(api.searchMenus).toHaveBeenCalled(), { timeout: 2000 })
    );
    await act(() =>
      vi.waitFor(() => expect(container.textContent).toContain(messages.bar.noMenuYet), {
        timeout: 2000,
      })
    );
    expect(container.textContent).not.toContain("0 items");
    const suggestion = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("kenavo")
    )!;
    await act(async () => suggestion.click());
    expect(container.textContent).toContain(messages.bar.scanFirst);
  });

  it("asks to be scanned from the drink picker", () => {
    const html = renderToString(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DrinkPicker
          menuItems={[]}
          currentDrinks={[]}
          onSelect={() => {}}
          onClose={() => {}}
          onSnapMenu={() => {}}
        />
      </NextIntlClientProvider>
    );
    expect(html).toContain(messages.picker.noMenuYet);
    expect(html).not.toContain(messages.picker.rescanHint);
  });
});
