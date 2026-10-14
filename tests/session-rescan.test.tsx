// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "@heroui/react";
import messages from "@/messages/en.json";
import { api } from "@/lib/api";
import { SessionClient } from "@/app/[locale]/s/[slug]/SessionClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/s/fizzy-julep",
}));
vi.mock("@heroui/react", async (importOriginal) => {
  const real = await importOriginal<typeof import("@heroui/react")>();
  return {
    ...real,
    toast: Object.assign(
      vi.fn(() => "scan-toast"),
      { danger: vi.fn(), update: vi.fn() }
    ),
  };
});
vi.mock("@/lib/api", () => ({
  api: { parseMenu: vi.fn(), getDrinks: vi.fn(), getTableRanking: vi.fn() },
}));
vi.mock("browser-image-compression", () => ({ default: vi.fn(async (file: File) => file) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function snapMenu() {
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SessionClient
          slug="fizzy-julep"
          notFound={false}
          initialDrinks={[]}
          initialMenuItems={[{ name: "beer", category: "beer" }]}
          initialBarName="le salon"
          initialTableCode={null}
          initialNickname={null}
        />
      </NextIntlClientProvider>
    );
  });
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [new File(["x"], "menu.jpg")] });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(() => vi.waitFor(() => expect(toast.update).toHaveBeenCalled()));
  return {
    loading: vi.mocked(toast).mock.calls[0],
    settled: vi.mocked(toast.update).mock.calls[0],
  };
}

// B7 — re-scanning the menu from a session: persist it, count only new drinks, show progress.
// The result toast stays 5 s (toast.promise would hard-code HeroUI's 4 s).
describe("session menu re-scan", () => {
  it("sends the slug so the server saves it, and counts only the new drinks", async () => {
    vi.mocked(api.parseMenu).mockResolvedValue({
      items: [
        { name: "beer", category: "beer" },
        { name: "spritz", category: "cocktail" },
      ],
    });
    const { loading, settled } = await snapMenu();
    expect(vi.mocked(api.parseMenu).mock.calls[0][0].get("slug")).toBe("fizzy-julep");
    expect(loading).toEqual([
      expect.stringContaining("Reading menu"),
      { isLoading: true, timeout: 0 },
    ]);
    expect(settled).toEqual([
      "scan-toast",
      "📸 1 drinks imported", // 1, not 2: beer was already on the menu
      { isLoading: false, timeout: 5000, variant: "success" },
    ]);
  });

  it("surfaces a failed scan instead of doing nothing", async () => {
    vi.mocked(api.parseMenu).mockResolvedValue(null);
    const { settled } = await snapMenu();
    expect(settled).toEqual([
      "scan-toast",
      messages.toast.menuScanFailed,
      { isLoading: false, timeout: 5000, variant: "danger" },
    ]);
  });
});
