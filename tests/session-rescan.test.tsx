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
  // Like the real toast.promise, the mock observes the promise (no unhandled rejection).
  const promise = vi.fn((scan: Promise<unknown>) => void scan.catch(() => {}));
  return { ...real, toast: Object.assign(vi.fn(), { danger: vi.fn(), promise }) };
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
  const [scan, options] = vi.mocked(toast.promise).mock.calls[0] ?? [];
  return { scan: scan as Promise<number>, options };
}

// B7 — re-scanning the menu from a session: persist it, count only new drinks, show progress.
describe("session menu re-scan", () => {
  it("sends the slug so the server saves it, and counts only the new drinks", async () => {
    vi.mocked(api.parseMenu).mockResolvedValue({
      items: [
        { name: "beer", category: "beer" },
        { name: "spritz", category: "cocktail" },
      ],
    });
    const { scan, options } = await snapMenu();
    expect(vi.mocked(api.parseMenu).mock.calls[0][0].get("slug")).toBe("fizzy-julep");
    expect(options).toMatchObject({ loading: expect.stringContaining("Reading menu") });
    await expect(scan).resolves.toBe(1); // "1 drink imported", not 2
  });

  it("surfaces a failed scan instead of doing nothing", async () => {
    vi.mocked(api.parseMenu).mockResolvedValue(null);
    const { scan, options } = await snapMenu();
    await expect(scan).rejects.toThrow();
    expect(options).toMatchObject({ error: messages.toast.menuScanFailed });
  });
});
