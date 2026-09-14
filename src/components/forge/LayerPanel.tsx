import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Stamp } from "lucide-react";
import { GROUPS, SLOTS, SLOT_BY_ID } from "@/lib/forge/slots";
import { STAMP_HINT, type StampAxis } from "@/lib/forge/stamp";
import { useForge, type SlotDraft } from "@/lib/forge/store";
import { cn } from "@/lib/utils";
import { SolidList } from "./SolidList";

function filledCount(id: string, current: string, solidsLen: number, draft: Record<string, SlotDraft>) {
  if (id === current) return solidsLen;
  return draft[id]?.solids.length ?? 0;
}

export function LayerPanel() {
  const leftTab = useForge((s) => s.leftTab);
  const setLeftTab = useForge((s) => s.setLeftTab);
  const slot = useForge((s) => s.slot);
  const solids = useForge((s) => s.solids);
  const kitDraft = useForge((s) => s.kitDraft);
  const stampSlot = useForge((s) => s.stampSlot);
  const stampAxis = useForge((s) => s.stampAxis);
  const setSlot = useForge((s) => s.setSlot);
  const setStampSlot = useForge((s) => s.setStampSlot);
  const setStampAxis = useForge((s) => s.setStampAxis);
  const stampCut = useForge((s) => s.stampCut);
  const group = SLOT_BY_ID[slot]?.group;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.id, true])),
  );

  const hint = STAMP_HINT[slot];

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of SLOTS) out[s.id] = filledCount(s.id, slot, solids.length, kitDraft);
    return out;
  }, [slot, solids.length, kitDraft]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-border">
        {(["kit", "solids"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            title={tab === "kit" ? "Outline (`)" : "Solids (`)"}
            onClick={() => setLeftTab(tab)}
            className={cn(
              "flex-1 py-2 font-display text-2xs font-semibold uppercase tracking-[0.14em]",
              leftTab === tab ? "bg-surface text-fg" : "text-muted hover:text-fg",
            )}
          >
            {tab === "kit" ? "Outline" : "Solids"}
          </button>
        ))}
      </div>

      {leftTab === "solids" ? (
        <SolidList />
      ) : (
        <>
          <div className="shrink-0 border-b border-border px-3 py-2">
            <div className="font-mono text-2xs uppercase tracking-wider text-subtle">Current</div>
            <div className="mt-0.5 truncate text-sm text-fg">{SLOT_BY_ID[slot]?.label ?? slot}</div>
            <div className="mt-2 flex items-center gap-1">
              {(["x", "y", "z"] as StampAxis[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setStampAxis(a)}
                  className={cn(
                    "h-6 w-7 rounded-sm font-mono text-2xs uppercase",
                    stampAxis === a ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
                  )}
                >
                  {a}
                </button>
              ))}
              <button
                type="button"
                onClick={() => stampCut()}
                className="ml-auto flex h-6 items-center gap-1 rounded-sm bg-surface px-2 font-mono text-2xs text-fg hover:bg-border"
                title="Bake cutter silhouette into this slot"
              >
                <Stamp className="size-3" /> Stamp
              </button>
            </div>
            <div className="mt-1 font-mono text-[10px] text-subtle">
              Cutter {stampSlot ?? hint?.cutter ?? "—"} · {stampAxis} axis · bake
            </div>
          </div>
          <ul className="panel-scroll min-h-0 flex-1 overflow-y-auto py-1">
            {GROUPS.map((g) => {
              const slots = SLOTS.filter((s) => s.group === g.id);
              const expanded = open[g.id] ?? g.id === group;
              const here = g.id === group;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [g.id]: !expanded }))}
                    className={cn(
                      "flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs",
                      here ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    <span className="font-display text-2xs font-semibold uppercase tracking-[0.12em]">{g.label}</span>
                    {here ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}
                  </button>
                  {expanded
                    ? slots.map((s) => {
                        const n = counts[s.id] ?? 0;
                        const active = s.id === slot;
                        const cutter = s.id === stampSlot;
                        return (
                          <div key={s.id} className="flex items-center pl-5 pr-1">
                            <button
                              type="button"
                              onClick={() => setSlot(s.id)}
                              className={cn(
                                "flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1 text-left text-xs",
                                active ? "bg-surface text-fg" : "text-muted hover:bg-surface/60 hover:text-fg",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">{s.label}</span>
                              {n > 0 ? (
                                <span className="font-mono text-[10px] text-subtle">{n}</span>
                              ) : (
                                <span className="size-1 rounded-full bg-border" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Use outline as stamp cutter"
                              onClick={() => setStampSlot(cutter ? null : s.id)}
                              className={cn(
                                "flex size-6 items-center justify-center rounded-sm",
                                cutter ? "text-primary" : "text-subtle hover:text-fg",
                              )}
                            >
                              <Stamp className="size-3" />
                            </button>
                          </div>
                        );
                      })
                    : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
