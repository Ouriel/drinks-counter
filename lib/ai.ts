import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// Gemini 2.5 Flash Lite (free tier: 15 RPM, 1000 requests/day).
// Requires GOOGLE_GENERATIVE_AI_API_KEY.
export function getVisionModel(): LanguageModel {
  return google("gemini-2.5-flash-lite");
}
