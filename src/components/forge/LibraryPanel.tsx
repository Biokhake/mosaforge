import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForge } from "@/lib/forge/store";

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const library = useForge((s) => s.library);
  const loadLibraryItem = useForge((s) => s.loadLibraryItem);
  const deleteLibraryItem = useForge((s) => s.deleteLibraryItem);
  const saveToLibrary = useForge((s) => s.saveToLibrary);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Library
        </div>
        <Button variant="ghost" size="iconSm" onClick={onClose} title="Back to edit">
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-2">
        <Button variant="outline" size="sm" className="w-full" onClick={saveToLibrary}>
          Save current
        </Button>
      </div>
      <ul className="panel-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {library.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted">No saved parts yet.</li>
        ) : (
          library.map((item) => (
            <li
              key={item.id}
              className="mb-1 flex items-center gap-2 rounded-sm bg-surface px-2 py-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => loadLibraryItem(item.id)}
              >
                <div className="truncate text-xs text-fg">{item.name}</div>
                <div className="font-mono text-2xs text-subtle">
                  {item.slot} · {item.kit} · {item.solids.length} solids
                </div>
              </button>
              <button
                type="button"
                className="text-subtle hover:text-signal"
                onClick={() => deleteLibraryItem(item.id)}
                aria-label="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
