import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

// AI_PROVIDER env var: "gemini" (default) | "groq"
// Gemini: GOOGLE_GENERATIVE_AI_API_KEY (free: 15 RPM, 1M tokens/day)
// Groq: GROQ_API_KEY (free: 30 RPM, 14.4K req/day)

export function getVisionModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER || "gemini";

  switch (provider) {
    case "groq":
      return groq("llama-3.2-90b-vision-preview");
    case "gemini":
    default:
      return google("gemini-1.5-flash");
  }
}
