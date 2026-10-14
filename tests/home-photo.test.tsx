// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "@heroui/react";
import messages from "@/messages/en.json";
import Home from "@/app/[locale]/page";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@heroui/react", async (importOriginal) => {
  const real = await importOriginal<typeof import("@heroui/react")>();
  return { ...real, toast: Object.assign(vi.fn(), { danger: vi.fn() }) };
});
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
      vi.waitFor(() => expect(toast.danger).toHaveBeenCalledWith(messages.toast.menuScanFailed))
    );
    expect(container.textContent).not.toContain("Reading menu…");
  });
});
