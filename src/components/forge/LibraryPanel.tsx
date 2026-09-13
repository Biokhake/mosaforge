import { useMemo, useRef, useState } from "react";
import { Download, FileText, FolderOpen, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadHangarBrief } from "@/lib/forge/io";
import { BUILTIN_PACK_ID, filesFromDrop, ingestBatches } from "@/lib/forge/pack";
import { useForge } from "@/lib/forge/store";
import { cn } from "@/lib/utils";

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const catalog = useForge((s) => s.catalog);
  const packs = useForge((s) => s.packs);
  const library = useForge((s) => s.library);
  const packReady = useForge((s) => s.packReady);
  const packBusy = useForge((s) => s.packBusy);
  const slot = useForge((s) => s.slot);
  const kit = useForge((s) => s.kit());
  const loadLibraryItem = useForge((s) => s.loadLibraryItem);
  const deleteLibraryItem = useForge((s) => s.deleteLibraryItem);
  const saveToLibrary = useForge((s) => s.saveToLibrary);
  const registerPack = useForge((s) => s.registerPack);
  const removePack = useForge((s) => s.removePack);
  const exportPack = useForge((s) => s.exportPack);
  const loadPackFor = useForge((s) => s.loadPackFor);
  const exportHangarKit = useForge((s) => s.exportHangarKit);
  const flash = useForge((s) => s.flash);

  const [tab, setTab] = useState<"pack" | "mine">("pack");
  const [kitFilter, setKitFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);

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

  const registerFiles = async (list: File[]) => {
    if (!list.length) return;
    const batches = await ingestBatches(list);
    if (!batches.length) {
      flash("No MOSA Forge parts in file");
      return;
    }
    for (const batch of batches) await registerPack(batch.name, batch.files);
    setTab("pack");
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        const list = await filesFromDrop(e.dataTransfer);
        await registerFiles(list);
      }}
    >
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "w-full rounded-sm border border-dashed px-2 py-3 text-center text-2xs",
            dragOver
              ? "border-primary bg-primary/10 text-fg"
              : "border-border text-muted hover:border-ring hover:text-fg",
          )}
        >
          {packBusy ? "Registering…" : "Drop zip / JSON / folder to register"}
        </button>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={saveToLibrary}>
            Save current
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            title="Register zip or JSON"
          >
            <Upload className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dirRef.current?.click()}
            title="Register folder of JSON"
          >
            <FolderOpen className="size-3.5" />
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
        {tab === "pack" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => exportHangarKit(kitFilter ?? kit)}
              title="Hangar save JSON for mosa.grok.me Import"
            >
              Export {kitFilter ?? kit} → MOSA
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                try {
                  await downloadHangarBrief();
                  flash("Hangar brief downloaded");
                } catch {
                  flash("Hangar brief missing");
                }
              }}
              title="MOSA-HANGAR.md — paste into the hangar bot"
            >
              <FileText className="mr-1 size-3.5" />
              Hangar brief MD
            </Button>
          </>
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
            await registerFiles(list);
          }}
        />
        <input
          ref={dirRef}
          type="file"
          multiple
          className="hidden"
          {...{ webkitdirectory: "", directory: "" }}
          onChange={async (e) => {
            const list = [...(e.target.files ?? [])];
            e.target.value = "";
            await registerFiles(list);
          }}
        />
      </div>

      {tab === "pack" ? (
        <>
          <ul className="border-b border-border px-2 py-2">
            {packs.map((pack) => (
              <li key={pack.id} className="mb-1 flex items-center gap-1 rounded-sm bg-surface px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-fg">{pack.name}</div>
                  <div className="font-mono text-2xs text-subtle">
                    {pack.files.length} parts{pack.builtin ? " · built-in" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-subtle hover:text-fg"
                  title="Export zip"
                  onClick={() => exportPack(pack.id)}
                >
                  <Download className="size-3.5" />
                </button>
                {!pack.builtin && pack.id !== BUILTIN_PACK_ID ? (
                  <button
                    type="button"
                    className="text-subtle hover:text-signal"
                    title="Remove pack"
                    onClick={() => void removePack(pack.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
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
                Drop a zip of mosa-forge-part JSON to register a pack.
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
