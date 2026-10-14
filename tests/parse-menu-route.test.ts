import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const items = [{ name: "bière blonde", category: "beer" }];

vi.mock("@/lib/ai", async () => {
  const { MockLanguageModelV4 } = await import("ai/test");
  return {
    getVisionModel: () =>
      new MockLanguageModelV4({
        doGenerate: {
          content: [{ type: "text", text: JSON.stringify({ items }) }],
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        },
      }),
  };
});

const { POST } = await import("@/app/api/parse-menu/route");

function photoRequest(ip: string, bytes = new Uint8Array([1, 2, 3])) {
  const form = new FormData();
  form.append("photo", new File([bytes], "menu.jpg", { type: "image/jpeg" }));
  return new NextRequest("http://localhost/api/parse-menu", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": ip },
  });
}

describe("POST /api/parse-menu", () => {
  it("returns the items parsed by the model", async () => {
    const response = await POST(photoRequest("10.0.0.1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items });
  });

  it("rejects a photo above 4 MB", async () => {
    const response = await POST(photoRequest("10.0.0.2", new Uint8Array(4 * 1024 * 1024 + 1)));
    expect(response.status).toBe(413);
  });

  it("rate-limits after 5 requests per IP", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await POST(photoRequest("10.0.0.3"));
    expect((await POST(photoRequest("10.0.0.3"))).status).toBe(429);
  });
});
