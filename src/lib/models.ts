// Lightning AI model catalog. Prices in USD per 1M tokens (input/output).
export type Provider = "openai" | "google" | "anthropic" | "lightning-ai";

export interface ModelInfo {
  id: string;
  name: string;
  provider: Provider;
  inputPrice: number;
  outputPrice: number;
  context: string;
}

export const MODELS: ModelInfo[] = [
  // ---- OpenAI ----
  { id: "openai/gpt-5",            name: "GPT 5",            provider: "openai", inputPrice: 1.25, outputPrice: 10.00, context: "400K" },
  { id: "openai/gpt-5-4",          name: "GPT 5-4",          provider: "openai", inputPrice: 2.50, outputPrice: 15.00, context: "400K" },
  { id: "openai/gpt-5.2",          name: "GPT 5.2",          provider: "openai", inputPrice: 1.75, outputPrice: 14.00, context: "400K" },
  { id: "openai/gpt-5-mini",       name: "GPT 5 mini",       provider: "openai", inputPrice: 0.25, outputPrice: 2.00,  context: "400K" },
  { id: "openai/gpt-5-nano",       name: "GPT 5 nano",       provider: "openai", inputPrice: 0.05, outputPrice: 0.40,  context: "400K" },
  { id: "openai/o3",               name: "o3",               provider: "openai", inputPrice: 2.00, outputPrice: 8.00,  context: "200K" },
  { id: "openai/o3-mini",          name: "o3 mini",          provider: "openai", inputPrice: 1.10, outputPrice: 4.40,  context: "200K" },
  { id: "openai/gpt-4o",           name: "GPT 4o",           provider: "openai", inputPrice: 2.50, outputPrice: 10.00, context: "128K" },
  { id: "openai/gpt-4.1",          name: "GPT 4.1",          provider: "openai", inputPrice: 2.00, outputPrice: 8.00,  context: "1M" },
  { id: "openai/gpt-4-turbo",      name: "GPT 4 Turbo",      provider: "openai", inputPrice: 10.00, outputPrice: 30.00, context: "128K" },
  { id: "openai/gpt-4",            name: "GPT 4",            provider: "openai", inputPrice: 30.00, outputPrice: 60.00, context: "8K" },
  { id: "openai/gpt-3.5-turbo",    name: "GPT 3.5 Turbo",    provider: "openai", inputPrice: 0.50, outputPrice: 1.50,  context: "16K" },

  // ---- Anthropic ----
  { id: "anthropic/claude-opus-4-7",            name: "Claude Opus 4.7",   provider: "anthropic", inputPrice: 5.00,  outputPrice: 25.00, context: "200K" },
  { id: "anthropic/claude-4-6-opus",            name: "Claude 4.6 Opus",   provider: "anthropic", inputPrice: 5.00,  outputPrice: 25.00, context: "200K" },
  { id: "anthropic/claude-sonnet-4-6",          name: "Claude Sonnet 4.6", provider: "anthropic", inputPrice: 3.00,  outputPrice: 15.00, context: "200K" },
  { id: "anthropic/claude-opus-4-6",            name: "Claude Opus 4.6",   provider: "anthropic", inputPrice: 5.00,  outputPrice: 25.00, context: "200K" },
  { id: "anthropic/claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic", inputPrice: 3.00,  outputPrice: 15.00, context: "200K" },
  { id: "anthropic/claude-haiku-4-5-20251001",  name: "Claude Haiku 4.5",  provider: "anthropic", inputPrice: 1.00,  outputPrice: 5.00,  context: "200K" },
  { id: "anthropic/claude-opus-4-1-20250805",   name: "Claude Opus 4.1",   provider: "anthropic", inputPrice: 15.00, outputPrice: 75.00, context: "200K" },
  { id: "anthropic/claude-opus-4-20250514",     name: "Claude Opus 4",     provider: "anthropic", inputPrice: 15.00, outputPrice: 75.00, context: "200K" },
  { id: "anthropic/claude-sonnet-4-20250514",   name: "Claude Sonnet 4",   provider: "anthropic", inputPrice: 3.00,  outputPrice: 15.00, context: "200K" },

  // ---- Google ----
  { id: "google/gemini-3.1-pro-preview",              name: "Gemini 3.1 Pro Preview",        provider: "google", inputPrice: 2.00, outputPrice: 12.00, context: "1M" },
  { id: "google/gemini-3.1-flash-lite-preview",       name: "Gemini 3.1 Flash Lite Preview", provider: "google", inputPrice: 0.25, outputPrice: 1.50,  context: "1M" },
  { id: "google/gemini-3-flash-preview",              name: "Gemini 3 Flash Preview",        provider: "google", inputPrice: 0.50, outputPrice: 1.00,  context: "1M" },
  { id: "google/gemini-2.5-pro",                      name: "Gemini 2.5 Pro",                provider: "google", inputPrice: 2.50, outputPrice: 15.00, context: "1M" },
  { id: "google/gemini-2.5-flash",                    name: "Gemini 2.5 Flash",              provider: "google", inputPrice: 0.30, outputPrice: 2.50,  context: "1M" },
  { id: "google/gemini-2.5-flash-lite-preview-06-17", name: "Gemini 2.5 Flash Lite",         provider: "google", inputPrice: 0.10, outputPrice: 0.40,  context: "1M" },

  // ---- Lightning AI (Open) ----
  { id: "lightning-ai/DeepSeek-V3.1",                       name: "DeepSeek V3.1",        provider: "lightning-ai", inputPrice: 0.08, outputPrice: 0.28, context: "164K" },
  { id: "lightning-ai/deepseek-v4-pro",                     name: "DeepSeek V4 Pro",      provider: "lightning-ai", inputPrice: 0.89, outputPrice: 3.00, context: "164K" },
  { id: "lightning-ai/nvidia-nemotron-3-nano-omni-30b-a3b", name: "Nemotron 3 Nano 30B",  provider: "lightning-ai", inputPrice: 0.25, outputPrice: 0.50, context: "128K" },
  { id: "lightning-ai/nvidia-nemotron-3-super-120b-a12b",   name: "Nemotron 3 Super 120B",provider: "lightning-ai", inputPrice: 0.35, outputPrice: 0.75, context: "128K" },
  { id: "lightning-ai/gemma-4-31B-it",                      name: "Gemma 4 31B",          provider: "lightning-ai", inputPrice: 0.14, outputPrice: 0.40, context: "128K" },
  { id: "lightning-ai/kimi-k2.5",                           name: "Kimi K2.5",            provider: "lightning-ai", inputPrice: 1.10, outputPrice: 2.50, context: "200K" },
  { id: "lightning-ai/glm-5",                               name: "GLM 5",                provider: "lightning-ai", inputPrice: 0.90, outputPrice: 3.20, context: "128K" },
  { id: "lightning-ai/minimax-m2.5",                        name: "MiniMax M2.5",         provider: "lightning-ai", inputPrice: 0.25, outputPrice: 1.20, context: "200K" },
  { id: "lightning-ai/llama-3.3-70b",                       name: "Llama 3.3 70B",        provider: "lightning-ai", inputPrice: 0.07, outputPrice: 0.07, context: "128K" },
  { id: "lightning-ai/gpt-oss-120b",                        name: "GPT OSS 120B",         provider: "lightning-ai", inputPrice: 0.02, outputPrice: 0.10, context: "128K" },
  { id: "lightning-ai/gpt-oss-20b",                         name: "GPT OSS 20B",          provider: "lightning-ai", inputPrice: 0.01, outputPrice: 0.05, context: "128K" },
];

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function computeCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const m = getModel(modelId);
  if (!m) return 0;
  return (promptTokens / 1_000_000) * m.inputPrice + (completionTokens / 1_000_000) * m.outputPrice;
}
