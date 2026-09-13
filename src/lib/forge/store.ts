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
import { convertAnchor, normalizeAnchors, snap45 } from "./bezier";
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
import { ensureHangarLocal, migrateItemToHangar, visualSizeToLocal, defaultScaleFor, rehomeSolids } from "./scale";
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
  saveSession({
    name: s.name,
    slot: s.slot,
    quad: s.quad,
    letter: s.letter,
    solids: s.solids,
    selectedId: s.selectedId,
    space: "hangar",
  });
}

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
  toast: string | null;

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
  select: (id: string | null, additive?: boolean) => void;
  addSolid: (t: Shape) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  updateSolid: (id: string, patch: Partial<Solid>, record?: boolean) => void;
  replaceSolids: (solids: Solid[], record?: boolean) => void;
  addAnchor: (id: string, local: Vec3) => void;
  removeAnchor: (id: string, index: number) => void;
  moveAnchor: (id: string, index: number, local: Vec3) => void;
  moveHandle: (id: string, index: number, which: "hin" | "hout", offset: Vec3, shift?: boolean) => void;
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
      set({ slot: id, solids: rehomeSolids(get().solids, prev, id), mobilePanel: null });
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
    setTool: (t) => set({ tool: t }),
    setSnap: (n) => set({ snap: n }),
    toggle: (k) => set((s) => ({ [k]: !s[k] })),
    setTheme: (t) => set({ theme: t }),
    setMobilePanel: (p) => set({ mobilePanel: p }),
    setDragging: (d) => set({ dragging: d }),
    select: (id, additive = false) => {
      if (!id) {
        set({ selectedId: null, selectedIds: [] });
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
      get().commit();
      const anchors = [
        ...normalizeAnchors(cur.anchors),
        { p: local, kind: "corner" as const, hin: [0, 0, 0] as Vec3, hout: [0, 0, 0] as Vec3 },
      ];
      get().updateSolid(id, { anchors });
    },
    removeAnchor: (id, index) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      get().commit();
      get().updateSolid(id, { anchors: normalizeAnchors(cur.anchors).filter((_, i) => i !== index) });
    },
    moveAnchor: (id, index, local) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      const anchors = normalizeAnchors(cur.anchors).map((a, i) => (i === index ? { ...a, p: local } : a));
      get().updateSolid(id, { anchors });
    },
    moveHandle: (id, index, which, offset, shift = false) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      const off = shift ? snap45(offset) : offset;
      const anchors = normalizeAnchors(cur.anchors).map((a, i) => {
        if (i !== index) return a;
        if (a.kind !== "smooth") return a;
        if (which === "hout") return { ...a, hout: off, hin: [-off[0], -off[1], -off[2]] as Vec3 };
        return { ...a, hin: off, hout: [-off[0], -off[1], -off[2]] as Vec3 };
      });
      get().updateSolid(id, { anchors });
    },
    convertAnchorAt: (id, index) => {
      const cur = get().solids.find((s) => s.id === id);
      if (!cur?.anchors || cur.locked) return;
      get().commit();
      get().updateSolid(id, { anchors: convertAnchor(normalizeAnchors(cur.anchors), index) });
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
      set({
        name: file.name,
        slot: file.slot,
        quad: file.quad,
        letter: file.letter,
        solids,
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
  useForge.setState({
    name: saved.name,
    slot: saved.slot,
    quad: saved.quad,
    letter: saved.letter,
    solids,
    selectedId: saved.selectedId,
    selectedIds: saved.selectedId ? [saved.selectedId] : [],
    library,
  });
  saveSession({
    name: saved.name,
    slot: saved.slot,
    quad: saved.quad,
    letter: saved.letter,
    solids,
    selectedId: saved.selectedId,
    space: "hangar",
  });
}

export function snapshotSession(s: SessionState) {
  return s;
}
