import { Highlight, themes } from "prism-react-renderer";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export interface CodeSnippet {
  label: string;
  language: string;
  code: string;
}

export function CodeTabs({ snippets }: { snippets: CodeSnippet[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = snippets[active];

  const copy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-background">
      <div className="flex items-center justify-between border-b border-hairline bg-surface/60 px-2 py-1.5">
        <div className="flex flex-wrap gap-0.5">
          {snippets.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActive(i)}
              className={
                "rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors " +
                (i === active
                  ? "bg-background text-foreground"
                  : "text-foreground/55 hover:text-foreground")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11.5px] text-foreground/65 hover:bg-surface hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-brand" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <Highlight theme={themes.vsDark} code={current.code} language={current.language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={className + " overflow-x-auto p-4 font-mono text-[12px] leading-6"}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="mr-4 inline-block w-6 select-none text-right text-muted-foreground/40">
                  {i + 1}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

export function buildCurlSnippet(endpoint: string, key: string, model: string) {
  return `curl ${endpoint}/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;
}

export function buildRequestSnippets(endpoint: string, key: string, model = "default"): CodeSnippet[] {
  return [
    {
      label: "cURL",
      language: "bash",
      code: buildCurlSnippet(endpoint, key, model),
    },
    {
      label: "Python",
      language: "python",
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${endpoint}",
    api_key="${key}",
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)`,
    },
    {
      label: "Node.js",
      language: "javascript",
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${endpoint}",
  apiKey: "${key}",
});

const response = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Hello" }],
});
console.log(response.choices[0].message.content);`,
    },
    {
      label: "TypeScript",
      language: "typescript",
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${endpoint}",
  apiKey: "${key}",
});

const response = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user" as const, content: "Hello" }],
});
console.log(response.choices[0]?.message?.content);`,
    },
    {
      label: "Go",
      language: "go",
      code: `package main

import (
  "bytes"
  "fmt"
  "io"
  "net/http"
)

func main() {
  body := []byte(\`{"model":"${model}","messages":[{"role":"user","content":"Hello"}]}\`)
  req, _ := http.NewRequest("POST", "${endpoint}/chat/completions", bytes.NewBuffer(body))
  req.Header.Set("Authorization", "Bearer ${key}")
  req.Header.Set("Content-Type", "application/json")
  resp, _ := http.DefaultClient.Do(req)
  defer resp.Body.Close()
  out, _ := io.ReadAll(resp.Body)
  fmt.Println(string(out))
}`,
    },
    {
      label: "JSON",
      language: "json",
      code: `{
  "model": "${model}",
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}`,
    },
  ];
}
