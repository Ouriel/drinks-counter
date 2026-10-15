import { describe, it, expect, vi } from "vitest";
import { drawShareCard, fitFont, type ShareCard } from "@/lib/share-card";

// A 2D context that records the text drawn; text width ≈ half the font size per character.
function fakeContext() {
  const drawn: { text: string; font: string }[] = [];
  const ctx = {
    font: "",
    fillStyle: "",
    textAlign: "",
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    measureText: (text: string) => ({
      width: text.length * (parseInt(ctx.font.split(" ")[1]) / 2),
    }),
    fillText: (text: string) => drawn.push({ text, font: ctx.font }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, drawn };
}

const card: ShareCard = {
  title: "My Summary",
  subtitle: "Demo Bar · Tue 14 Oct",
  total: 9,
  totalLabel: "drinks total",
  detail: "⏱ 2h51m",
  lines: ["ipa ×4", "spritz ×3", "water ×2"],
  emojis: ["🍼", "🐣", "🎯"],
  tint: "hsl(300, 55%, 12.5%)",
};

describe("share card", () => {
  it("draws the title, the bar, the total, the top drinks, the badges and the site", () => {
    const { ctx, drawn } = fakeContext();
    drawShareCard(ctx, card);
    const texts = drawn.map((entry) => entry.text);
    expect(texts).toEqual(
      expect.arrayContaining([
        "My Summary",
        "Demo Bar · Tue 14 Oct",
        "9",
        "drinks total",
        "⏱ 2h51m",
        "ipa ×4",
        "🍼 🐣 🎯",
        "tipsy-tap.vercel.app",
      ])
    );
  });

  it("shrinks a long bar name to fit the card", () => {
    const { ctx } = fakeContext();
    expect(fitFont(ctx, "x".repeat(60), 40, 400)).toBeLessThan(40);
    expect(fitFont(ctx, "le salon", 40, 400)).toBe(40);
  });
});
