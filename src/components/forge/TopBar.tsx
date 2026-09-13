import { useRef } from "react";
import {
  Camera,
  FolderOpen,
  Library,
  Moon,
  Redo2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sun,
  Undo2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadJson } from "@/lib/forge/io";
import { ingestFiles } from "@/lib/forge/pack";
import { lettersFor, QUADS } from "@/lib/forge/types";
import { GROUPS, SLOTS } from "@/lib/forge/slots";
import { useForge } from "@/lib/forge/store";
import { cn } from "@/lib/utils";

export function TopBar({ onSnap }: { onSnap: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const name = useForge((s) => s.name);
  const slot = useForge((s) => s.slot);
  const quad = useForge((s) => s.quad);
  const letter = useForge((s) => s.letter);
  const theme = useForge((s) => s.theme);
  const kit = useForge((s) => s.kit());
  const mobilePanel = useForge((s) => s.mobilePanel);
  const setName = useForge((s) => s.setName);
  const setSlot = useForge((s) => s.setSlot);
  const setQuad = useForge((s) => s.setQuad);
  const setLetter = useForge((s) => s.setLetter);
  const undo = useForge((s) => s.undo);
  const redo = useForge((s) => s.redo);
  const reset = useForge((s) => s.reset);
  const canUndo = useForge((s) => s.past.length > 0);
  const canRedo = useForge((s) => s.future.length > 0);
  const exportJson = useForge((s) => s.exportJson);
  const importJson = useForge((s) => s.importJson);
  const importParts = useForge((s) => s.importParts);
  const loadPackFor = useForge((s) => s.loadPackFor);
  const packReady = useForge((s) => s.packReady);
  const catalog = useForge((s) => s.catalog);
  const saveToLibrary = useForge((s) => s.saveToLibrary);
  const setTheme = useForge((s) => s.setTheme);
  const setMobilePanel = useForge((s) => s.setMobilePanel);
  const flash = useForge((s) => s.flash);

  const letters = lettersFor(quad);
  const libraryOpen = mobilePanel === "library";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-elevated px-3">
      <div className="flex min-w-0 items-center gap-2">
        <img
          src="/mosa-forge.png"
          alt="MOSA FORGE"
          className={cn("h-6 w-auto shrink-0", theme === "dark" && "invert")}
        />
        <span className="hidden h-4 w-px bg-border sm:block" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-44 shrink-0 truncate rounded-sm bg-transparent px-1.5 text-sm text-fg outline-none ring-ring focus:ring-1"
          aria-label="Part name"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="h-8 max-w-32 rounded-sm border border-border bg-elevated px-1.5 font-mono text-2xs text-fg"
          aria-label="Slot"
        >
          {GROUPS.map((g) => (
            <optgroup key={g.id} label={g.label}>
              {SLOTS.filter((s) => s.group === g.id).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="hidden items-center rounded-sm border border-border md:flex">
          {QUADS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setQuad(q.id)}
              title={q.hint}
              className={cn(
                "h-8 px-2 font-mono text-2xs",
                quad === q.id ? "bg-primary text-primary-foreground" : "text-muted hover:text-fg",
              )}
            >
              {q.id}
            </button>
          ))}
        </div>

        <select
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          className="h-8 rounded-sm border border-border bg-elevated px-1.5 font-mono text-2xs text-fg"
          aria-label="Kit letter"
        >
          {letters.split("").map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => loadPackFor(slot, kit)}
          disabled={!packReady || !catalog.some((x) => x.slot === slot && x.kit === kit)}
          title="Load pack part for this slot + kit"
          className="hidden font-mono text-2xs text-subtle hover:text-fg disabled:opacity-40 lg:inline"
        >
          {kit}
        </button>

        <span className="hidden h-4 w-px bg-border sm:block" />

        <Button variant="ghost" size="iconSm" onClick={undo} disabled={!canUndo} title="Undo">
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="iconSm" onClick={redo} disabled={!canRedo} title="Redo">
          <Redo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="iconSm" onClick={reset} title="Reset seed">
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={saveToLibrary}
          title="Save to library"
          className="hidden sm:inline-flex"
        >
          <Save className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => setMobilePanel(libraryOpen ? null : "library")}
          title="Library"
          className={libraryOpen ? "bg-surface" : undefined}
        >
          <Library className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => setMobilePanel(null)}
          title="Edit panel"
          className={!libraryOpen ? "bg-surface" : undefined}
        >
          <SlidersHorizontal className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => {
            downloadJson(
              `${name.replace(/\s+/g, "-").toLowerCase() || "part"}.json`,
              exportJson(),
            );
            flash("JSON exported");
          }}
          title="Export JSON"
        >
          <Upload className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => fileRef.current?.click()}
          title="Import JSON or zip pack"
        >
          <FolderOpen className="size-4" />
        </Button>
        <Button variant="ghost" size="iconSm" onClick={onSnap} title="Snapshot PNG">
          <Camera className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() => {
            const next = theme === "dark" ? "light" : "dark";
            setTheme(next);
            document.documentElement.classList.toggle("theme-dark", next === "dark");
            document.documentElement.classList.toggle("theme-light", next === "light");
          }}
          title="Theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
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
            if (!parts.length) {
              useForge.getState().flash("No MOSA Forge parts in file");
              return;
            }
            if (parts.length === 1) {
              importJson(parts[0]);
              return;
            }
            importParts(parts);
            setMobilePanel("library");
          }}
        />
      </div>
    </header>
  );
}
