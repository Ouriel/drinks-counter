// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SummaryClient } from "@/app/[locale]/s/[slug]/summary/SummaryClient";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// 23:30 UTC = 00:30 in Paris: "Night Owl" depends on the zone that renders it.
const taps = ["2026-10-12T21:00:00.000Z", "2026-10-12T23:30:00.000Z"];
const drinks = [
  { id: "d1", name: "beer", count: 2, category: "beer", tappedAt: taps, createdAt: taps[0] },
];
const page = (): ReactNode => (
  <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
    <SummaryClient slug="fizzy-julep" expired={false} barName="le salon" drinks={drinks} />
  </NextIntlClientProvider>
);

afterEach(() => {
  process.env.TZ = "UTC";
  localStorage.clear();
});

// B9: the server (UTC, no localStorage) and the browser (local zone, saved personal best)
// must render the same first HTML, otherwise React throws hydration error #418.
describe("B9: SummaryClient hydrates without mismatch", () => {
  it("renders zone/storage-dependent values only after hydration", async () => {
    process.env.TZ = "UTC"; // Vercel function
    const container = document.createElement("div");
    container.innerHTML = renderToString(page());

    process.env.TZ = "Europe/Paris"; // the user's phone
    localStorage.setItem("tipsytap_personal_best", "2");
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, page(), { onRecoverableError: (error) => errors.push(error) });
    });

    expect(errors).toEqual([]);
    expect(container.textContent).toContain("Personal best!"); // still shown once hydrated
  });
});
