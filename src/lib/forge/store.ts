import { create } from "zustand";
import { SLOT_BY_ID } from "./slots";
import {
  cloneSolids,
  defaultSize,
  densityFor,
  kitId,
  segsFor,
  serialFor,
  uid,
  type GizmoMode,
  type LibraryItem,
  type Quad,
  type Shape,
  type Solid,
} from "./types";
import {
  loadLibrary,
  loadSession,
  parsePartFile,
  saveLibrary,
  saveSession,
  toPartFile,
  type SessionState,
} from "./io";
import { buildSeed, defaultSeedFor, seedsForSlot } from "./templates";

const HISTORY_CAP = 60;

function pickSelected(solids: Solid[]): string | null {
  return solids.find((s) => s.m === "prim")?.id ?? solids[0]?.id ?? null;
}

function persist(get: () => ForgeState) {
  const s = get();
  saveSession({
    name: s.name,
    slot: s.slot,
    quad: s.quad,
    letter: s.letter,
    solids: s.solids,
    selectedId: s.selectedId,
  });
}

export interface ForgeState {
  name: string;
  slot: string;
  quad: Quad;
  letter: string;
  solids: Solid[];
  selectedId: string | null;
  mode: GizmoMode;
  snap: number;
  showGrid: boolean;
  showGhost: boolean;
  showEdges: boolean;
  showSocket: boolean;
  theme: "dark" | "light";
  mobilePanel: null | "solids" | "inspect" | "library";
  library: LibraryItem[];
  past: Solid[][];
  future: Solid[][];
  dragging: boolean;
  toast: string | null;

  kit: () => string;
  selected: () => Solid | null;
  seed: (seedId?: string) => void;
  setSlot: (id: string) => void;
  setQuad: (q: Quad) => void;
  setLetter: (l: string) => void;
  setName: (n: string) => void;
  setMode: (m: GizmoMode) => void;
  setSnap: (n: number) => void;
  toggle: (k: "showGrid" | "showGhost" | "showEdges" | "showSocket") => void;
  setTheme: (t: "dark" | "light") => void;
  setMobilePanel: (p: ForgeState["mobilePanel"]) => void;
  setDragging: (d: boolean) => void;
  select: (id: string | null) => void;
  addSolid: (t: Shape) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  updateSolid: (id: string, patch: Partial<Solid>, record?: boolean) => void;
  replaceSolids: (solids: Solid[], record?: boolean) => void;
  applyBand: () => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  saveToLibrary: () => void;
  loadLibraryItem: (id: string) => void;
  deleteLibraryItem: (id: string) => void;
  exportJson: () => ReturnType<typeof toPartFile>;
  importJson: (raw: unknown) => boolean;
  flash: (msg: string) => void;
}

function boot(): Pick<
  ForgeState,
  "name" | "slot" | "quad" | "letter" | "solids" | "selectedId" | "library"
> {
  const slot = "helm";
  const quad: Quad = "SS";
  const letter = "A";
  const seed = defaultSeedFor(slot);
  const solids = buildSeed(seed, quad, letter);
  return {
    name: `${SLOT_BY_ID[slot]?.label ?? slot} · ${seed.label}`,
    slot,
    quad,
    letter,
    solids,
    selectedId: pickSelected(solids),
    library: [],
  };
}

export const useForge = create<ForgeState>((set, get) => {
  const initial = boot();
  return {
    ...initial,
    mode: "translate",
    snap: 0.005,
    showGrid: true,
    showGhost: true,
    showEdges: true,
    showSocket: true,
    theme: "dark",
    mobilePanel: null,
    past: [],
    future: [],
    dragging: false,
    toast: null,

    kit: () => {
      const { quad, letter } = get();
      return kitId(quad, letter, serialFor(quad, letter));
    },
    selected: () => {
      const { solids, selectedId } = get();
      return solids.find((s) => s.id === selectedId) ?? null;
    },
    seed: (seedId) => {
      const { slot, quad, letter } = get();
      const list = seedsForSlot(slot);
      const seed = seedId
        ? (list.find((s) => s.id === seedId) ?? defaultSeedFor(slot))
        : defaultSeedFor(slot);
      const solids = buildSeed(seed, quad, letter);
      get().commit();
      set({
        solids,
        selectedId: pickSelected(solids),
        name: `${SLOT_BY_ID[slot]?.label ?? slot} · ${seed.label}`,
        future: [],
      });
      persist(get);
    },
    setSlot: (id) => {
      set({ slot: id, mobilePanel: null });
      persist(get);
    },
    setQuad: (q) => {
      set({ quad: q });
      persist(get);
    },
    setLetter: (l) => {
      set({ letter: l });
      persist(get);
    },
    setName: (n) => {
      set({ name: n });
      persist(get);
    },
    setMode: (m) => set({ mode: m }),
    setSnap: (n) => set({ snap: n }),
    toggle: (k) => set((s) => ({ [k]: !s[k] })),
    setTheme: (t) => set({ theme: t }),
    setMobilePanel: (p) => set({ mobilePanel: p }),
    setDragging: (d) => set({ dragging: d }),
    select: (id) => set({ selectedId: id }),
    addSolid: (t) => {
      get().commit();
      const { s, d } = defaultSize(t);
      const { density } = densityFor(get().letter);
      const n = segsFor(get().quad, density);
      const selected = get().selected();
      const p: Solid["p"] = selected
        ? [selected.p[0] + 0.02, selected.p[1], selected.p[2]]
        : [0, 0, 0];
      const solid: Solid = {
        id: uid(),
        name: t[0]!.toUpperCase() + t.slice(1),
        t,
        m: "prim",
        s,
        p,
        r: [0, 0, 0],
        d,
        n,
        visible: true,
        locked: false,
      };
      set((st) => ({
        solids: [...st.solids, solid],
        selectedId: solid.id,
        future: [],
      }));
      persist(get);
    },
    removeSelected: () => {
      const { selectedId, solids } = get();
      if (!selectedId) return;
      const cur = solids.find((s) => s.id === selectedId);
      if (cur?.locked) return;
      get().commit();
      const next = solids.filter((s) => s.id !== selectedId);
      set({
        solids: next,
        selectedId: next[next.length - 1]?.id ?? null,
        future: [],
      });
      persist(get);
    },
    duplicateSelected: () => {
      const cur = get().selected();
      if (!cur) return;
      get().commit();
      const copy: Solid = {
        ...cloneSolids([cur])[0]!,
        id: uid(),
        name: cur.name + " copy",
        p: [cur.p[0] + 0.03, cur.p[1], cur.p[2]],
      };
      set((st) => ({
        solids: [...st.solids, copy],
        selectedId: copy.id,
        future: [],
      }));
      persist(get);
    },
    updateSolid: (id, patch, record = false) => {
      if (record) get().commit();
      set((st) => ({
        solids: st.solids.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        future: record ? [] : st.future,
      }));
      persist(get);
    },
    replaceSolids: (solids, record = true) => {
      if (record) get().commit();
      set({ solids, future: record ? [] : get().future });
      persist(get);
    },
    applyBand: () => {
      const { quad, letter, solids } = get();
      const { density } = densityFor(letter);
      const n = segsFor(quad, density);
      get().commit();
      set({
        solids: solids.map((s) =>
          s.t === "cyl" || s.t === "sph" || s.t === "cone" || s.t === "capsule" || s.t === "prism" || s.t === "torus"
            ? { ...s, n }
            : s,
        ),
        future: [],
      });
      persist(get);
    },
    commit: () => {
      const { solids, past } = get();
      const next = [...past, cloneSolids(solids)];
      if (next.length > HISTORY_CAP) next.shift();
      set({ past: next, future: [] });
    },
    undo: () => {
      const { past, solids, future } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      set({
        past: past.slice(0, -1),
        future: [cloneSolids(solids), ...future],
        solids: cloneSolids(prev),
      });
      persist(get);
    },
    redo: () => {
      const { future, solids, past } = get();
      const nxt = future[0];
      if (!nxt) return;
      set({
        future: future.slice(1),
        past: [...past, cloneSolids(solids)],
        solids: cloneSolids(nxt),
      });
      persist(get);
    },
    reset: () => {
      get().seed();
    },
    saveToLibrary: () => {
      const { name, slot, solids, library } = get();
      const item: LibraryItem = {
        id: uid("lib"),
        name,
        slot,
        kit: get().kit(),
        solids: cloneSolids(solids),
        updatedAt: Date.now(),
      };
      const next = [item, ...library].slice(0, 40);
      saveLibrary(next);
      set({ library: next });
      get().flash("Saved to library");
    },
    loadLibraryItem: (id) => {
      const item = get().library.find((x) => x.id === id);
      if (!item) return;
      get().commit();
      set({
        name: item.name,
        slot: item.slot,
        solids: cloneSolids(item.solids),
        selectedId: item.solids[0]?.id ?? null,
        mobilePanel: null,
        future: [],
      });
      persist(get);
    },
    deleteLibraryItem: (id) => {
      const next = get().library.filter((x) => x.id !== id);
      saveLibrary(next);
      set({ library: next });
    },
    exportJson: () => {
      const s = get();
      return toPartFile({
        name: s.name,
        slot: s.slot,
        kit: s.kit(),
        quad: s.quad,
        letter: s.letter,
        solids: s.solids,
      });
    },
    importJson: (raw) => {
      const file = parsePartFile(raw);
      if (!file) {
        get().flash("Not a MOSA Forge file");
        return false;
      }
      get().commit();
      set({
        name: file.name,
        slot: file.slot,
        quad: file.quad,
        letter: file.letter,
        solids: file.solids,
        selectedId: file.solids[0]?.id ?? null,
        future: [],
      });
      persist(get);
      get().flash("Imported");
      return true;
    },
    flash: (msg) => {
      set({ toast: msg });
      window.setTimeout(() => {
        if (get().toast === msg) set({ toast: null });
      }, 1800);
    },
  };
});

export function hydrateForgeFromStorage() {
  const saved = loadSession();
  const library = loadLibrary();
  if (!saved || !saved.solids.length) {
    useForge.setState({ library });
    return;
  }
  useForge.setState({
    name: saved.name,
    slot: saved.slot,
    quad: saved.quad,
    letter: saved.letter,
    solids: saved.solids,
    selectedId: saved.selectedId,
    library,
  });
}

export function snapshotSession(s: SessionState) {
  return s;
}
