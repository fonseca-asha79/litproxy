// Per-model parameter capability map. Derived by probing Lightning AI directly.
// Used by the playground to gate UI controls and rewrite payloads so we never
// send a parameter the upstream model rejects.

export type ResponseFormatMode = "none" | "json_object" | "json_schema_strict" | "json_schema";

export interface ModelCaps {
  temperature: boolean;
  top_p: boolean;
  top_k: boolean;
  /** Which token-budget field to send. */
  max_tokens_field: "max_tokens" | "max_completion_tokens";
  presence_penalty: boolean;
  frequency_penalty: boolean;
  stop: boolean;
  /** When true, whitespace-only stop entries must be stripped. */
  stop_no_whitespace: boolean;
  seed: boolean;
  n: boolean;
  logprobs: boolean;
  top_logprobs: boolean;
  response_format: ResponseFormatMode;
  tools: boolean;
  reasoning_effort: boolean;
  stream: boolean;
  /** When true, model is known broken/unavailable upstream. */
  unavailable?: boolean;
}

const BASE: ModelCaps = {
  temperature: true,
  top_p: true,
  top_k: false,
  max_tokens_field: "max_tokens",
  presence_penalty: true,
  frequency_penalty: true,
  stop: true,
  stop_no_whitespace: false,
  seed: true,
  n: true,
  logprobs: true,
  top_logprobs: true,
  response_format: "json_object",
  tools: true,
  reasoning_effort: false,
  stream: true,
};

export function getCaps(modelId: string): ModelCaps {
  const id = modelId.toLowerCase();

  // ---- OpenAI GPT-5 / o3 family: must use max_completion_tokens
  if (
    /^openai\/gpt-5/.test(id) ||
    /^openai\/o3/.test(id)
  ) {
    return {
      ...BASE,
      max_tokens_field: "max_completion_tokens",
      response_format: "json_schema",
      reasoning_effort: true,
    };
  }

  // ---- OpenAI GPT-4 family: reasoning_effort unsupported, top_logprobs requires logprobs
  if (/^openai\/gpt-4/.test(id) || /^openai\/gpt-3/.test(id)) {
    return {
      ...BASE,
      response_format: "json_object",
      reasoning_effort: false,
    };
  }

  // ---- Anthropic Opus 4.7: rejects temperature & top_p; only json_schema strict
  if (/^anthropic\/.*opus-4-7/.test(id)) {
    return {
      ...BASE,
      temperature: false,
      top_p: false,
      logprobs: false,
      top_logprobs: false,
      response_format: "json_schema_strict",
      stop_no_whitespace: true,
    };
  }

  // ---- Anthropic (general): no json_object; no whitespace stops; no logprobs
  if (/^anthropic\//.test(id)) {
    return {
      ...BASE,
      logprobs: false,
      top_logprobs: false,
      response_format: "json_schema_strict",
      stop_no_whitespace: true,
    };
  }

  // ---- Google Gemini 3.x preview: no logprobs at all
  if (/^google\/gemini-3/.test(id)) {
    return {
      ...BASE,
      logprobs: false,
      top_logprobs: false,
      response_format: "json_object",
    };
  }

  // ---- Google Gemini 2.5: logprobs ok, top_logprobs unsupported
  if (/^google\/gemini-2\.5/.test(id)) {
    return {
      ...BASE,
      top_logprobs: false,
      response_format: "json_object",
    };
  }

  // ---- Lightning-native: DeepSeek V3.1 / Llama 3.3 70B — no tools
  if (id === "lightning-ai/deepseek-v3.1" || id === "lightning-ai/llama-3.3-70b") {
    return {
      ...BASE,
      tools: false,
      response_format: "json_object",
    };
  }

  // ---- Default for everything else (glm-5, minimax-m2.5, kimi, gemma, nemotron, etc.)
  return { ...BASE };
}

/**
 * Apply capability rules to a body before sending to the proxy.
 * Mutates and returns a sanitized copy.
 */
export function applyCapsToBody(body: Record<string, any>, caps: ModelCaps): Record<string, any> {
  const out = { ...body };

  // Drop disallowed params
  if (!caps.temperature) delete out.temperature;
  if (!caps.top_p) delete out.top_p;
  if (!caps.presence_penalty) delete out.presence_penalty;
  if (!caps.frequency_penalty) delete out.frequency_penalty;
  if (!caps.seed) delete out.seed;
  if (!caps.n) delete out.n;
  if (!caps.logprobs) { delete out.logprobs; delete out.top_logprobs; }
  if (!caps.top_logprobs) delete out.top_logprobs;
  if (!caps.tools) { delete out.tools; delete out.tool_choice; }
  if (!caps.reasoning_effort) delete out.reasoning_effort;

  // top_logprobs requires logprobs:true everywhere
  if (out.top_logprobs !== undefined && !out.logprobs) delete out.top_logprobs;

  // Token budget field rename
  if (out.max_tokens !== undefined && caps.max_tokens_field === "max_completion_tokens") {
    out.max_completion_tokens = out.max_tokens;
    delete out.max_tokens;
  }
  // Anthropic: never send both
  if (out.max_tokens !== undefined && out.max_completion_tokens !== undefined) {
    delete out.max_completion_tokens;
  }

  // Stop sequences
  if (out.stop !== undefined) {
    if (!caps.stop) {
      delete out.stop;
    } else if (caps.stop_no_whitespace && Array.isArray(out.stop)) {
      const filtered = out.stop.filter((s: string) => typeof s === "string" && s.trim().length > 0);
      if (filtered.length === 0) delete out.stop;
      else out.stop = filtered;
    }
  }

  // Response format gating
  if (out.response_format) {
    const t = out.response_format.type;
    if (caps.response_format === "none") {
      delete out.response_format;
    } else if (t === "json_object" && caps.response_format === "json_schema_strict") {
      // Anthropic family — convert to a strict json_schema fallback
      out.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema: { type: "object", additionalProperties: true },
        },
      };
    } else if (t === "json_schema" && caps.response_format === "json_schema_strict") {
      const js = out.response_format.json_schema || {};
      out.response_format = { type: "json_schema", json_schema: { ...js, strict: true } };
    }
  }

  if (!caps.stream) delete out.stream;

  return out;
}
