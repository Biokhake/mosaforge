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
  type EditTool,
  type GizmoMode,
  type KitPack,
  type LibraryItem,
  type Quad,
  type Shape,
  type Solid,
  type Vec3,
} from "./types";
import { handleCorners } from "./csg";
import { convertAnchor, normalizeAnchors } from "./bezier";
import { BOX_LOOPS, closestEdge, dropVertex, inferLoops, splitEdge } from "./cage";
import { defaultGrids } from "./snap";
import {
  downloadJson,
  loadLibrary,
  loadSession,
  parsePartFile,
  saveLibrary,
  saveSession,
  toPartFile,
  type SessionState,
} from "./io";
import { hangarSaveForKit } from "./hangar-export";
import { subtractSolids, uniteSolids } from "./csg";
import { flipSolid } from "./geometry";
import { ensureHangarLocal, migrateItemToHangar, visualSizeToLocal, defaultScaleFor } from "./scale";
import { STAMP_HINT, stampCut as runStamp, type StampAxis } from "./stamp";
import { buildSeed, defaultSeedFor, seedsForSlot } from "./templates";
import {
  BUILTIN_PACK_ID,
  catalogFromPacks,
  clearPackExtras,
  deleteStoredPack,
  downloadZip,
  kitsToZip,
  loadBuiltinPack,
  loadPackExtras,
  loadStoredPacks,
  makePack,
  normalizePartFile,
  packToZip,
  putStoredPack,
} from "./pack";
import type { ForgePartFile } from "./types";

const HISTORY_CAP = 60;

function pickSelected(solids: Solid[]): string | null {
  return solids.find((s) => s.m === "prim")?.id ?? solids[0]?.id ?? null;
}

function persist(get: () => ForgeState) {
  const s = get();
  const kitDraft = {
    ...s.kitDraft,
    [s.slot]: { name: s.name, solids: cloneSolids(s.solids) },
  };
  saveSession({
    name: s.name,
    slot: s.slot,
    quad: s.quad,
    letter: s.letter,
    solids: s.solids,
    selectedId: s.selectedId,
    space: "hangar",
    kitDraft,
  });
}

export type SlotDraft = { name: string; solids: Solid[] };
export type LeftTab = "kit" | "solids";

export interface ForgeState {
  name: string;
  slot: string;
  quad: Quad;
  letter: string;
  solids: Solid[];
  selectedId: string | null;
  selectedIds: string[];
  tool: EditTool;
  mode: GizmoMode;
  snap: number;
  showGrid: boolean;
  showGhost: boolean;
  showEdges: boolean;
  showSocket: boolean;
  theme: "dark" | "light";
  mobilePanel: null | "solids" | "inspect" | "library";
  library: LibraryItem[];
  catalog: LibraryItem[];
  packs: KitPack[];
  packReady: boolean;
  packBusy: boolean;
  past: Solid[][];
  future: Solid[][];
  dragging: boolean;
  space: boolean;
  toast: string | null;
  smartSnap: boolean;
  guides: import("./snap").Guide[];
  contextMenu: { x: number; y: number; id: string } | null;
  grids: import("./snap").Grids;
  gridDraft: number;
  gridMenu: { x: number; y: number; axis: import("./snap").GridAxis } | null;
  leftTab: LeftTab;
  kitDraft: Record<string, SlotDraft>;
  stampSlot: string | null;
  stampAxis: StampAxis;

  kit: () => string;
  selected: () => Solid | null;
  seed: (seedId?: string) => void;
  setSlot: (id: string) => void;
  setQuad: (q: Quad) => void;
  setLetter: (l: string) => void;
  setName: (n: string) => void;
  setMode: (m: GizmoMode) => void;
  setTool: (t: EditTool) => void;
  setSnap: (n: number) => void;
  toggle: (k: "showGrid" | "showGhost" | "showEdges" | "showSocket") => void;
  setTheme: (t: "dark" | "light") => void;
  setMobilePanel: (p: ForgeState["mobilePanel"]) => void;
  setDragging: (d: boolean) => void;
  setSpace: (v: boolean) => void;
  setSmartSnap: (v: boolean) => void;
  setGuides: (g: import("./snap").Guide[]) => void;
  setContextMenu: (m: ForgeState["contextMenu"]) => void;
  toggleGrid: (axis: import("./snap").GridAxis) => void;
  setGridDraft: (n: number) => void;
  setGridCell: (axis: import("./snap").GridAxis, cell: number) => void;
  setGridMenu: (m: ForgeState["gridMenu"]) => void;
  cycleGrid: () => void;
  setLeftTab: (t: LeftTab) => void;
  setStampSlot: (id: string | null) => void;
  setStampAxis: (a: StampAxis) => void;
  stampCut: () => void;
  mirrorSelected: () => void;
  alignSelected: (axis: 0 | 1 | 2, mode: "min" | "center" | "max") => void;
  addJointRing: () => void;
  flipSelected: (axis: 0 | 1 | 2) => void;
  ensureAnchors: (id: string) => void;
  select: (id: string | null, additive?: boolean) => void;
  addSolid: (t: Shape) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  updateSolid: (id: string, patch: Partial<Solid>, record?: boolean) => void;
  replaceSolids: (solids: Solid[], record?: boolean) => void;
  addAnchor: (id: string, local: Vec3) => void;
  removeAnchor: (id: string, index: number) => void;
  moveAnchor: (id: string, index: number, local: Vec3) => void;
  moveHandle: (id: string, index: number, which: "hin" | "hout", offset: Vec3) => void;
  convertAnchorAt: (id: string, index: number) => void;
  mergeSelected: () => void;
  cropSelected: () => void;
  applyBand: () => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  saveToLibrary: () => void;
  loadLibraryItem: (id: string) => void;
  deleteLibraryItem: (id: string) => void;
  bootPacks: () => Promise<void>;
  registerPack: (name: string, files: ForgePartFile[]) => Promise<number>;
  removePack: (id: string) => Promise<void>;
  exportPack: (id: string) => void;
  loadPackFor: (slot: string, kit?: string) => boolean;
  exportHangarKit: (kit?: string) => void;
  exportAllHangarKits: () => void;
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
    selectedIds: initial.selectedId ? [initial.selectedId] : [],
    tool: "v",
    mode: "translate",
    snap: 0.005,
    showGrid: true,
    showGhost: true,
    showEdges: true,
    showSocket: true,
    theme: "dark",
    mobilePanel: null,
    past: [],
    catalog: [],
    packs: [],
    packReady: false,
    packBusy: false,
    future: [],
    dragging: false,
    space: false,
    toast: null,
    smartSnap: true,
    guides: [],
    contextMenu: null,
    grids: defaultGrids(),
    gridDraft: 0.02,
    gridMenu: null,
    leftTab: "kit",
    kitDraft: {
      [initial.slot]: { name: initial.name, solids: cloneSolids(initial.solids) },
    },
    stampSlot: STAMP_HINT[initial.slot]?.cutter ?? null,
    stampAxis: STAMP_HINT[initial.slot]?.axis ?? "x",

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
      const sid = pickSelected(solids);
      set({
        solids,
        selectedId: sid,
        selectedIds: sid ? [sid] : [],
        name: `${SLOT_BY_ID[slot]?.label ?? slot} · ${seed.label}`,
        future: [],
      });
      persist(get);
    },
    setSlot: (id) => {
      const prev = get().slot;
      if (prev === id) return;
      const st = get();
      const kitDraft = {
        ...st.kitDraft,
        [prev]: { name: st.name, solids: cloneSolids(st.solids) },
      };
      let next = kitDraft[id];
      if (!next?.solids.length) {
        const want = st.kit();
        const item = st.catalog.find((x) => x.slot === id && x.kit === want);
        if (item) {
          next = {
            name: item.name,
            solids: cloneSolids(ensureHangarLocal(item.slot, item.solids, item.space)),
          };
          kitDraft[id] = next;
        }
      }
      const solids = next?.solids?.length ? cloneSolids(next.solids) : [];
      const sid = pickSelected(solids);
      const hint = STAMP_HINT[id];
      set({
        kitDraft,
        slot: id,
        solids,
        name: next?.name ?? `${SLOT_BY_ID[id]?.label ?? id} · ${st.kit()}`,
        selectedId: sid,
        selectedIds: sid ? [sid] : [],
        stampSlot: hint?.cutter ?? st.stampSlot,
        stampAxis: hint?.axis ?? st.stampAxis,
        mobilePanel: null,
        future: [],
      });
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
    setMode: (m) => set({ mode: m, tool: "v" }),
    setTool: (t) => {
      set({ tool: t, contextMenu: null });
      if (t === "a" || t === "plus" || t === "minus" || t === "shiftc") {
        const id = get().selectedId;
        if (id) get().ensureAnchors(id);
      }
    },
    setSnap: (n) => set({ snap: n }),
    toggle: (k) => set((s) => ({ [k]: !s[k] })),
    setTheme: (t) => set({ theme: t }),
    setMobilePanel: (p) => set({ mobilePanel: p }),
    setDragging: (d) => set({ dragging: d, guides: d ? get().guides : [] }),
    setSpace: (v) => set({ space: v }),
    setSmartSnap: (v) => set({ smartSnap: v }),
    setGuides: (g) => set({ guides: g }),
    setContextMenu: (m) => set({ contextMenu: m }),
    toggleGrid: (axis) => {
      const cur = get().grids[axis];
      const cell = Math.max(0.002, get().gridDraft);
      set({
        grids: { ...get().grids, [axis]: cur.on ? { ...cur, on: false } : { on: true, cell } },
        gridMenu: null,
      });
    },
    setGridDraft: (n) => set({ gridDraft: Math.max(0.002, n) }),
    setGridCell: (axis, cell) => {
      const c = Math.max(0.002, cell);
      set({
        grids: { ...get().grids, [axis]: { ...get().grids[axis], cell: c } },
        gridDraft: c,
      });
    },
    setGridMenu: (m) => set({ gridMenu: m }),
    cycleGrid: () => {
      const { grids, gridDraft } = get();
      const cell = Math.max(0.002, gridDraft);
      const exclusive = (["x", "y", "z"] as const).filter((a) => grids[a].on);
      const off = { x: { ...grids.x, on: false }, y: { ...grids.y, on: false }, z: { ...grids.z, on: false } };
      const turn = (axis: "x" | "y" | "z") => ({
        ...off,
        [axis]: { on: true, cell: grids[axis].cell || cell },
      });
      let next = off;
      if (exclusive.length === 1 && exclusive[0] === "x") next = turn("y");
      else if (exclusive.length === 1 && exclusive[0] === "y") next = turn("z");
      else if (exclusive.length === 1 && exclusive[0] === "z") next = off;
      else next = turn("x");
      set({ grids: next, gridMenu: null });
    },
    setLeftTab: (t) => set({ leftTab: t }),
    setStampSlot: (id) => set({ stampSlot: id }),
    setStampAxis: (a) => set({ stampAxis: a }),
    stampCut: () => {
      const st = get();
      const cutterId = st.stampSlot ?? STAMP_HINT[st.slot]?.cutter ?? null;
      if (!cutterId || cutterId === st.slot) {
        get().flash("Pick a cutter slot on Outline");
        return;
      }
      const draft = {
        ...st.kitDraft,
        [st.slot]: { name: st.name, solids: cloneSolids(st.solids) },
      };
      const cutter = draft[cutterId]?.solids ?? [];
      if (!cutter.length) {
        get().flash(`${cutterId} is empty`);
        return;
      }
      const baked = runStamp({
        target: st.solids,
        cutter,
        cutterSlot: cutterId,
        targetSlot: st.slot,
        axis: st.stampAxis,
        quad: st.quad,
      });
      if (!baked) {
        get().flash("Stamp failed");
        return;
      }
      get().commit();
      const sid = baked[baked.length - 1]?.id ?? null;
      set({
        kitDraft: draft,
        solids: baked,
        selectedId: sid,
        selectedIds: sid ? [sid] : [],
        future: [],
      });
      persist(get);
      get().flash(`Stamped ${cutterId} → ${st.slot}`);
    },
    mirrorSelected: () => {
      const { selectedIds, solids } = get();
      const picks = solids.filter((s) => selectedIds.includes(s.id));
      if (!picks.length) return;
      get().commit();
      const copies = picks.map((cur) => {
        const copy = {
          ...cloneSolids([cur])[0]!,
          id: uid(),
          name: cur.name + " mir",
          p: [-cur.p[0], cur.p[1], cur.p[2]] as Vec3,
          r: [cur.r[0], -cur.r[1], -cur.r[2]] as Vec3,
        };
        if (Math.abs(copy.p[0] - cur.p[0]) < 0.002) copy.p[0] = -(Math.abs(cur.s[0]) + 0.01);
        return copy;
      });
      const ids = copies.map((c) => c.id);
      set((st) => ({
        solids: [...st.solids, ...copies],
        selectedId: ids[ids.length - 1] ?? null,
        selectedIds: ids,
        future: [],
      }));
      persist(get);
      get().flash("Mirrored X");
    },
    alignSelected: (axis, mode) => {
      const { selectedIds, solids } = get();
      const picks = solids.filter((s) => selectedIds.includes(s.id) && !s.locked);
      if (picks.length < 2) {
        get().flash("Select two or more");
        return;
      }
      const key = picks[0]!;
      const half = (s: Solid) => Math.abs(s.s[axis] || 0) / 2;
      const min = key.p[axis] - half(key);
      const max = key.p[axis] + half(key);
      const mid = key.p[axis];
      get().commit();
      set({
        solids: solids.map((s) => {
          if (!selectedIds.includes(s.id) || s.id === key.id || s.locked) return s;
          const h = half(s);
          const p = [...s.p] as Vec3;
          if (mode === "min") p[axis] = min + h;
          else if (mode === "max") p[axis] = max - h;
          else p[axis] = mid;
          return { ...s, p };
        }),
        future: [],
      });
      persist(get);
    },
    addJointRing: () => {
      get().commit();
      const solid: Solid = {
        id: uid(),
        name: "Joint",
        t: "capsule",
        m: "joint",
        s: [0.018, 0.028, 0],
        p: [0, 0, 0],
        r: [0, 0, Math.PI / 2],
        n: 12,
        visible: true,
        locked: false,
      };
      set((st) => ({
        solids: [...st.solids, solid],
        selectedId: solid.id,
        selectedIds: [solid.id],
        future: [],
      }));
      persist(get);
    },
    flipSelected: (axis) => {
      const { selectedIds, solids } = get();
      if (!selectedIds.length) return;
      get().commit();
      set({
        solids: solids.map((s) => (selectedIds.includes(s.id) && !s.locked ? flipSolid(s, axis) : s)),
        future: [],
        contextMenu: null,
      });
      persist(get);
      get().flash(axis === 0 ? "Flip H" : axis === 1 ? "Flip V" : "Flip D");
    },
    ensureAnchors: (id) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur || cur.locked) return;
      if (normalizeAnchors(cur.anchors).length) {
        if (!cur.loops?.length && normalizeAnchors(cur.anchors).length === 8) {
          get().updateSolid(id, { loops: BOX_LOOPS.map((l) => [...l]) });
        }
        return;
      }
      const c = handleCorners(cur);
      get().updateSolid(id, {
        anchors: c.map((p) => ({
          p,
          kind: "corner" as const,
          hin: [0, 0, 0] as Vec3,
          hout: [0, 0, 0] as Vec3,
        })),
        loops: BOX_LOOPS.map((l) => [...l]),
      });
    },
    select: (id, additive = false) => {
      if (!id) {
        set({ selectedId: null, selectedIds: [], contextMenu: null, guides: [] });
        return;
      }
      if (!additive) {
        set({ selectedId: id, selectedIds: [id] });
        return;
      }
      const cur = get().selectedIds;
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      set({
        selectedIds: next,
        selectedId: next.includes(id) ? id : next[next.length - 1] ?? null,
      });
    },
    addSolid: (t) => {
      get().commit();
      const slot = get().slot;
      const raw = defaultSize(t);
      const { s, d } = visualSizeToLocal(slot, raw.s, raw.d);
      const { density } = densityFor(get().letter);
      const n = segsFor(get().quad, density);
      const selected = get().selected();
      const sc = defaultScaleFor(slot);
      const p: Solid["p"] = selected
        ? [selected.p[0] + 0.02 / sc.sx, selected.p[1], selected.p[2]]
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
        selectedIds: [solid.id],
        future: [],
      }));
      persist(get);
    },
    removeSelected: () => {
      const { selectedIds, solids } = get();
      if (!selectedIds.length) return;
      if (solids.filter((s) => selectedIds.includes(s.id)).every((s) => s.locked)) return;
      get().commit();
      const drop = new Set(selectedIds.filter((id) => !solids.find((s) => s.id === id)?.locked));
      const next = solids.filter((s) => !drop.has(s.id));
      const keep = next[next.length - 1]?.id ?? null;
      set({
        solids: next,
        selectedId: keep,
        selectedIds: keep ? [keep] : [],
        future: [],
      });
      persist(get);
    },
    duplicateSelected: () => {
      const { selectedIds, solids } = get();
      const picks = solids.filter((s) => selectedIds.includes(s.id));
      if (!picks.length) return;
      get().commit();
      const sc = defaultScaleFor(get().slot);
      const copies = picks.map((cur) => ({
        ...cloneSolids([cur])[0]!,
        id: uid(),
        name: cur.name + " copy",
        p: [cur.p[0] + 0.03 / sc.sx, cur.p[1], cur.p[2]] as Solid["p"],
      }));
      const ids = copies.map((c) => c.id);
      set((st) => ({
        solids: [...st.solids, ...copies],
        selectedId: ids[ids.length - 1] ?? null,
        selectedIds: ids,
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
    addAnchor: (id, local) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur || cur.locked) return;
      const anchors = normalizeAnchors(cur.anchors);
      if (anchors.length < 2) return;
      const loops = inferLoops(anchors, cur.loops);
      const hit = closestEdge(anchors, loops, local);
      if (!hit) return;
      get().commit();
      const k = anchors.length;
      const nextAnchors = [
        ...anchors,
        { p: hit.q, kind: "corner" as const, hin: [0, 0, 0] as Vec3, hout: [0, 0, 0] as Vec3 },
      ];
      get().updateSolid(id, {
        anchors: nextAnchors,
        loops: splitEdge(loops, hit.a, hit.b, k),
        path: true,
      });
    },
    removeAnchor: (id, index) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      const anchors = normalizeAnchors(cur.anchors);
      if (anchors.length <= 3) return;
      get().commit();
      const loops = inferLoops(anchors, cur.loops);
      get().updateSolid(id, {
        anchors: anchors.filter((_, i) => i !== index),
        loops: dropVertex(loops, index),
        path: true,
      });
    },
    moveAnchor: (id, index, local) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      const anchors = normalizeAnchors(cur.anchors).map((a, i) => (i === index ? { ...a, p: local } : a));
      get().updateSolid(id, {
        anchors,
        path: true,
        loops: inferLoops(anchors, cur.loops),
      });
    },
    moveHandle: (id, index, which, offset) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      const anchors = normalizeAnchors(cur.anchors).map((a, i) => {
        if (i !== index) return a;
        if (a.kind !== "smooth") return a;
        if (which === "hout") return { ...a, hout: offset, hin: [-offset[0], -offset[1], -offset[2]] as Vec3 };
        return { ...a, hin: offset, hout: [-offset[0], -offset[1], -offset[2]] as Vec3 };
      });
      get().updateSolid(id, { anchors, path: true });
    },
    convertAnchorAt: (id, index) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      get().commit();
      get().updateSolid(id, { anchors: convertAnchor(normalizeAnchors(cur.anchors), index), path: true });
    },
    mergeSelected: () => {
      const { selectedIds, solids, quad } = get();
      const picks = solids.filter((s) => selectedIds.includes(s.id) && s.visible);
      if (picks.length < 2) {
        get().flash("Select two or more solids");
        return;
      }
      const baked = uniteSolids(picks, quad);
      if (!baked) {
        get().flash("Merge failed");
        return;
      }
      get().commit();
      const drop = new Set(picks.map((s) => s.id));
      const next = [...solids.filter((s) => !drop.has(s.id)), baked];
      set({ solids: next, selectedId: baked.id, selectedIds: [baked.id], future: [] });
      persist(get);
      get().flash("Merged");
    },
    cropSelected: () => {
      const { selectedId, selectedIds, solids, quad } = get();
      const keep = solids.find((s) => s.id === selectedId);
      const cuts = solids.filter((s) => selectedIds.includes(s.id) && s.id !== selectedId);
      if (!keep || !cuts.length) {
        get().flash("Select target, then cutters");
        return;
      }
      const baked = subtractSolids(keep, cuts, quad);
      if (!baked) {
        get().flash("Crop failed");
        return;
      }
      get().commit();
      const drop = new Set([keep.id, ...cuts.map((s) => s.id)]);
      const next = [...solids.filter((s) => !drop.has(s.id)), baked];
      set({ solids: next, selectedId: baked.id, selectedIds: [baked.id], future: [] });
      persist(get);
      get().flash("Cropped");
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
      const { name, slot, quad, letter, solids, library } = get();
      const item: LibraryItem = {
        id: uid("lib"),
        name,
        slot,
        kit: get().kit(),
        quad,
        letter,
        solids: cloneSolids(solids),
        updatedAt: Date.now(),
        space: "hangar",
      };
      const next = [item, ...library].slice(0, 80);
      saveLibrary(next);
      set({ library: next });
      get().flash("Saved to library");
    },
    loadLibraryItem: (id) => {
      const item =
        get().catalog.find((x) => x.id === id) ?? get().library.find((x) => x.id === id);
      if (!item) return;
      get().commit();
      const solids = cloneSolids(ensureHangarLocal(item.slot, item.solids, item.space));
      const kitMatch = /^(SS|SR|RS|RR)([A-Z])-/.exec(item.kit);
      const sid = pickSelected(solids);
      set({
        name: item.name,
        slot: item.slot,
        solids,
        selectedId: sid,
        selectedIds: sid ? [sid] : [],
        quad: item.quad ?? (kitMatch ? (kitMatch[1] as Quad) : get().quad),
        letter: item.letter ?? kitMatch?.[2] ?? get().letter,
        mobilePanel: get().mobilePanel === "library" ? "library" : null,
        future: [],
      });
      persist(get);
    },
    deleteLibraryItem: (id) => {
      const next = get().library.filter((x) => x.id !== id);
      saveLibrary(next);
      set({ library: next });
    },
    bootPacks: async () => {
      set({ packBusy: true });
      try {
        const [builtinFiles, stored] = await Promise.all([
          loadBuiltinPack().catch(() => [] as ForgePartFile[]),
          loadStoredPacks(),
        ]);
        const packs: KitPack[] = [
          makePack("MOSA kits", builtinFiles, true),
          ...stored.filter((p) => p.id !== BUILTIN_PACK_ID),
        ];
        const extras = loadPackExtras();
        if (extras.length) {
          const migrated = makePack("Imported", extras);
          await putStoredPack(migrated);
          clearPackExtras();
          packs.push(migrated);
        }
        set({ packs, catalog: catalogFromPacks(packs), packReady: true, packBusy: false });
      } catch {
        set({ packReady: true, packBusy: false });
        get().flash("Kit pack failed to load");
      }
    },
    registerPack: async (name, incoming) => {
      if (!incoming.length) {
        get().flash("No MOSA Forge parts in file");
        return 0;
      }
      set({ packBusy: true });
      const files = incoming.map(normalizePartFile);
      const packs = [...get().packs];
      const existing = packs.find((p) => !p.builtin && p.name === name);
      const pack = existing
        ? { ...existing, files, addedAt: Date.now() }
        : makePack(name, files);
      await putStoredPack(pack);
      const next = existing
        ? packs.map((p) => (p.id === pack.id ? pack : p))
        : [...packs, pack];
      set({ packs: next, catalog: catalogFromPacks(next), packBusy: false, packReady: true });
      get().flash(`${existing ? "Replaced" : "Registered"} ${name} · ${files.length} parts`);
      return files.length;
    },
    removePack: async (id) => {
      if (id === BUILTIN_PACK_ID) return;
      await deleteStoredPack(id);
      const packs = get().packs.filter((p) => p.id !== id);
      set({ packs, catalog: catalogFromPacks(packs) });
      get().flash("Pack removed");
    },
    exportPack: (id) => {
      const pack = get().packs.find((p) => p.id === id);
      if (!pack?.files.length) {
        get().flash("Pack is empty");
        return;
      }
      downloadZip(`${pack.name.replace(/\s+/g, "-").toLowerCase() || "pack"}.zip`, packToZip(pack.files));
      get().flash(`Exported ${pack.files.length} parts`);
    },
    loadPackFor: (slot, kit) => {
      const want = kit ?? get().kit();
      const item = get().catalog.find((x) => x.slot === slot && x.kit === want);
      if (!item) {
        get().flash(`No pack part for ${slot} · ${want}`);
        return false;
      }
      get().loadLibraryItem(item.id);
      get().flash(`Loaded ${item.name}`);
      return true;
    },
    exportHangarKit: (kit) => {
      const id = kit ?? get().kit();
      const save = hangarSaveForKit(id, get().catalog);
      const n = Object.keys(save.forgeParts).length;
      downloadJson(`${id.toLowerCase()}-mosa.json`, save);
      get().flash(`${id} → MOSA · ${n} forged slots`);
    },
    exportAllHangarKits: () => {
      const catalog = get().catalog;
      const kits = new Set(catalog.map((x) => x.kit)).size;
      if (!kits) {
        get().flash("No kits in catalog");
        return;
      }
      downloadZip("mosa-kits.zip", kitsToZip(catalog));
      get().flash(`${kits} kit JSON → MOSA`);
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
      const solids = ensureHangarLocal(file.slot, file.solids, file.space);
      const st = get();
      const kitDraft = {
        ...st.kitDraft,
        [st.slot]: { name: st.name, solids: cloneSolids(st.solids) },
        [file.slot]: { name: file.name, solids: cloneSolids(solids) },
      };
      set({
        name: file.name,
        slot: file.slot,
        quad: file.quad,
        letter: file.letter,
        solids,
        kitDraft,
        selectedId: solids[0]?.id ?? null,
        selectedIds: solids[0]?.id ? [solids[0].id] : [],
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
  const rawLib = loadLibrary();
  const library = rawLib.map(migrateItemToHangar);
  if (library.some((item, i) => item !== rawLib[i])) {
    saveLibrary(library);
  }
  if (!saved || !saved.solids.length) {
    useForge.setState({ library });
    return;
  }
  const solids = ensureHangarLocal(saved.slot, saved.solids, saved.space);
  const kitDraft = saved.kitDraft
    ? Object.fromEntries(
        Object.entries(saved.kitDraft).map(([id, d]) => [
          id,
          { name: d.name, solids: ensureHangarLocal(id, d.solids, saved.space) },
        ]),
      )
    : {};
  kitDraft[saved.slot] = { name: saved.name, solids: cloneSolids(solids) };
  useForge.setState({
    name: saved.name,
    slot: saved.slot,
    quad: saved.quad,
    letter: saved.letter,
    solids,
    selectedId: saved.selectedId,
    selectedIds: saved.selectedId ? [saved.selectedId] : [],
    kitDraft,
    library,
  });
}

export function snapshotSession(s: SessionState) {
  return s;
}
