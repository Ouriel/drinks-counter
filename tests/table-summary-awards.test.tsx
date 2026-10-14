// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { TableSummaryClient } from "@/app/[locale]/s/[slug]/table-summary/TableSummaryClient";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("table summary awards", () => {
  it("lists each award with its winner", () => {
    const html = renderToString(
      <NextIntlClientProvider locale="en" messages={messages}>
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
            awards: [
              { key: "explorer", nickname: "fox" },
              { key: "nightOwl", nickname: "owl" },
            ],
          }}
        />
      </NextIntlClientProvider>
    );
    expect(html).toContain(messages.tableSummary.awardExplorer);
    expect(html).toContain(messages.tableSummary.awardNightOwl);
    expect(html).toContain("Fox");
    expect(html).not.toContain(messages.tableSummary.awardPace);
  });
});
