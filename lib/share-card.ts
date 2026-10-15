// Share a night as a picture: a 1080×1350 card drawn on a canvas (no dependency). Where the
// browser can't share files, callers fall back (text recap, or a download).
// Privacy: a card never shows the session slug or URL, nor the table's join code.

export type ShareCard = {
  title: string; // "My Summary" / "Table Summary"
  subtitle: string; // "Demo Bar · Tue 14 Oct" / "3 people"
  total: number;
  totalLabel: string; // "drinks total"
  detail: string; // "⏱ 3h45m", or ""
  lines: string[]; // top drinks, or ranking and awards (6 at most, 8 without emojis)
  emojis: string[]; // badges earned (10 at most)
  tint: string; // the session colour at this total, see getSessionHue
};

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 80;
const AMBER = "#f59e0b";
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Sets the font, shrinking it until `text` fits the card width. */
export function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  weight: number
): number {
  let fitted = size;
  ctx.font = `${weight} ${fitted}px ${FONT}`;
  while (fitted > 24 && ctx.measureText(text).width > WIDTH - 2 * MARGIN) {
    fitted -= 4;
    ctx.font = `${weight} ${fitted}px ${FONT}`;
  }
  return fitted;
}

export function drawShareCard(ctx: CanvasRenderingContext2D, card: ShareCard) {
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, card.tint);
  background.addColorStop(1, "#07070b");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center";

  const write = (text: string, y: number, size: number, color: string, weight = 400) => {
    fitFont(ctx, text, size, weight);
    ctx.fillStyle = color;
    ctx.fillText(text, WIDTH / 2, y);
  };
  write("🍻 TipsyTap", 130, 44, AMBER, 700);
  write(card.title, 240, 72, "#ffffff", 800);
  if (card.subtitle) write(card.subtitle, 310, 40, "rgba(255,255,255,0.7)");
  write(String(card.total), 590, 300, AMBER, 800);
  write(card.totalLabel, 670, 48, "#ffffff", 600);
  if (card.detail) write(card.detail, 740, 40, "rgba(255,255,255,0.7)");
  // Without a badge row (table cards) there is room for 8 lines: 3 ranking + 5 awards.
  const lines = card.lines.slice(0, card.emojis.length ? 6 : 8);
  const spacing = lines.length > 6 ? 52 : 62;
  lines.forEach((line, index) =>
    write(line, 850 + index * spacing, lines.length > 6 ? 40 : 44, "#ffffff", 500)
  );
  if (card.emojis.length) write(card.emojis.slice(0, 10).join(" "), 1240, 64, "#ffffff");
  write("tipsy-tap.vercel.app", 1310, 30, "rgba(255,255,255,0.5)");
}

/** The card as a PNG file, or null where canvas isn't available. Synchronous on purpose:
 * navigator.share must run inside the tap that triggered it (user activation). */
export function cardFile(card: ShareCard, fileName: string): File | null {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawShareCard(ctx, card);
  const [, base64 = ""] = canvas.toDataURL("image/png").split(",");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], fileName, { type: "image/png" });
}

/** Opens the share sheet with the image; false when this browser can't share files. */
export function shareFile(file: File, title: string): boolean {
  if (typeof navigator.canShare !== "function" || !navigator.canShare({ files: [file] })) {
    return false;
  }
  navigator.share({ files: [file], title }).catch(() => {}); // a dismissed sheet rejects
  return true;
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
