import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { MODELS } from "@/lib/models";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models — LitProxy" },
      { name: "description", content: "All Lightning AI models available through the LitProxy gateway with token pricing." },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Models</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {MODELS.length} models available. Prices in USD per 1M tokens. Use the model id in your requests.
        </p>
        <div className="mt-8 overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Model ID</th>
                <th className="px-4 py-3">Context</th>
                <th className="px-4 py-3 text-right">Input</th>
                <th className="px-4 py-3 text-right">Output</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.provider}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.context}</td>
                  <td className="px-4 py-3 text-right text-primary">${m.inputPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-primary">${m.outputPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
