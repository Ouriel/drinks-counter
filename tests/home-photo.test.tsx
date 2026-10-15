// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "@heroui/react";
import messages from "@/messages/en.json";
import Home from "@/app/[locale]/page";
import { api } from "@/lib/api";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@heroui/react", async (importOriginal) => {
  const real = await importOriginal<typeof import("@heroui/react")>();
  return { ...real, toast: Object.assign(vi.fn(), { danger: vi.fn() }) };
});
vi.mock("@/lib/api", () => ({
  api: { createSession: vi.fn(async () => null), searchMenus: vi.fn(async () => ({ menus: [] })) },
}));
vi.mock("browser-image-compression", () => ({
  default: vi.fn(async () => {
    throw new Error("unsupported image"); // e.g. a HEIC photo
  }),
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// B7 — an image the compressor can't read left "Reading menu…" spinning forever.
describe("home menu photo", () => {
  it("stops the spinner and reports the error when compression fails", async () => {
    window.history.replaceState(null, "", "/en?slug=fizzy-julep"); // land on the bar step
    const container = document.createElement("div");
    await act(async () => {
      createRoot(container).render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <Home />
        </NextIntlClientProvider>
      );
    });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [new File(["x"], "menu.heic")] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(() =>
      vi.waitFor(() =>
        expect(toast.danger).toHaveBeenCalledWith(messages.toast.menuScanFailed, { timeout: 5000 })
      )
    );
    expect(container.textContent).not.toContain("Reading menu…");
  });

  it("shows a failed session creation for 5 s", async () => {
    window.history.replaceState(null, "", "/en?slug=fizzy-julep");
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
      setValue.call(input, "le salon");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Let the 300 ms bar search land inside act: a late update would log during teardown.
    await act(() => vi.waitFor(() => expect(api.searchMenus).toHaveBeenCalled()));
    const skip = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === messages.bar.skipManual
    )!;
    await act(async () => skip.click());
    await act(() =>
      vi.waitFor(() =>
        expect(toast.danger).toHaveBeenCalledWith(messages.session.couldNotCreate, {
          timeout: 5000,
        })
      )
    );
  });
});
