import { Component, useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { Box, Layers, SlidersHorizontal } from "lucide-react";
import { ForgeCanvas } from "./ForgeCanvas";
import { Inspector } from "./Inspector";
import { LibraryPanel } from "./LibraryPanel";
import { LayerPanel } from "./LayerPanel";
import { ToolRail } from "./ToolRail";
import { ContextMenu } from "./ContextMenu";
import { GridMenu } from "./GridMenu";
import { TopBar } from "./TopBar";
import { Button } from "@/components/ui/button";
import { hydrateForgeFromStorage, useForge } from "@/lib/forge/store";

type CaptureRef = MutableRefObject<(() => void) | null>;

class ViewportBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "viewport error" };
  }
  render() {
    if (this.state.message) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-bg px-6 text-center text-sm text-muted">
          Viewport failed — {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function Viewport({ captureRef }: { captureRef: CaptureRef }) {
  return (
    <ViewportBoundary>
      <div className="absolute inset-0">
        <ForgeCanvas captureRef={captureRef} />
      </div>
    </ViewportBoundary>
  );
}

export function ForgeApp() {
  const captureRef = useRef<(() => void) | null>(null);
  const mobilePanel = useForge((s) => s.mobilePanel);
  const setMobilePanel = useForge((s) => s.setMobilePanel);
  const setMode = useForge((s) => s.setMode);
  const setTool = useForge((s) => s.setTool);
  const undo = useForge((s) => s.undo);
  const redo = useForge((s) => s.redo);
  const duplicateSelected = useForge((s) => s.duplicateSelected);
  const removeSelected = useForge((s) => s.removeSelected);
  const cropSelected = useForge((s) => s.cropSelected);
  const mergeSelected = useForge((s) => s.mergeSelected);
  const flipSelected = useForge((s) => s.flipSelected);
  const cycleGrid = useForge((s) => s.cycleGrid);
  const toast = useForge((s) => s.toast);
  const solids = useForge((s) => s.solids);
  const slot = useForge((s) => s.slot);
  const tool = useForge((s) => s.tool);
  const setSpace = useForge((s) => s.setSpace);

  useEffect(() => {
    hydrateForgeFromStorage();
    void useForge.getState().bootPacks();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (!e.repeat) setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpace(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", () => setSpace(false));
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setSpace]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key;
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (k === "Delete" || k === "Backspace") {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (k === "Tab") {
        e.preventDefault();
        cycleGrid();
        return;
      }
      if (e.shiftKey && (k === "h" || k === "H")) {
        e.preventDefault();
        flipSelected(0);
        return;
      }
      if (k === "v" || k === "V") {
        if (e.shiftKey) {
          e.preventDefault();
          flipSelected(1);
          return;
        }
        setTool("v");
        return;
      }
      if (k === "a" || k === "A") {
        setTool("a");
        return;
      }
      if (k === "+" || k === "=") {
        e.preventDefault();
        setTool("plus");
        return;
      }
      if (k === "-" || k === "_") {
        e.preventDefault();
        setTool("minus");
        return;
      }
      if (k === "c" || k === "C") {
        if (e.shiftKey) {
          e.preventDefault();
          setTool("shiftc");
          return;
        }
        setTool("c");
        if (useForge.getState().selectedIds.length >= 2) cropSelected();
        return;
      }
      if (k === "u" || k === "U") {
        mergeSelected();
        return;
      }
      if (k === "g" || k === "G" || k === "1") setMode("translate");
      if (k === "r" || k === "R" || k === "2") setMode("rotate");
      if (k === "s" || k === "S" || k === "3") setMode("scale");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicateSelected, removeSelected, setMode, setTool, cropSelected, mergeSelected, flipSelected, cycleGrid]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <TopBar onSnap={() => captureRef.current?.()} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-elevated md:flex">
          <LayerPanel />
        </aside>

        <main className="relative min-w-0 flex-1">
          <Viewport captureRef={captureRef} />
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="pointer-events-auto absolute left-3 top-3">
              <ToolRail />
            </div>
            <div className="absolute left-14 top-3 rounded-md bg-elevated/80 px-2 py-1 font-mono text-2xs text-muted">
              {slot} · {solids.length} · {tool === "shiftc" ? "⇧C" : tool.toUpperCase()} · Tab=그리드
            </div>
          </div>
          {toast ? (
            <div className="forge-toast pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground md:bottom-4">
              {toast}
            </div>
          ) : null}
        </main>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-elevated md:flex">
          {mobilePanel === "library" ? (
            <LibraryPanel onClose={() => setMobilePanel(null)} />
          ) : (
            <Inspector />
          )}
        </aside>
      </div>

      <nav className="flex h-14 items-center justify-around border-t border-border bg-elevated px-2 md:hidden">
        <Button variant="ghost" size="sm" onClick={() => setMobilePanel("solids")}>
          <Layers className="size-4" /> Solids
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMobilePanel("inspect")}>
          <SlidersHorizontal className="size-4" /> Inspect
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMobilePanel("library")}>
          <Box className="size-4" /> Library
        </Button>
      </nav>

      {mobilePanel && mobilePanel !== "library" ? (
        <div className="absolute inset-0 z-20 flex md:hidden">
          <button
            type="button"
            className="flex-1 bg-bg/60"
            aria-label="Close panel"
            onClick={() => setMobilePanel(null)}
          />
          <div className="h-full w-[min(100%,320px)] bg-elevated">
            {mobilePanel === "solids" ? <LayerPanel /> : null}
            {mobilePanel === "inspect" ? <Inspector /> : null}
          </div>
        </div>
      ) : null}

      {mobilePanel === "library" ? (
        <div className="absolute inset-0 z-20 flex md:hidden">
          <button
            type="button"
            className="flex-1 bg-bg/60"
            aria-label="Close panel"
            onClick={() => setMobilePanel(null)}
          />
          <div className="h-full w-[min(100%,320px)] bg-elevated">
            <LibraryPanel onClose={() => setMobilePanel(null)} />
          </div>
        </div>
      ) : null}
      <ContextMenu />
      <GridMenu />
    </div>
  );
}
