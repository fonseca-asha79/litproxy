import * as React from "react";
import { Check, ChevronsUpDown, Search, Sparkles } from "lucide-react";
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

interface Props {
  value: string;
  onChange: (id: string) => void;
  /** When provided, shows a "default" entry mapped to this id label. */
  defaultModelId?: string;
  /** Hide the "default" entry (e.g. on settings pages). */
  hideDefault?: boolean;
  className?: string;
  /** Optional placeholder when nothing meaningful selected. */
  placeholder?: string;
}

const ORDER: Provider[] = ["openai", "anthropic", "google", "lightning-ai"];

export function ModelPicker({
  value,
  onChange,
  defaultModelId,
  hideDefault,
  className,
  placeholder = "Select a model…",
}: Props) {
  const [open, setOpen] = React.useState(false);

  const grouped = React.useMemo(() => {
    const map: Record<Provider, ModelInfo[]> = {
      openai: [], anthropic: [], google: [], "lightning-ai": [],
    };
    for (const m of MODELS) map[m.provider].push(m);
    return map;
  }, []);

  const selected = MODELS.find((m) => m.id === value);
  const isDefault = value === "default";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg border border-hairline bg-background px-3 py-2.5 text-left text-[13px] shadow-sm",
            "transition-colors hover:border-foreground/30 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40",
            className,
          )}
        >
          {isDefault ? (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/15 text-brand">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">Account default</div>
                <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                  {defaultModelId || "uses dashboard default"}
                </div>
              </div>
            </>
          ) : selected ? (
            <>
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  PROVIDER_DOT[selected.provider],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{selected.name}</div>
                <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                  {selected.id}
                </div>
              </div>
              <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                {selected.context}
              </span>
            </>
          ) : (
            <span className="flex-1 text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
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
          <div className="flex items-center gap-2 border-b border-hairline px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder="Search models, e.g. opus, gemini, 70b…"
              className="h-10 border-0 px-0 text-[13px] focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[420px]">
            <CommandEmpty className="py-8 text-center text-[12.5px] text-muted-foreground">
              No model matches.
            </CommandEmpty>

            {!hideDefault && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="default account default"
                    onSelect={() => {
                      onChange("default");
                      setOpen(false);
                    }}
                    className="gap-3 rounded-md px-2 py-2.5 aria-selected:bg-accent/60"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/15 text-brand">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">Account default</div>
                      <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                        {defaultModelId || "uses dashboard default"}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 text-brand",
                        isDefault ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {ORDER.map((prov, i) => {
              const items = grouped[prov];
              if (!items.length) return null;
              return (
                <React.Fragment key={prov}>
                  {i > 0 && <CommandSeparator />}
                  <CommandGroup
                    heading={
                      <span className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", PROVIDER_DOT[prov])} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {PROVIDER_LABEL[prov]}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">
                          {items.length}
                        </span>
                      </span>
                    }
                  >
                    {items.map((m) => {
                      const active = value === m.id;
                      return (
                        <CommandItem
                          key={m.id}
                          value={`${m.name} ${m.id}`}
                          onSelect={() => {
                            onChange(m.id);
                            setOpen(false);
                          }}
                          className="items-start gap-3 rounded-md px-2 py-2 aria-selected:bg-accent/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[13px] font-medium leading-5">
                                {m.name}
                              </span>
                              <span className="rounded-sm bg-surface-2 px-1.5 py-px font-mono text-[9.5px] leading-4 text-muted-foreground">
                                {m.context}
                              </span>
                            </div>
                            <div className="truncate font-mono text-[10.5px] leading-4 text-muted-foreground">
                              {m.id}
                            </div>
                          </div>
                          <div className="hidden shrink-0 text-right font-mono text-[10px] leading-4 text-muted-foreground sm:block">
                            <div>${m.inputPrice.toFixed(2)} in</div>
                            <div>${m.outputPrice.toFixed(2)} out</div>
                          </div>
                          <Check
                            className={cn(
                              "mt-1 h-3.5 w-3.5 shrink-0 text-brand",
                              active ? "opacity-100" : "opacity-0",
                            )}
                          />
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
  );
}
