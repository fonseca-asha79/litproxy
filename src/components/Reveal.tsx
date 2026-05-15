import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "fade-up" | "fade-in" | "scale-in" | "blur-in";

const variantClass: Record<Variant, string> = {
  "fade-up": "anim-fade-up",
  "fade-in": "anim-fade-in",
  "scale-in": "anim-scale-in",
  "blur-in": "anim-blur-in",
};

interface RevealProps {
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  variant?: Variant;
  delay?: number;
  className?: string;
  once?: boolean;
}

/** Wraps children and plays an entrance animation when scrolled into view. */
export function Reveal({
  children,
  as: Tag = "div",
  variant = "fade-up",
  delay = 0,
  className,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  const style: CSSProperties = shown
    ? { animationDelay: `${delay}ms` }
    : { opacity: 0 };

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={ref as never}
      className={cn(shown && variantClass[variant], className)}
      style={style}
    >
      {children}
    </Component>
  );
}
