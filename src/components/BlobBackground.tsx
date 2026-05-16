import { cn } from "@/lib/utils";

interface BlobBackgroundProps {
  className?: string;
  /** When true, blobs are fixed to the viewport (full page). Default: absolute to parent. */
  fixed?: boolean;
}

/**
 * Animated, glassmorphism-friendly blurred color blobs.
 * Render as the first child of a `relative` container, or pass `fixed` for full-page.
 */
export function BlobBackground({ className, fixed = false }: BlobBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden",
        fixed ? "fixed inset-0 -z-10" : "absolute inset-0",
        className,
      )}
    >
      {/* Mint primary */}
      <div
        className="blob absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full opacity-40 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.85 0.18 165 / 0.75), transparent 65%)",
          filter: "blur(90px)",
          animation: "lp-blob-a 22s ease-in-out infinite",
        }}
      />
      {/* Cyan/teal */}
      <div
        className="blob absolute top-1/3 -right-32 h-[600px] w-[600px] rounded-full opacity-35 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, oklch(0.78 0.16 200 / 0.7), transparent 65%)",
          filter: "blur(110px)",
          animation: "lp-blob-b 28s ease-in-out infinite",
        }}
      />
      {/* Violet/indigo */}
      <div
        className="blob absolute bottom-[-180px] left-1/3 h-[560px] w-[560px] rounded-full opacity-30 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.70 0.20 295 / 0.7), transparent 65%)",
          filter: "blur(100px)",
          animation: "lp-blob-c 32s ease-in-out infinite",
        }}
      />
      {/* Subtle warm accent */}
      <div
        className="blob absolute top-[20%] left-[40%] h-[380px] w-[380px] rounded-full opacity-20 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.80 0.15 30 / 0.6), transparent 70%)",
          filter: "blur(90px)",
          animation: "lp-blob-d 26s ease-in-out infinite",
        }}
      />
      {/* Grain / noise to break the gradient banding (very faint) */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
