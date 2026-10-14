// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SessionClient } from "@/app/[locale]/s/[slug]/SessionClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/s/fizzy-julep",
}));
vi.mock("@/lib/api", () => ({
  api: { getDrinks: vi.fn(), getTableRanking: vi.fn(async () => null) },
}));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Rejects like a dismissed share sheet: the button must swallow it, or Vitest reports an
// unhandled rejection. A plain function, because vi.fn would observe the promise itself.
let shared: ShareData[] = [];
function share(data: ShareData) {
  shared.push(data);
  return Promise.reject(new DOMException("Share canceled", "AbortError"));
}
beforeEach(() => {
  shared = [];
  Object.assign(navigator, { share });
  window.history.replaceState(null, "", "/en/s/fizzy-julep");
});

async function pressShare(tableCode: string | null) {
  const container = document.createElement("div");
  document.body.append(container);
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SessionClient
          slug="fizzy-julep"
          notFound={false}
          initialDrinks={[]}
          initialMenuItems={[]}
          initialBarName="le salon"
          initialTableCode={tableCode}
          initialNickname={tableCode ? "happy-fox" : null}
        />
      </NextIntlClientProvider>
    );
  });
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Share"]')!.click()
  );
  return shared[0];
}

// B6 — the session URL is its write key: the header Share must never hand it out.
describe("session Share button", () => {
  it("invites to the table when in one", async () => {
    const data = await pressShare("ABC234");
    expect(data.url).toBe(`${window.location.origin}/join/ABC234`);
    expect(data.text).toBe("Join my table at Le Salon");
  });

  it("shares the app (no slug anywhere) when not in a table", async () => {
    const data = await pressShare(null);
    expect(data.url).toBe(window.location.origin);
    expect(JSON.stringify(data)).not.toContain("fizzy-julep");
  });
});
