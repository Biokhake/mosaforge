import { useMemo, useRef, useState } from "react";
import { Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ingestFiles } from "@/lib/forge/pack";
import { useForge } from "@/lib/forge/store";
import { cn } from "@/lib/utils";

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const catalog = useForge((s) => s.catalog);
  const library = useForge((s) => s.library);
  const packReady = useForge((s) => s.packReady);
  const slot = useForge((s) => s.slot);
  const kit = useForge((s) => s.kit());
  const loadLibraryItem = useForge((s) => s.loadLibraryItem);
  const deleteLibraryItem = useForge((s) => s.deleteLibraryItem);
  const saveToLibrary = useForge((s) => s.saveToLibrary);
  const importParts = useForge((s) => s.importParts);
  const loadPackFor = useForge((s) => s.loadPackFor);

  const [tab, setTab] = useState<"pack" | "mine">("pack");
  const [kitFilter, setKitFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const kits = useMemo(() => {
    const set = new Set(catalog.map((x) => x.kit));
    return [...set].sort();
  }, [catalog]);

  const parts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((x) => {
      if (kitFilter && x.kit !== kitFilter) return false;
      if (!q) return true;
      return (
        x.name.toLowerCase().includes(q) ||
        x.slot.toLowerCase().includes(q) ||
        x.kit.toLowerCase().includes(q)
      );
    });
  }, [catalog, kitFilter, query]);

  const currentPack = catalog.find((x) => x.slot === slot && x.kit === kit);

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

      <div className="flex gap-1 border-b border-border p-2">
        <button
          type="button"
          onClick={() => setTab("pack")}
          className={cn(
            "flex-1 rounded-sm py-1.5 font-mono text-2xs uppercase",
            tab === "pack" ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
          )}
        >
          Pack {packReady ? catalog.length : "…"}
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={cn(
            "flex-1 rounded-sm py-1.5 font-mono text-2xs uppercase",
            tab === "mine" ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
          )}
        >
          Mine {library.length}
        </button>
      </div>

      <div className="space-y-2 border-b border-border p-2">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={saveToLibrary}>
            Save current
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
            title="Import zip or JSON pack"
          >
            <Upload className="size-3.5" /> Zip / JSON
          </Button>
        </div>
        {tab === "pack" && currentPack ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => loadPackFor(slot, kit)}
          >
            Load {slot} · {kit}
          </Button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept=".json,.zip,application/json,application/zip"
          multiple
          className="hidden"
          onChange={async (e) => {
            const list = [...(e.target.files ?? [])];
            e.target.value = "";
            if (!list.length) return;
            const parts = await ingestFiles(list);
            importParts(parts);
            setTab("pack");
          }}
        />
      </div>

      {tab === "pack" ? (
        <>
          <div className="border-b border-border px-2 py-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter slot, kit, name"
              className="h-8 w-full rounded-sm border border-border bg-elevated px-2 text-xs text-fg outline-none ring-ring focus:ring-1"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setKitFilter(null)}
                className={cn(
                  "rounded-sm px-1.5 py-1 font-mono text-2xs",
                  !kitFilter ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
                )}
              >
                All
              </button>
              {kits.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKitFilter(k === kitFilter ? null : k)}
                  className={cn(
                    "rounded-sm px-1.5 py-1 font-mono text-2xs",
                    kitFilter === k ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <ul className="panel-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {!packReady ? (
              <li className="px-2 py-6 text-center text-xs text-muted">Loading kit pack…</li>
            ) : parts.length === 0 ? (
              <li className="px-2 py-6 text-center text-xs text-muted">
                No pack parts. Import a zip of mosa-forge-part JSON.
              </li>
            ) : (
              parts.map((item) => (
                <li key={item.id} className="mb-1">
                  <button
                    type="button"
                    className="w-full rounded-sm bg-surface px-2 py-1.5 text-left hover:bg-border"
                    onClick={() => loadLibraryItem(item.id)}
                  >
                    <div className="truncate text-xs text-fg">{item.name}</div>
                    <div className="font-mono text-2xs text-subtle">
                      {item.slot} · {item.kit} · {item.solids.length}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <ul className="panel-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
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
      )}
    </div>
  );
}