// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SummaryClient } from "@/app/[locale]/s/[slug]/summary/SummaryClient";
import { TableSummaryClient } from "@/app/[locale]/s/[slug]/table-summary/TableSummaryClient";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const share = vi.fn(async (_data: ShareData) => {});
let canShareFiles = true;

beforeEach(() => {
  share.mockClear();
  // jsdom has no canvas: a context that accepts drawing, and a 1-pixel PNG.
  HTMLCanvasElement.prototype.getContext = (() => ({
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
  })) as unknown as HTMLCanvasElement["getContext"];
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
  Object.assign(navigator, {
    share,
    canShare: (data: ShareData) => canShareFiles && Boolean(data.files?.length),
  });
});

async function render(node: React.ReactNode) {
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {node}
      </NextIntlClientProvider>
    );
  });
  const button = [...container.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(messages.summary.share)
  );
  return { container, button };
}

const drinks = [
  { id: "d1", name: "ipa", count: 4, category: "beer", tappedAt: ["2026-10-14T20:00:00.000Z"] },
];

describe("share as an image (design review L11)", () => {
  it("My Summary shares a PNG card, without the session link", async () => {
    canShareFiles = true;
    const { button } = await render(
      <SummaryClient slug="fizzy-julep" expired={false} barName="le salon" drinks={drinks} />
    );
    await act(async () => button!.click());
    const [data] = share.mock.calls[0];
    expect(data.files?.[0]).toMatchObject({ type: "image/png" });
    expect(JSON.stringify(data)).not.toContain("fizzy-julep");
  });

  it("My Summary falls back to the text recap where files can't be shared", async () => {
    canShareFiles = false;
    const { button } = await render(
      <SummaryClient slug="fizzy-julep" expired={false} barName="le salon" drinks={drinks} />
    );
    await act(async () => button!.click());
    const [data] = share.mock.calls[0];
    expect(data.files).toBeUndefined();
    expect(data.text).toContain("ipa");
  });

  it("Table Summary gets a Share button that shares a PNG card", async () => {
    canShareFiles = true;
    const { button } = await render(
      <TableSummaryClient
        slug="fizzy-julep"
        stats={{
          code: "ABC234",
          total: 7,
          members: [
            { nickname: "fox", total: 4 },
            { nickname: "owl", total: 3 },
          ],
          byCategory: [],
          topDrinks: [],
          awards: [{ key: "explorer", nickname: "fox" }],
        }}
      />
    );
    await act(async () => button!.click());
    const [data] = share.mock.calls[0];
    expect(data.files?.[0]).toMatchObject({ type: "image/png" });
    expect(JSON.stringify(data)).not.toContain("ABC234");
  });
});
