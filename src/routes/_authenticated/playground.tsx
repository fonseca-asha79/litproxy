import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MODELS } from "@/lib/models";
import { getCaps, applyCapsToBody } from "@/lib/model-capabilities";
import { toast } from "sonner";
import { Play, Eraser, Plus, Trash2, Send, Code2, MessageSquare, Settings2, Square } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeTabs } from "@/components/CodeBlock";

export const Route = createFileRoute("/_authenticated/playground")({
  head: () => ({ meta: [{ title: "Playground — Litproxy" }] }),
  component: Playground,
});

interface Settings {
  user_id: string;
  default_model: string;
  proxy_api_key: string;
}
interface KeyRow { id: string; label: string; is_active: boolean }
type Role = "system" | "user" | "assistant";
interface Msg { role: Role; content: string }

interface Params {
  model: string;
  keyId: string;
  stream: boolean;
  temperature: string;
  max_tokens: string;
  top_p: string;
  frequency_penalty: string;
  presence_penalty: string;
  stop: string;
  seed: string;
  response_format: "text" | "json_object";
  n: string;
}

const defaultParams: Params = {
  model: "default",
  keyId: "auto",
  stream: true,
  temperature: "0.7",
  max_tokens: "",
  top_p: "1",
  frequency_penalty: "0",
  presence_penalty: "0",
  stop: "",
  seed: "",
  response_format: "text",
  n: "1",
};

function Playground() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [params, setParams] = useState<Params>(defaultParams);

  // Single mode
  const [system, setSystem] = useState("");
  const [single, setSingle] = useState("Write a haiku about quiet infrastructure.");
  const [singleResp, setSingleResp] = useState<{ status: number; ms: number; content: string; raw: any } | null>(null);
  const [running, setRunning] = useState(false);

  // Chat mode
  const [chat, setChat] = useState<Msg[]>([{ role: "system", content: "You are a helpful assistant." }]);
  const [draft, setDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${baseUrl}/api/public/v1/chat/completions`;
  const baseEndpoint = `${baseUrl}/api/public/v1`;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("user_settings").select("*").maybeSingle(),
      supabase.from("lightning_keys").select("id, label, is_active").order("created_at", { ascending: false }),
    ]).then(([s, k]) => {
      if (s.data) setSettings(s.data as Settings);
      if (k.data) setKeys((k.data as KeyRow[]).filter((x) => x.is_active));
    });
  }, [user]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, chatBusy]);

  const resolvedModel = params.model === "default" ? (settings?.default_model || "openai/gpt-5-mini") : params.model;
  const caps = useMemo(() => getCaps(resolvedModel), [resolvedModel]);

  const buildBody = (messages: Msg[]) => {
    const body: any = { model: params.model, messages, stream: params.stream };
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    const t = num(params.temperature); if (t !== undefined) body.temperature = t;
    const mt = num(params.max_tokens); if (mt !== undefined) body.max_tokens = mt;
    const tp = num(params.top_p); if (tp !== undefined && tp !== 1) body.top_p = tp;
    const fp = num(params.frequency_penalty); if (fp !== undefined && fp !== 0) body.frequency_penalty = fp;
    const pp = num(params.presence_penalty); if (pp !== undefined && pp !== 0) body.presence_penalty = pp;
    const seed = num(params.seed); if (seed !== undefined) body.seed = seed;
    const n = num(params.n); if (n !== undefined && n !== 1) body.n = n;
    if (params.stop.trim()) body.stop = params.stop.split(",").map((s) => s.trim()).filter(Boolean);
    if (params.response_format === "json_object") body.response_format = { type: "json_object" };
    if (params.stream) body.stream_options = { include_usage: true };
    return applyCapsToBody(body, caps);
  };

  const headersFor = (): Record<string, string> => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings?.proxy_api_key || ""}`,
    };
    if (params.keyId !== "auto") h["X-Lightning-Key-Id"] = params.keyId;
    return h;
  };

  // --- Streaming consumer ---
  async function consumeStream(
    res: Response,
    onChunk: (delta: string) => void,
  ): Promise<{ raw: any; usage?: any }> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let usage: any;
    let collected = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const ln of lines) {
        const line = ln.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.usage) usage = parsed.usage;
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            collected += delta;
            onChunk(delta);
          }
        } catch {}
      }
    }
    return { raw: { content: collected, usage }, usage };
  }

  // --- Single request ---
  const runSingle = async () => {
    if (!settings) return toast.error("Loading…");
    if (keys.length === 0) return toast.error("Add a Lightning key first.");
    if (!single.trim()) return toast.error("Empty user message.");

    const msgs: Msg[] = [];
    if (system.trim()) msgs.push({ role: "system", content: system.trim() });
    msgs.push({ role: "user", content: single });

    setRunning(true);
    setSingleResp({ status: 0, ms: 0, content: "", raw: null });
    const t0 = performance.now();
    abortRef.current = new AbortController();
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: headersFor(),
        body: JSON.stringify(buildBody(msgs)),
        signal: abortRef.current.signal,
      });
      if (params.stream && r.ok) {
        let acc = "";
        const { raw } = await consumeStream(r, (d) => {
          acc += d;
          setSingleResp({ status: r.status, ms: Math.round(performance.now() - t0), content: acc, raw: null });
        });
        setSingleResp({ status: r.status, ms: Math.round(performance.now() - t0), content: acc, raw });
      } else {
        const json = await r.json();
        const content = json?.choices?.[0]?.message?.content ?? json?.error?.message ?? JSON.stringify(json, null, 2);
        setSingleResp({ status: r.status, ms: Math.round(performance.now() - t0), content, raw: json });
      }
    } catch (e: any) {
      setSingleResp({ status: 0, ms: Math.round(performance.now() - t0), content: String(e?.message || e), raw: { error: String(e) } });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  // --- Chat (preserves history) ---
  const sendChat = async () => {
    if (!settings) return toast.error("Loading…");
    if (keys.length === 0) return toast.error("Add a Lightning key first.");
    if (!draft.trim()) return;

    const next: Msg[] = [...chat, { role: "user", content: draft.trim() }];
    setChat(next);
    setDraft("");
    setChatBusy(true);
    abortRef.current = new AbortController();

    // placeholder assistant for streaming
    const placeholderIdx = next.length;
    setChat((c) => [...c, { role: "assistant", content: "" }]);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: headersFor(),
        body: JSON.stringify(buildBody(next)),
        signal: abortRef.current.signal,
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setChat((c) => c.map((m, i) => (i === placeholderIdx ? { ...m, content: `❌ ${j?.error?.message || r.statusText}` } : m)));
        return;
      }

      if (params.stream) {
        let acc = "";
        await consumeStream(r, (d) => {
          acc += d;
          setChat((c) => c.map((m, i) => (i === placeholderIdx ? { ...m, content: acc } : m)));
        });
      } else {
        const json = await r.json();
        const content = json?.choices?.[0]?.message?.content ?? `❌ ${json?.error?.message || "no content"}`;
        setChat((c) => c.map((m, i) => (i === placeholderIdx ? { ...m, content } : m)));
      }
    } catch (e: any) {
      setChat((c) => c.map((m, i) => (i === placeholderIdx ? { ...m, content: `❌ ${e?.message || e}` } : m)));
    } finally {
      setChatBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  // --- Export snippets reflect current params ---
  const codeSnippets = useMemo(() => {
    const messages = chat.length > 1 ? chat : [{ role: "user", content: single }];
    const body = buildBody(messages as Msg[]);
    const apiKey = settings?.proxy_api_key || "<your_proxy_key>";
    const bodyJson = JSON.stringify(body, null, 2);
    return [
      {
        label: "cURL",
        language: "bash",
        code: `curl ${endpoint} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body)}'`,
      },
      {
        label: "Python",
        language: "python",
        code: `from openai import OpenAI

client = OpenAI(
    base_url="${baseEndpoint}",
    api_key="${apiKey}",
)

response = client.chat.completions.create(**${bodyJson.replace(/"([a-z_]+)":/g, '"$1":')})
${params.stream ? 'for chunk in response:\n    print(chunk.choices[0].delta.content or "", end="")' : "print(response.choices[0].message.content)"}`,
      },
      {
        label: "Node.js",
        language: "javascript",
        code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseEndpoint}",
  apiKey: "${apiKey}",
});

const response = await client.chat.completions.create(${bodyJson});
${params.stream ? "for await (const chunk of response) {\n  process.stdout.write(chunk.choices[0]?.delta?.content || \"\");\n}" : "console.log(response.choices[0].message.content);"}`,
      },
      {
        label: "JSON Body",
        language: "json",
        code: bodyJson,
      },
    ];
  }, [chat, single, params, settings, endpoint, baseEndpoint]);

  const setP = <K extends keyof Params>(k: K, v: Params[K]) => setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="border-b border-hairline">
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-6">
          <p className="eyebrow">Playground</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Test your endpoint</h1>
          <p className="mt-2 max-w-xl text-[14px] text-foreground/60">
            Compose requests, chat with history, tweak every OpenAI parameter, then copy the code.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* ============ Configuration sidebar ============ */}
          <aside className="lg:col-span-4">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-2xl border border-hairline bg-surface/40 p-5">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Settings2 className="h-3.5 w-3.5" /> Configuration
                </h2>

                <div className="mt-4 space-y-4">
                  <Field label="Model">
                    <select
                      value={params.model}
                      onChange={(e) => setP("model", e.target.value)}
                      className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
                    >
                      <option value="default">default — uses {settings?.default_model || "dashboard default"}</option>
                      <optgroup label="OpenAI">
                        {MODELS.filter((m) => m.provider === "openai").map((m) => (
                          <option key={m.id} value={m.id}>{m.name} — {m.id}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Anthropic">
                        {MODELS.filter((m) => m.provider === "anthropic").map((m) => (
                          <option key={m.id} value={m.id}>{m.name} — {m.id}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Google">
                        {MODELS.filter((m) => m.provider === "google").map((m) => (
                          <option key={m.id} value={m.id}>{m.name} — {m.id}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Lightning AI">
                        {MODELS.filter((m) => m.provider === "lightning-ai").map((m) => (
                          <option key={m.id} value={m.id}>{m.name} — {m.id}</option>
                        ))}
                      </optgroup>
                    </select>
                  </Field>

                  <Field label="Lightning key">
                    <select
                      value={params.keyId}
                      onChange={(e) => setP("keyId", e.target.value)}
                      className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
                    >
                      <option value="auto">Auto — rotate ({keys.length})</option>
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>{k.label}</option>
                      ))}
                    </select>
                    {keys.length === 0 && (
                      <p className="mt-1.5 text-[11.5px] text-destructive">No active keys. Add one in dashboard.</p>
                    )}
                  </Field>

                  <label className="flex cursor-pointer items-center justify-between rounded-md border border-hairline bg-background px-3 py-2.5">
                    <span className="text-[13px] font-medium">Streaming</span>
                    <input
                      type="checkbox"
                      checked={params.stream}
                      onChange={(e) => setP("stream", e.target.checked)}
                      className="h-4 w-4 accent-[oklch(0.85_0.18_165)]"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {caps.temperature && <Field label="Temperature"><Num v={params.temperature} on={(v) => setP("temperature", v)} ph="0.7" /></Field>}
                    <Field label={caps.max_tokens_field === "max_completion_tokens" ? "Max completion" : "Max tokens"}>
                      <Num v={params.max_tokens} on={(v) => setP("max_tokens", v)} ph="auto" />
                    </Field>
                    {caps.top_p && <Field label="Top P"><Num v={params.top_p} on={(v) => setP("top_p", v)} ph="1" /></Field>}
                    {caps.n && <Field label="N (choices)"><Num v={params.n} on={(v) => setP("n", v)} ph="1" /></Field>}
                    {caps.frequency_penalty && <Field label="Freq. penalty"><Num v={params.frequency_penalty} on={(v) => setP("frequency_penalty", v)} ph="0" /></Field>}
                    {caps.presence_penalty && <Field label="Pres. penalty"><Num v={params.presence_penalty} on={(v) => setP("presence_penalty", v)} ph="0" /></Field>}
                    {caps.seed && <Field label="Seed"><Num v={params.seed} on={(v) => setP("seed", v)} ph="random" /></Field>}
                    {caps.response_format !== "none" && (
                      <Field label="Format">
                        <select
                          value={params.response_format}
                          onChange={(e) => setP("response_format", e.target.value as any)}
                          className="w-full rounded-md border border-hairline bg-background px-2 py-1.5 text-[12.5px] focus:border-brand focus:outline-none"
                        >
                          <option value="text">text</option>
                          <option value="json_object">
                            {caps.response_format === "json_schema_strict" ? "json (strict schema)" : "json_object"}
                          </option>
                        </select>
                      </Field>
                    )}
                  </div>

                  {caps.stop && (
                    <Field label="Stop (comma separated)">
                      <input
                        value={params.stop}
                        onChange={(e) => setP("stop", e.target.value)}
                        placeholder="\\n\\n, ###"
                        className="w-full rounded-md border border-hairline bg-background px-3 py-2 font-mono text-[12px] focus:border-brand focus:outline-none"
                      />
                    </Field>
                  )}

                  <p className="rounded-md bg-surface/60 px-2.5 py-1.5 text-[11px] text-foreground/55">
                    Showing only parameters supported by <span className="font-mono">{resolvedModel}</span>.
                  </p>

                  <button
                    onClick={() => setParams(defaultParams)}
                    className="w-full rounded-md border border-hairline px-3 py-1.5 text-[12px] text-foreground/60 hover:border-foreground/40 hover:text-foreground"
                  >
                    Reset parameters
                  </button>
                </div>

                <div className="mt-5 border-t border-hairline pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Endpoint</p>
                  <p className="mt-1 break-all font-mono text-[10.5px] text-foreground/55">{endpoint}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ============ Main ============ */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="mb-5 grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
                <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Chat</TabsTrigger>
                <TabsTrigger value="single" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Single</TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5"><Code2 className="h-3.5 w-3.5" /> Code</TabsTrigger>
              </TabsList>

              {/* --- CHAT MODE --- */}
              <TabsContent value="chat" className="mt-0 space-y-4">
                <div className="rounded-2xl border border-hairline bg-surface/40">
                  <div ref={chatScrollRef} className="max-h-[55vh] min-h-[300px] space-y-3 overflow-y-auto p-5">
                    {chat.map((m, i) => (
                      <ChatBubble
                        key={i}
                        msg={m}
                        onChange={(c) => setChat((arr) => arr.map((x, j) => (j === i ? { ...x, content: c } : x)))}
                        onChangeRole={(r) => setChat((arr) => arr.map((x, j) => (j === i ? { ...x, role: r } : x)))}
                        onDelete={() => setChat((arr) => arr.filter((_, j) => j !== i))}
                      />
                    ))}
                    {chat.length === 0 && (
                      <p className="py-12 text-center text-[13px] text-muted-foreground">Start a conversation below.</p>
                    )}
                  </div>

                  <div className="border-t border-hairline p-4">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                      rows={2}
                      placeholder="Type a message…  (⌘/Ctrl + Enter to send)"
                      className="w-full resize-y rounded-md border border-hairline bg-background p-3 text-[13.5px] focus:border-brand focus:outline-none"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setChat((c) => [...c, { role: "user", content: "" }])}
                          className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1.5 text-[11.5px] text-foreground/60 hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" /> Add empty turn
                        </button>
                        <button
                          onClick={() => setChat([{ role: "system", content: "You are a helpful assistant." }])}
                          className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1.5 text-[11.5px] text-foreground/60 hover:text-foreground"
                        >
                          <Eraser className="h-3 w-3" /> Clear
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {chatBusy && (
                          <button
                            onClick={stop}
                            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive hover:bg-destructive/20"
                          >
                            <Square className="h-3 w-3 fill-current" /> Stop
                          </button>
                        )}
                        <button
                          onClick={sendChat}
                          disabled={chatBusy}
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-brand-deep disabled:opacity-60"
                        >
                          <Send className="h-3.5 w-3.5" /> {chatBusy ? "Sending…" : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* --- SINGLE MODE --- */}
              <TabsContent value="single" className="mt-0">
                <div className="rounded-2xl border border-hairline bg-surface/40 p-5">
                  <Field label="System (optional)">
                    <textarea
                      value={system}
                      onChange={(e) => setSystem(e.target.value)}
                      rows={2}
                      placeholder="You are a helpful assistant…"
                      className="w-full resize-y rounded-md border border-hairline bg-background p-3 font-mono text-[12.5px] focus:border-brand focus:outline-none"
                    />
                  </Field>
                  <div className="mt-4">
                    <Field label="User message">
                      <textarea
                        value={single}
                        onChange={(e) => setSingle(e.target.value)}
                        rows={5}
                        className="w-full resize-y rounded-md border border-hairline bg-background p-3 font-mono text-[12.5px] focus:border-brand focus:outline-none"
                      />
                    </Field>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={runSingle}
                      disabled={running}
                      className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-brand-deep disabled:opacity-60"
                    >
                      <Play className="h-3.5 w-3.5" /> {running ? "Sending…" : "Send"}
                    </button>
                    {running && (
                      <button onClick={stop} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                        <Square className="h-3 w-3 fill-current" /> Stop
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-hairline bg-surface/40 p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Response</h3>
                    {singleResp && (
                      <div className="flex gap-3 font-mono text-[11px]">
                        <span className={"rounded-full px-2 py-0.5 " + (singleResp.status >= 200 && singleResp.status < 300 ? "border border-success/30 bg-success/10 text-success" : "border border-destructive/30 bg-destructive/10 text-destructive")}>
                          {singleResp.status || "ERR"}
                        </span>
                        <span className="text-muted-foreground">{singleResp.ms}ms</span>
                      </div>
                    )}
                  </div>
                  {!singleResp ? (
                    <p className="mt-4 text-[13px] text-muted-foreground">Awaiting your first request…</p>
                  ) : (
                    <>
                      <pre className="mt-4 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg border border-hairline bg-background p-4 font-mono text-[12.5px] leading-6 text-foreground/90">
                        {singleResp.content || "(streaming…)"}
                      </pre>
                      {singleResp.raw && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">Raw</summary>
                          <pre className="mt-2 max-h-[300px] overflow-auto rounded-lg border border-hairline bg-background p-4 font-mono text-[11px] leading-5 text-foreground/70">
                            {JSON.stringify(singleResp.raw, null, 2)}
                          </pre>
                        </details>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              {/* --- CODE EXPORT --- */}
              <TabsContent value="code" className="mt-0">
                <div className="rounded-2xl border border-hairline bg-surface/40 p-5">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Code for current request
                  </h3>
                  <p className="mt-1 text-[12.5px] text-foreground/55">
                    Reflects every parameter and the current chat / single message.
                  </p>
                  <div className="mt-4">
                    <CodeTabs snippets={codeSnippets} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatBubble({
  msg, onChange, onChangeRole, onDelete,
}: {
  msg: Msg;
  onChange: (c: string) => void;
  onChangeRole: (r: Role) => void;
  onDelete: () => void;
}) {
  const colors: Record<Role, string> = {
    system: "border-warning/30 bg-warning/5",
    user: "border-brand/30 bg-brand/5",
    assistant: "border-hairline bg-background",
  };
  return (
    <div className={"group rounded-lg border p-3 " + colors[msg.role]}>
      <div className="mb-2 flex items-center justify-between">
        <select
          value={msg.role}
          onChange={(e) => onChangeRole(e.target.value as Role)}
          className="rounded-md border border-hairline bg-background px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider"
        >
          <option value="system">system</option>
          <option value="user">user</option>
          <option value="assistant">assistant</option>
        </select>
        <button
          onClick={onDelete}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          title="Remove turn"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <textarea
        value={msg.content}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(8, Math.max(1, msg.content.split("\n").length))}
        className="w-full resize-none bg-transparent font-mono text-[12.5px] leading-6 outline-none"
        placeholder={msg.role === "assistant" ? "Assistant response…" : "Message…"}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Num({ v, on, ph }: { v: string; on: (v: string) => void; ph: string }) {
  return (
    <input
      value={v}
      onChange={(e) => on(e.target.value)}
      placeholder={ph}
      className="w-full rounded-md border border-hairline bg-background px-2 py-1.5 font-mono text-[12.5px] focus:border-brand focus:outline-none"
    />
  );
}
