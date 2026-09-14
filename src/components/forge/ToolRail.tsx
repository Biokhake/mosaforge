import { Crop, Minus, MousePointer2, Plus, Pyramid, Scissors, Spline } from "lucide-react";
import { useForge } from "@/lib/forge/store";
import type { EditTool } from "@/lib/forge/types";
import { GRID_COLORS, type GridAxis } from "@/lib/forge/snap";
import { cn } from "@/lib/utils";

const TOOLS: { id: EditTool; key: string; label: string; icon: typeof MousePointer2 }[] = [
  { id: "v", key: "V", label: "Select", icon: MousePointer2 },
  { id: "a", key: "A", label: "Anchors", icon: Spline },
  { id: "plus", key: "+", label: "Add anchor", icon: Plus },
  { id: "minus", key: "−", label: "Delete anchor", icon: Minus },
  { id: "b", key: "B", label: "Face bulge", icon: Pyramid },
  { id: "c", key: "C", label: "Crop", icon: Scissors },
];

const AXES: GridAxis[] = ["x", "y", "z"];

export function ToolRail() {
  const tool = useForge((s) => s.tool);
  const setTool = useForge((s) => s.setTool);
  const mergeSelected = useForge((s) => s.mergeSelected);
  const cropSelected = useForge((s) => s.cropSelected);
  const selectedIds = useForge((s) => s.selectedIds);
  const grids = useForge((s) => s.grids);
  const gridDraft = useForge((s) => s.gridDraft);
  const setGridDraft = useForge((s) => s.setGridDraft);
  const toggleGrid = useForge((s) => s.toggleGrid);
  const n = selectedIds.length;

  return (
    <div className="pointer-events-auto flex flex-col gap-0.5 rounded-md border border-border bg-elevated/95 p-1 shadow-sm">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const on = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.label} (${t.key})`}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm",
              on ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface hover:text-fg",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
      <div className="my-0.5 h-px bg-border" />
      <button
        type="button"
        title="Merge selected"
        disabled={n < 2}
        onClick={mergeSelected}
        className="flex size-8 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg disabled:opacity-30"
      >
        <span className="font-mono text-2xs">∪</span>
      </button>
      <button
        type="button"
        title="Crop — keep first, cut the rest"
        disabled={n < 2}
        onClick={cropSelected}
        className="flex size-8 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg disabled:opacity-30"
      >
        <Crop className="size-3.5" />
      </button>
      <div className="my-0.5 h-px bg-border" />
      <input
        type="number"
        min={0.002}
        step={0.002}
        value={gridDraft}
        title="Grid cell"
        onChange={(e) => setGridDraft(Number(e.target.value) || 0.02)}
        className="h-7 w-8 rounded-sm border border-border bg-bg px-0.5 text-center font-mono text-[9px] text-fg"
      />
      {AXES.map((axis) => {
        const on = grids[axis].on;
        return (
          <button
            key={axis}
            type="button"
            title={`${axis.toUpperCase()} grid · cell ${on ? grids[axis].cell : gridDraft}`}
            onClick={() => toggleGrid(axis)}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm font-mono text-2xs uppercase",
              on ? "text-primary-foreground" : "text-muted hover:bg-surface hover:text-fg",
            )}
            style={on ? { background: GRID_COLORS[axis] } : undefined}
          >
            {axis}
          </button>
        );
      })}
    </div>
  );
}
