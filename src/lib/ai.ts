import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export const AI_MODEL = "claude-sonnet-4-6";

export function getAnthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    });
  }
  return _client;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
