import { useEffect } from "react";
import { useForge } from "@/lib/forge/store";

export function ContextMenu() {
  const menu = useForge((s) => s.contextMenu);
  const setContextMenu = useForge((s) => s.setContextMenu);
  const flipSelected = useForge((s) => s.flipSelected);
  const duplicateSelected = useForge((s) => s.duplicateSelected);
  const removeSelected = useForge((s) => s.removeSelected);
  const mergeSelected = useForge((s) => s.mergeSelected);
  const cropSelected = useForge((s) => s.cropSelected);
  const updateSolid = useForge((s) => s.updateSolid);
  const solids = useForge((s) => s.solids);
  const selectedIds = useForge((s) => s.selectedIds);
  const solid = solids.find((s) => s.id === menu?.id);

  useEffect(() => {
    if (!menu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    return () => {
      window.removeEventListener("click", close);
    };
  }, [menu, setContextMenu]);

  if (!menu || !solid) return null;
  const n = selectedIds.length;

  const item = (label: string, fn: () => void, enabled = true) => (
    <button
      type="button"
      disabled={!enabled}
      onClick={(e) => {
        e.stopPropagation();
        fn();
        setContextMenu(null);
      }}
      className="flex w-full px-3 py-1.5 text-left text-xs text-fg hover:bg-surface disabled:text-subtle"
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed z-50 min-w-40 overflow-hidden rounded-md border border-border bg-elevated py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {item("Duplicate", duplicateSelected)}
      <div className="my-1 h-px bg-border" />
      {item("Flip horizontal", () => flipSelected(0))}
      {item("Flip vertical", () => flipSelected(1))}
      {item("Flip depth", () => flipSelected(2))}
      <div className="my-1 h-px bg-border" />
      {item(solid.locked ? "Unlock" : "Lock", () => updateSolid(solid.id, { locked: !solid.locked }, true))}
      {item(solid.visible ? "Hide" : "Show", () => updateSolid(solid.id, { visible: !solid.visible }, true))}
      <div className="my-1 h-px bg-border" />
      {item("Merge ∪", mergeSelected, n >= 2)}
      {item("Crop −", cropSelected, n >= 2)}
      <div className="my-1 h-px bg-border" />
      {item("Delete", removeSelected)}
    </div>
  );
}
