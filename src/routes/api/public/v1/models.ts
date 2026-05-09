import { createFileRoute } from "@tanstack/react-router";
import { MODELS } from "@/lib/models";

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            object: "list",
            data: MODELS.map((m) => ({
              id: m.id,
              object: "model",
              owned_by: m.provider,
              name: m.name,
              context: m.context,
              pricing: { input_per_1m: m.inputPrice, output_per_1m: m.outputPrice },
            })),
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      },
    },
  },
});
