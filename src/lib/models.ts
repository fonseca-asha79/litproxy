// Lightning AI model catalog (verified live from https://lightning.ai/api/v1/models)
// Prices are USD per 1M tokens (input/output)
export type Provider = "openai" | "google" | "anthropic" | "lightning-ai";

export interface ModelInfo {
  id: string;            // API model identifier sent to Lightning AI
  name: string;          // Display name
  provider: Provider;
  inputPrice: number;    // per 1M tokens
  outputPrice: number;   // per 1M tokens
  context: string;       // human readable
}

// Helper to convert per-token to per-1M
const M = (perToken: number) => Math.round(perToken * 1_000_000 * 100) / 100;

export const MODELS: ModelInfo[] = [
  // ---- OpenAI ----
  { id: "openai/gpt-5",                   name: "GPT 5",          provider: "openai",       inputPrice: M(1.25e-6),  outputPrice: M(1e-5),    context: "400K" },
  { id: "openai/gpt-5-mini",              name: "GPT 5 mini",     provider: "openai",       inputPrice: M(2.5e-7),   outputPrice: M(2e-6),    context: "400K" },
  { id: "openai/gpt-5-nano",              name: "GPT 5 nano",     provider: "openai",       inputPrice: M(5e-8),     outputPrice: M(4e-7),    context: "400K" },
  { id: "openai/gpt-5.2-2025-12-11",      name: "GPT 5.2",        provider: "openai",       inputPrice: M(1.75e-6),  outputPrice: M(1.4e-5),  context: "400K" },
  { id: "openai/gpt-4.1",                 name: "GPT 4.1",        provider: "openai",       inputPrice: M(2e-6),     outputPrice: M(8e-6),    context: "1M" },
  { id: "openai/gpt-4o",                  name: "GPT 4o",         provider: "openai",       inputPrice: M(2.5e-6),   outputPrice: M(1e-5),    context: "128K" },
  { id: "openai/gpt-4",                   name: "GPT 4",          provider: "openai",       inputPrice: M(3e-5),     outputPrice: M(6e-5),    context: "8K" },
  { id: "openai/o3",                      name: "o3",             provider: "openai",       inputPrice: M(2e-6),     outputPrice: M(8e-6),    context: "200K" },
  { id: "openai/o3-mini",                 name: "o3 mini",        provider: "openai",       inputPrice: M(1.1e-6),   outputPrice: M(4.4e-6),  context: "200K" },

  // ---- Anthropic ----
  { id: "anthropic/claude-opus-4-5-20251101",   name: "Claude Opus 4.5",   provider: "anthropic", inputPrice: M(5e-6),   outputPrice: M(2.5e-5),  context: "200K" },
  { id: "anthropic/claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic", inputPrice: M(3e-6),   outputPrice: M(1.5e-5),  context: "200K" },
  { id: "anthropic/claude-haiku-4-5-20251001",  name: "Claude Haiku 4.5",  provider: "anthropic", inputPrice: M(1e-6),   outputPrice: M(5e-6),    context: "200K" },
  { id: "anthropic/claude-opus-4-1-20250805",   name: "Claude Opus 4.1",   provider: "anthropic", inputPrice: M(1.5e-5), outputPrice: M(7.5e-5),  context: "200K" },
  { id: "anthropic/claude-sonnet-4-20250514",   name: "Claude Sonnet 4",   provider: "anthropic", inputPrice: M(3e-6),   outputPrice: M(1.5e-5),  context: "200K" },

  // ---- Google ----
  { id: "google/gemini-2.5-pro",                       name: "Gemini 2.5 Pro",        provider: "google", inputPrice: M(2.5e-6),  outputPrice: M(1.5e-5),  context: "1M" },
  { id: "google/gemini-2.5-flash",                     name: "Gemini 2.5 Flash",      provider: "google", inputPrice: M(3e-7),    outputPrice: M(2.5e-6),  context: "1M" },
  { id: "google/gemini-2.5-flash-lite-preview-06-17",  name: "Gemini 2.5 Flash Lite", provider: "google", inputPrice: M(1e-7),    outputPrice: M(4e-7),    context: "1M" },

  // ---- Lightning open-source ----
  { id: "lightning-ai/llama-3.3-70b",  name: "Llama 3.3 70B",  provider: "lightning-ai", inputPrice: M(7.5e-8),  outputPrice: M(7.5e-8),  context: "128K" },
  { id: "lightning-ai/DeepSeek-V3.1",  name: "DeepSeek V3.1",  provider: "lightning-ai", inputPrice: M(8e-8),    outputPrice: M(2.75e-7), context: "164K" },
  { id: "lightning-ai/gpt-oss-120b",   name: "GPT OSS 120B",   provider: "lightning-ai", inputPrice: M(2.5e-8),  outputPrice: M(1e-7),    context: "128K" },
  { id: "lightning-ai/gpt-oss-20b",    name: "GPT OSS 20B",    provider: "lightning-ai", inputPrice: M(1.25e-8), outputPrice: M(5e-8),    context: "128K" },
];

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function computeCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const m = getModel(modelId);
  if (!m) return 0;
  return (promptTokens / 1_000_000) * m.inputPrice + (completionTokens / 1_000_000) * m.outputPrice;
}
