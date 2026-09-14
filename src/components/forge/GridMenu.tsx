import { useEffect, useState } from "react";
import { useForge } from "@/lib/forge/store";

export function GridMenu() {
  const menu = useForge((s) => s.gridMenu);
  const grids = useForge((s) => s.grids);
  const setGridMenu = useForge((s) => s.setGridMenu);
  const setGridCell = useForge((s) => s.setGridCell);
  const toggleGrid = useForge((s) => s.toggleGrid);
  const [val, setVal] = useState("");

  useEffect(() => {
    if (!menu) return;
    setVal(String(grids[menu.axis].cell));
    const close = () => setGridMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu, grids, setGridMenu]);

  if (!menu) return null;
  const axis = menu.axis.toUpperCase();

  return (
    <div
      className="fixed z-50 min-w-40 overflow-hidden rounded-md border border-border bg-elevated p-2 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1 font-mono text-2xs uppercase text-muted">{axis} grid cell</div>
      <input
        type="number"
        min={0.002}
        step={0.002}
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setGridCell(menu.axis, Number(val) || 0.02);
            setGridMenu(null);
          }
          if (e.key === "Escape") setGridMenu(null);
        }}
        className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-xs text-fg"
      />
      <button
        type="button"
        onClick={() => {
          setGridCell(menu.axis, Number(val) || 0.02);
          setGridMenu(null);
        }}
        className="mt-1 w-full rounded-sm bg-surface py-1 font-mono text-2xs text-fg"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={() => {
          toggleGrid(menu.axis);
          setGridMenu(null);
        }}
        className="mt-1 w-full rounded-sm py-1 font-mono text-2xs text-muted hover:text-fg"
      >
        Hide {axis}
      </button>
    </div>
  );
}
