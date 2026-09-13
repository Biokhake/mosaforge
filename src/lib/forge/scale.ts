import { SLOT_BY_ID } from "./slots";
import type { LibraryItem, Solid, Vec3 } from "./types";

export type SlotScale = { sx: number; sy: number; sz: number };
export type CoordSpace = "hangar" | "visual";

/** Hangar slot.sx/sy/sz — Forge stores hangar-local (pre-scale) specs. */
export function defaultScaleFor(id: string): SlotScale {
  const g = SLOT_BY_ID[id]?.group;
  if (g === "head" || id === "extra5" || id === "extra7") return { sx: 0.72, sy: 0.72, sz: 0.72 };
  switch (id) {
    case "collar":
      return { sx: 0.92, sy: 0.88, sz: 0.92 };
    case "chestCore":
      return { sx: 0.9, sy: 1.06, sz: 0.94 };
    case "pecL":
    case "pecR":
      return { sx: 0.88, sy: 1, sz: 0.9 };
    case "cockpit":
      return { sx: 0.88, sy: 1, sz: 0.88 };
    case "abdomen":
      return { sx: 0.86, sy: 1.1, sz: 0.9 };
    case "pelvis":
      return { sx: 0.9, sy: 1, sz: 0.92 };
    case "skirtF":
    case "skirtB":
      return { sx: 0.9, sy: 1.06, sz: 0.92 };
    case "skirtL":
    case "skirtR":
      return { sx: 0.9, sy: 1.1, sz: 0.92 };
    case "shoulderR":
    case "shoulderL":
      return { sx: 0.88, sy: 0.9, sz: 0.88 };
    case "upperR":
    case "upperL":
      return { sx: 0.88, sy: 1.14, sz: 0.88 };
    case "elbowR":
    case "elbowL":
      return { sx: 0.94, sy: 0.94, sz: 0.94 };
    case "forearmR":
    case "forearmL":
      return { sx: 0.88, sy: 1.14, sz: 0.88 };
    case "vambraceR":
    case "vambraceL":
      return { sx: 0.9, sy: 1.04, sz: 0.9 };
    case "handR":
    case "handL":
      return { sx: 0.94, sy: 0.94, sz: 0.94 };
    case "hipR":
    case "hipL":
      return { sx: 1.06, sy: 1.06, sz: 1.06 };
    case "thighR":
    case "thighL":
      return { sx: 1.16, sy: 1.28, sz: 1.16 };
    case "kneeR":
    case "kneeL":
      return { sx: 1.12, sy: 1.08, sz: 1.12 };
    case "shinR":
    case "shinL":
      return { sx: 1.14, sy: 1.32, sz: 1.14 };
    case "ankleR":
    case "ankleL":
      return { sx: 1.1, sy: 1.06, sz: 1.1 };
    case "footR":
    case "footL":
      return { sx: 1.08, sy: 1, sz: 1.18 };
    case "pack":
      return { sx: 0.9, sy: 0.94, sz: 0.9 };
    case "thrusterL":
    case "thrusterR":
      return { sx: 0.92, sy: 0.92, sz: 0.92 };
    case "binderL":
    case "binderR":
      return { sx: 0.92, sy: 0.96, sz: 0.92 };
    default:
      return { sx: 1, sy: 1, sz: 1 };
  }
}

function div(v: Vec3, sc: SlotScale): Vec3 {
  return [v[0] / sc.sx, v[1] / sc.sy, v[2] / sc.sz];
}

/** Visual / bot JSON → hangar-local (what hangar multiplies by defaultScaleFor). */
export function solidsToHangarLocal(slot: string, solids: Solid[]): Solid[] {
  const sc = defaultScaleFor(slot);
  if (sc.sx === 1 && sc.sy === 1 && sc.sz === 1) return solids;
  return solids.map((s) => ({
    ...s,
    p: div(s.p, sc),
    s: div(s.s, sc),
    d: s.d != null ? s.d / sc.sz : s.d,
  }));
}

/** Missing space = visual (bot packs, old sessions). */
export function ensureHangarLocal(slot: string, solids: Solid[], space?: CoordSpace): Solid[] {
  if (space === "hangar") return solids;
  return solidsToHangarLocal(slot, solids);
}

export function visualSizeToLocal(slot: string, s: Vec3, d?: number): { s: Vec3; d?: number } {
  const sc = defaultScaleFor(slot);
  return {
    s: div(s, sc),
    d: d != null ? d / sc.sz : d,
  };
}

export function migrateItemToHangar(item: LibraryItem): LibraryItem {
  if (item.space === "hangar") return item;
  return {
    ...item,
    solids: solidsToHangarLocal(item.slot, item.solids),
    space: "hangar",
  };
}

/** Keep visual size when the editor socket changes. */
export function rehomeSolids(solids: Solid[], fromSlot: string, toSlot: string): Solid[] {
  if (fromSlot === toSlot) return solids;
  const from = defaultScaleFor(fromSlot);
  const to = defaultScaleFor(toSlot);
  if (from.sx === to.sx && from.sy === to.sy && from.sz === to.sz) return solids;
  return solids.map((s) => ({
    ...s,
    p: [s.p[0] * (from.sx / to.sx), s.p[1] * (from.sy / to.sy), s.p[2] * (from.sz / to.sz)],
    s: [s.s[0] * (from.sx / to.sx), s.s[1] * (from.sy / to.sy), s.s[2] * (from.sz / to.sz)],
    d: s.d != null ? s.d * (from.sz / to.sz) : s.d,
  }));
}
