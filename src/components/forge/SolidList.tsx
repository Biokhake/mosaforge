import { Copy, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MATS, SHAPES } from "@/lib/forge/types";
import { seedsForSlot } from "@/lib/forge/templates";
import { useForge } from "@/lib/forge/store";
import { cn } from "@/lib/utils";

export function SolidList() {
  const solids = useForge((s) => s.solids);
  const selectedId = useForge((s) => s.selectedId);
  const slot = useForge((s) => s.slot);
  const select = useForge((s) => s.select);
  const addSolid = useForge((s) => s.addSolid);
  const removeSelected = useForge((s) => s.removeSelected);
  const duplicateSelected = useForge((s) => s.duplicateSelected);
  const updateSolid = useForge((s) => s.updateSolid);
  const seed = useForge((s) => s.seed);
  const seeds = seedsForSlot(slot);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-3 py-2">
        <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Solids
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              onClick={() => addSolid(sh.id)}
              className="rounded-sm border border-border px-1.5 py-1 font-mono text-2xs text-muted hover:bg-surface hover:text-fg"
              title={`Add ${sh.label}`}
            >
              {sh.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="mb-1.5 font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Seed
        </div>
        <div className="flex flex-wrap gap-1">
          {seeds.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => seed(s.id)}
              className="rounded-sm bg-surface px-1.5 py-1 text-2xs text-fg hover:bg-border"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="panel-scroll min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {solids.map((s, i) => {
          const mat = MATS.find((m) => m.id === s.m);
          const active = s.id === selectedId;
          return (
            <li key={s.id}>
              <div
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                  active ? "bg-surface" : "hover:bg-surface/60",
                  !s.visible && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => select(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: mat?.hex ?? "#888" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {s.name || `Solid ${i + 1}`}
                  </span>
                  <span className="font-mono text-2xs text-subtle">{s.t}</span>
                </button>
                <button
                  type="button"
                  className="text-subtle hover:text-fg"
                  onClick={() => updateSolid(s.id, { visible: !s.visible })}
                  aria-label={s.visible ? "Hide" : "Show"}
                >
                  {s.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
                <button
                  type="button"
                  className="text-subtle hover:text-fg"
                  onClick={() => updateSolid(s.id, { locked: !s.locked })}
                  aria-label={s.locked ? "Unlock" : "Lock"}
                >
                  {s.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-1 border-t border-border p-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => addSolid("box")}>
          <Plus className="size-3.5" /> Add
        </Button>
        <Button variant="ghost" size="iconSm" onClick={duplicateSelected} title="Duplicate">
          <Copy className="size-4" />
        </Button>
        <Button variant="ghost" size="iconSm" onClick={removeSelected} title="Delete">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
