import { GHOST_BOXES, SLOT_BY_ID, SLOTS } from "./slots";
import { defaultScaleFor } from "./scale";
import { cloneSolids, type ForgePartFile, type Solid, type Vec3 } from "./types";

const FILL = 0.96;
const K_MIN = 0.25;
const K_MAX = 6;
const CENTER_MIX = 0.72;

const SURFACE = new Set([
  "visor",
  "brow",
  "eyeL",
  "eyeR",
  "nose",
  "mouth",
  "jaw",
  "earL",
  "earR",
  "vfin",
  "antennaL",
  "antennaR",
  "cheekL",
  "cheekR",
  "chin",
  "collar",
  "pecL",
  "pecR",
  "cockpit",
  "skirtF",
  "skirtB",
  "skirtL",
  "skirtR",
  "vambraceR",
  "vambraceL",
  "thrusterL",
  "thrusterR",
  "binderL",
  "binderR",
]);

const SURFACE_FRAC: Record<string, Vec3> = {
  visor: [0.82, 0.28, 0.24],
  brow: [0.78, 0.2, 0.26],
  eyeL: [0.24, 0.14, 0.14],
  eyeR: [0.24, 0.14, 0.14],
  nose: [0.2, 0.16, 0.18],
  mouth: [0.38, 0.12, 0.16],
  jaw: [0.72, 0.24, 0.42],
  earL: [0.2, 0.3, 0.24],
  earR: [0.2, 0.3, 0.24],
  vfin: [0.22, 0.32, 0.38],
  antennaL: [0.14, 0.38, 0.14],
  antennaR: [0.14, 0.38, 0.14],
  cheekL: [0.3, 0.24, 0.24],
  cheekR: [0.3, 0.24, 0.24],
  chin: [0.48, 0.18, 0.22],
  collar: [0.72, 0.22, 0.5],
  pecL: [0.42, 0.36, 0.42],
  pecR: [0.42, 0.36, 0.42],
  cockpit: [0.48, 0.26, 0.32],
  skirtF: [0.72, 0.55, 0.42],
  skirtB: [0.72, 0.55, 0.42],
  skirtL: [0.38, 0.7, 0.55],
  skirtR: [0.38, 0.7, 0.55],
  vambraceR: [0.85, 0.2, 0.85],
  vambraceL: [0.85, 0.2, 0.85],
  thrusterL: [0.42, 0.55, 0.45],
  thrusterR: [0.42, 0.55, 0.45],
  binderL: [0.4, 0.5, 0.4],
  binderR: [0.4, 0.5, 0.4],
};

export function ghostForGroup(group: string) {
  const id = group === "back" ? "back" : group;
  return GHOST_BOXES.find((b) => b.id === id) ?? (group === "back" ? GHOST_BOXES.find((b) => b.id === "pack") : undefined);
}

function mul(v: Vec3, sc: { sx: number; sy: number; sz: number }): Vec3 {
  return [v[0] * sc.sx, v[1] * sc.sy, v[2] * sc.sz];
}

function toVisual(slot: string, solids: Solid[]): Solid[] {
  const sc = defaultScaleFor(slot);
  return solids.map((s) => ({
    ...s,
    p: mul(s.p, sc),
    s: mul(s.s, sc),
    d: s.d != null ? s.d * sc.sz : s.d,
  }));
}

function toLocal(slot: string, solids: Solid[]): Solid[] {
  const sc = defaultScaleFor(slot);
  return solids.map((s) => ({
    ...s,
    p: [s.p[0] / sc.sx, s.p[1] / sc.sy, s.p[2] / sc.sz],
    s: [s.s[0] / sc.sx, s.s[1] / sc.sy, s.s[2] / sc.sz],
    d: s.d != null ? s.d / sc.sz : s.d,
  }));
}

function halfExtent(s: Solid): Vec3 {
  const [a, b, c] = s.s;
  switch (s.t) {
    case "cyl":
    case "hex":
    case "prism": {
      const r = Math.max(Math.abs(a), Math.abs(b || a));
      return [r, c / 2, r];
    }
    case "sph":
    case "octa":
      return [a, a, a];
    case "cone": {
      const r = Math.max(Math.abs(a), Math.abs(b || a));
      return [r, c / 2, r];
    }
    case "capsule":
      return [a, Math.abs(b) / 2 + a, a];
    case "torus":
      return [a + b, b, a + b];
    case "trap": {
      const d = s.d ?? 0.06;
      return [Math.max(a, b) / 2, c / 2, d / 2];
    }
    default:
      return [a / 2, b / 2, c / 2];
  }
}

function rotateEuler(r: Vec3, v: Vec3): Vec3 {
  const cx = Math.cos(r[0]);
  const sx = Math.sin(r[0]);
  const y1 = v[1] * cx - v[2] * sx;
  const z1 = v[1] * sx + v[2] * cx;
  const cy = Math.cos(r[1]);
  const sy = Math.sin(r[1]);
  const x2 = v[0] * cy + z1 * sy;
  const z2 = -v[0] * sy + z1 * cy;
  const cz = Math.cos(r[2]);
  const sz = Math.sin(r[2]);
  return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
}

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export function solidsAabb(solids: Solid[]): Aabb | null {
  let min: Vec3 | null = null;
  let max: Vec3 | null = null;
  for (const s of solids) {
    if (!s.visible) continue;
    const h = halfExtent(s);
    for (const sx of [-h[0], h[0]]) {
      for (const sy of [-h[1], h[1]]) {
        for (const sz of [-h[2], h[2]]) {
          const c = rotateEuler(s.r, [sx, sy, sz]);
          const x = s.p[0] + c[0];
          const y = s.p[1] + c[1];
          const z = s.p[2] + c[2];
          if (!min || !max) {
            min = [x, y, z];
            max = [x, y, z];
          } else {
            min[0] = Math.min(min[0], x);
            min[1] = Math.min(min[1], y);
            min[2] = Math.min(min[2], z);
            max[0] = Math.max(max[0], x);
            max[1] = Math.max(max[1], y);
            max[2] = Math.max(max[2], z);
          }
        }
      }
    }
  }
  return min && max ? { min, max } : null;
}

function sizeOf(a: Aabb): Vec3 {
  return [a.max[0] - a.min[0], a.max[1] - a.min[1], a.max[2] - a.min[2]];
}

function centerOf(a: Aabb): Vec3 {
  return [(a.min[0] + a.max[0]) / 2, (a.min[1] + a.max[1]) / 2, (a.min[2] + a.max[2]) / 2];
}

function volumeSlots(group: string) {
  return SLOTS.filter(
    (s) =>
      s.group === group &&
      !SURFACE.has(s.id) &&
      !s.id.startsWith("extra") &&
      s.group !== "weapon" &&
      s.group !== "extra",
  );
}

export function slotTargetWorld(slotId: string): { p: Vec3; s: Vec3 } | null {
  const def = SLOT_BY_ID[slotId];
  if (!def) return null;
  const ghost = ghostForGroup(def.group);
  if (!ghost) return null;
  if (SURFACE.has(slotId)) {
    const frac = SURFACE_FRAC[slotId] ?? ([0.36, 0.28, 0.32] as Vec3);
    return {
      p: [def.socket[0], def.socket[1], def.socket[2]],
      s: [ghost.s[0] * frac[0], ghost.s[1] * frac[1], ghost.s[2] * frac[2]],
    };
  }
  const vols = volumeSlots(def.group);
  if (vols.length <= 1) return { p: [...ghost.p] as Vec3, s: [...ghost.s] as Vec3 };
  const axis = ghost.s[1] >= ghost.s[0] && ghost.s[1] >= ghost.s[2] ? 1 : ghost.s[0] >= ghost.s[2] ? 0 : 2;
  const sorted = [...vols].sort((a, b) => a.socket[axis] - b.socket[axis]);
  const gMin = ghost.p[axis] - ghost.s[axis] / 2;
  const gMax = ghost.p[axis] + ghost.s[axis] / 2;
  const cuts = [gMin];
  for (let i = 1; i < sorted.length; i++) {
    cuts.push((sorted[i - 1]!.socket[axis] + sorted[i]!.socket[axis]) / 2);
  }
  cuts.push(gMax);
  const idx = sorted.findIndex((s) => s.id === slotId);
  if (idx < 0) return { p: [...ghost.p] as Vec3, s: [...ghost.s] as Vec3 };
  const lo0 = Math.max(gMin, Math.min(gMax, cuts[idx]!));
  const hi0 = Math.max(gMin, Math.min(gMax, cuts[idx + 1]!));
  const pad = (hi0 - lo0) * 0.12;
  const lo = Math.max(gMin, lo0 - pad);
  const hi = Math.min(gMax, hi0 + pad);
  const p: Vec3 = [...ghost.p];
  const s: Vec3 = [...ghost.s];
  p[axis] = (lo + hi) / 2;
  s[axis] = Math.max(0.02, hi - lo);
  return { p, s };
}

function scaleSolid(s: Solid, k: Vec3, from: Vec3, to: Vec3): Solid {
  const p: Vec3 = [
    (s.p[0] - from[0]) * k[0] + to[0],
    (s.p[1] - from[1]) * k[1] + to[1],
    (s.p[2] - from[2]) * k[2] + to[2],
  ];
  const [kx, ky, kz] = k;
  const xz = Math.min(kx, kz);
  let ns: Vec3 = [...s.s];
  let d = s.d;
  switch (s.t) {
    case "cyl":
    case "hex":
    case "prism":
    case "cone":
      ns = [s.s[0] * xz, s.s[1] * xz, s.s[2] * ky];
      break;
    case "sph":
    case "octa": {
      const r = Math.min(kx, ky, kz);
      ns = [s.s[0] * r, s.s[1] * r, s.s[2] * r];
      break;
    }
    case "capsule":
      ns = [s.s[0] * xz, s.s[1] * ky, s.s[2] * xz];
      break;
    case "torus":
      ns = [s.s[0] * xz, s.s[1] * Math.min(kx, ky, kz), s.s[2] * xz];
      break;
    case "trap":
      ns = [s.s[0] * kx, s.s[1] * kx, s.s[2] * ky];
      d = s.d != null ? s.d * kz : s.d;
      break;
    default:
      ns = [s.s[0] * kx, s.s[1] * ky, s.s[2] * kz];
  }
  return { ...s, p, s: ns, d };
}

function fitVisualToBox(solids: Solid[], center: Vec3, size: Vec3): Solid[] {
  const aabb = solidsAabb(solids);
  if (!aabb) return solids;
  const src = sizeOf(aabb);
  const from = centerOf(aabb);
  const k: Vec3 = [1, 1, 1];
  for (let i = 0; i < 3; i++) {
    if (src[i]! < 1e-6) continue;
    k[i] = Math.min(K_MAX, Math.max(K_MIN, (size[i]! * FILL) / src[i]!));
  }
  const to: Vec3 = [
    from[0] + (center[0] - from[0]) * CENTER_MIX,
    from[1] + (center[1] - from[1]) * CENTER_MIX,
    from[2] + (center[2] - from[2]) * CENTER_MIX,
  ];
  return solids.map((s) => scaleSolid(s, k, from, to));
}

/** Hangar-local solids → fitted hangar-local, filling the slot's ghost cell. */
export function fitSolidsToGhost(slot: string, solids: Solid[]): Solid[] {
  const target = slotTargetWorld(slot);
  const def = SLOT_BY_ID[slot];
  if (!target || !def) return solids;
  const visual = toVisual(slot, cloneSolids(solids));
  const localCenter: Vec3 = [
    target.p[0] - def.socket[0],
    target.p[1] - def.socket[1],
    target.p[2] - def.socket[2],
  ];
  return toLocal(slot, fitVisualToBox(visual, localCenter, target.s));
}

export function fitPartFile(file: ForgePartFile): ForgePartFile {
  const solids = fitSolidsToGhost(file.slot, file.solids);
  return { ...file, solids, space: "hangar" };
}
