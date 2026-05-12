import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { MODELS, type ModelInfo, type Provider } from "@/lib/models";
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "lightning-ai": "Lightning AI",
};

const PROVIDER_DOT: Record<Provider, string> = {
  openai: "bg-emerald-400",
  anthropic: "bg-orange-400",
  google: "bg-sky-400",
  "lightning-ai": "bg-violet-400",
};

const ORDER: Provider[] = ["openai", "anthropic", "google", "lightning-ai"];

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
  emptyLabel?: string;
}

export function ModelMultiPicker({
  value,
  onChange,
  className,
  emptyLabel = "All models allowed",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<Provider | "all">("all");

  const grouped = React.useMemo(() => {
    const map: Record<Provider, ModelInfo[]> = {
      openai: [], anthropic: [], google: [], "lightning-ai": [],
    };
    for (const m of MODELS) map[m.provider].push(m);
    return map;
  }, []);

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const toggleProvider = (p: Provider) => {
    const ids = grouped[p].map((m) => m.id);
    const allOn = ids.every((id) => selectedSet.has(id));
    if (allOn) onChange(value.filter((v) => !ids.includes(v)));
    else onChange(Array.from(new Set([...value, ...ids])));
  };

  const selectedDetails = React.useMemo(
    () => MODELS.filter((m) => selectedSet.has(m.id)),
    [selectedSet],
  );

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "group flex min-h-9 w-full items-center gap-2 rounded-md border border-hairline bg-background px-2.5 py-1.5 text-left text-[13px] shadow-sm",
              "transition-colors hover:border-foreground/30 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {selectedDetails.length === 0 ? (
                <span className="text-muted-foreground">{emptyLabel}</span>
              ) : (
                <>
                  {selectedDetails.slice(0, 3).map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 py-0.5 pl-1.5 pr-1 text-[11px] text-brand"
                    >
                      <span className={cn("h-1 w-1 rounded-full", PROVIDER_DOT[m.provider])} />
                      {m.name}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(m.id);
                        }}
                        className="grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-brand/20"
                      >
                        <X className="h-2.5 w-2.5" />
                      </span>
                    </span>
                  ))}
                  {selectedDetails.length > 3 && (
                    <span className="inline-flex items-center rounded-full border border-hairline bg-surface px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      +{selectedDetails.length - 3} more
                    </span>
                  )}
                </>
              )}
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-(--radix-popover-trigger-width) min-w-[360px] overflow-hidden rounded-xl border-hairline bg-popover/95 p-0 shadow-2xl backdrop-blur"
        >
          <Command
            filter={(itemValue, search) => {
              const v = itemValue.toLowerCase();
              const s = search.toLowerCase();
              return v.includes(s) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search models, e.g. opus, gemini, 70b…"
              className="h-10 text-[13px]"
            />
            <div className="flex flex-wrap items-center gap-1.5 border-b border-hairline px-3 py-2">
              {(["all", ...ORDER] as const).map((p) => {
                const active = filter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilter(p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      active
                        ? "border-brand/40 bg-brand/10 text-foreground"
                        : "border-hairline bg-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p !== "all" && (
                      <span className={cn("h-1.5 w-1.5 rounded-full", PROVIDER_DOT[p])} />
                    )}
                    {p === "all" ? "All" : PROVIDER_LABEL[p]}
                  </button>
                );
              })}
              <span className="ml-auto flex items-center gap-1.5 text-[11px]">
                {value.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(MODELS.map((m) => m.id))}
                  className="rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                >
                  All
                </button>
              </span>
            </div>

            <CommandList className="max-h-[420px]">
              <CommandEmpty className="py-8 text-center text-[12.5px] text-muted-foreground">
                No model matches.
              </CommandEmpty>
              {ORDER.map((prov, i) => {
                const items = grouped[prov];
                if (!items.length) return null;
                if (filter !== "all" && filter !== prov) return null;
                const allOn = items.every((m) => selectedSet.has(m.id));
                const someOn = !allOn && items.some((m) => selectedSet.has(m.id));
                return (
                  <React.Fragment key={prov}>
                    {i > 0 && <CommandSeparator />}
                    <CommandGroup
                      heading={
                        <div className="flex items-center justify-between gap-2 pr-1">
                          <span className="flex items-center gap-2">
                            <span className={cn("h-1.5 w-1.5 rounded-full", PROVIDER_DOT[prov])} />
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {PROVIDER_LABEL[prov]}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/60">
                              {items.length}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleProvider(prov);
                            }}
                            className="rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          >
                            {allOn ? "Deselect" : someOn ? "Select all" : "Select all"}
                          </button>
                        </div>
                      }
                    >
                      {items.map((m) => {
                        const active = selectedSet.has(m.id);
                        return (
                          <CommandItem
                            key={m.id}
                            value={`${m.name} ${m.id}`}
                            onSelect={() => toggle(m.id)}
                            className="items-center gap-3 rounded-md py-1.5 pl-5 pr-2 aria-selected:bg-accent/60"
                          >
                            <span
                              className={cn(
                                "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                                active
                                  ? "border-brand bg-brand text-primary-foreground"
                                  : "border-hairline bg-background",
                              )}
                            >
                              {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-medium leading-5">
                                {m.name}
                              </div>
                              <div className="truncate font-mono text-[10.5px] leading-4 text-muted-foreground">
                                {m.id}
                              </div>
                            </div>
                            <div className="hidden shrink-0 text-right font-mono text-[10px] text-muted-foreground sm:block">
                              ${m.inputPrice.toFixed(2)} / ${m.outputPrice.toFixed(2)}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </React.Fragment>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
