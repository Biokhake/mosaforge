export type Vec3 = [number, number, number];

export type Quad = "SS" | "SR" | "RS" | "RR";

export type Shape =
  | "box"
  | "cyl"
  | "sph"
  | "cone"
  | "capsule"
  | "wedge"
  | "trap"
  | "cowl"
  | "octa"
  | "torus"
  | "hex"
  | "prism";

export type MatKey =
  | "prim"
  | "sec"
  | "acc"
  | "trim"
  | "dark"
  | "metal"
  | "visor"
  | "glow"
  | "joint";

export type GroupId =
  | "head"
  | "torso"
  | "waist"
  | "armR"
  | "armL"
  | "legR"
  | "legL"
  | "back"
  | "weapon"
  | "extra";

export interface Solid {
  id: string;
  name: string;
  t: Shape;
  m: MatKey;
  p: Vec3;
  r: Vec3;
  s: Vec3;
  d?: number;
  n?: number;
  visible: boolean;
  locked: boolean;
}

export interface SlotDef {
  id: string;
  group: GroupId;
  label: string;
  socket: Vec3;
}

export type GizmoMode = "translate" | "rotate" | "scale";

export const SHAPES: { id: Shape; label: string }[] = [
  { id: "box", label: "Box" },
  { id: "trap", label: "Trap" },
  { id: "wedge", label: "Wedge" },
  { id: "cowl", label: "Cowl" },
  { id: "cyl", label: "Cyl" },
  { id: "hex", label: "Hex" },
  { id: "prism", label: "Prism" },
  { id: "cone", label: "Cone" },
  { id: "sph", label: "Sphere" },
  { id: "capsule", label: "Capsule" },
  { id: "octa", label: "Octa" },
  { id: "torus", label: "Torus" },
];

export const MATS: { id: MatKey; label: string; hex: string }[] = [
  { id: "prim", label: "Part 1", hex: "#d8d4cc" },
  { id: "sec", label: "Part 2", hex: "#3a3e48" },
  { id: "acc", label: "Accent", hex: "#b42222" },
  { id: "trim", label: "Trim", hex: "#c4a35a" },
  { id: "dark", label: "Frame", hex: "#2a2c31" },
  { id: "metal", label: "Metal", hex: "#8b919a" },
  { id: "joint", label: "Joint", hex: "#3d4048" },
  { id: "visor", label: "Visor", hex: "#79d7ff" },
  { id: "glow", label: "Light", hex: "#79d7ff" },
];

export const QUADS: { id: Quad; label: string; hint: string }[] = [
  { id: "SS", label: "SS", hint: "직선 · 각진" },
  { id: "SR", label: "SR", hint: "직선 · 필렛" },
  { id: "RS", label: "RS", hint: "곡선 · 뾰족" },
  { id: "RR", label: "RR", hint: "곡선 · 구·캡슐" },
];

export const LETTERS_SS = "ABCDEFGHIJKLMNOPQRTUVWXYZ";
export const LETTERS_SR = "ABCDEFGHIJKLMNOPQSTUVWXYZ";
export const LETTERS_RS = "ABCDEFGHIJKLMNOPQRTUVWXYZ";
export const LETTERS_RR = "ABCDEFGHIJKLMNOPQSTUVWXYZ";

export function lettersFor(quad: Quad): string {
  if (quad === "SR" || quad === "RR") return LETTERS_SR;
  return LETTERS_SS;
}

export function kitId(quad: Quad, letter: string, serial: number): string {
  return `${quad}${letter}-${String(serial).padStart(3, "0")}`;
}

export function serialFor(quad: Quad, letter: string): number {
  const letters = lettersFor(quad);
  const i = Math.max(0, letters.indexOf(letter));
  const base = quad === "SS" ? 1 : quad === "SR" ? 26 : quad === "RS" ? 51 : 76;
  return base + i;
}

export function segsFor(quad: Quad, density: number): number {
  if (quad === "SS") return 4 + Math.floor(density / 3);
  if (quad === "SR") return 8 + density;
  if (quad === "RS") return 10 + density;
  return 16 + density;
}

export function densityFor(letter: string): { density: number; ornate: boolean } {
  const i = Math.max(0, letter.charCodeAt(0) - 65);
  const ornate = letter >= "M";
  return { ornate, density: ornate ? Math.min(12, i - 11) : i + 1 };
}

export function uid(prefix = "s"): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function cloneSolids(solids: Solid[]): Solid[] {
  return solids.map((s) => ({
    ...s,
    p: [...s.p] as Vec3,
    r: [...s.r] as Vec3,
    s: [...s.s] as Vec3,
  }));
}

export function defaultSize(t: Shape): { s: Vec3; d?: number } {
  switch (t) {
    case "box":
      return { s: [0.12, 0.08, 0.1] };
    case "cyl":
      return { s: [0.05, 0.05, 0.1] };
    case "hex":
      return { s: [0.07, 0.07, 0.1] };
    case "prism":
      return { s: [0.06, 0.06, 0.1] };
    case "sph":
      return { s: [0.05, 0.05, 0.05] };
    case "cone":
      return { s: [0.01, 0.04, 0.1] };
    case "capsule":
      return { s: [0.03, 0.08, 0] };
    case "octa":
      return { s: [0.05, 0, 0] };
    case "torus":
      return { s: [0.05, 0.012, 0] };
    case "trap":
      return { s: [0.1, 0.14, 0.12], d: 0.07 };
    case "wedge":
      return { s: [0.1, 0.12, 0.12] };
    case "cowl":
      return { s: [0.14, 0.12, 0.16] };
    default:
      return { s: [0.1, 0.1, 0.1] };
  }
}

export interface Spec {
  t: string;
  m: MatKey;
  s: Vec3;
  p: Vec3;
  r?: Vec3;
  n?: number;
  d?: number;
}

export const SAVE_KIND = "mosa-forge-part";
export const SAVE_VERSION = 1;

export interface ForgePartFile {
  kind: typeof SAVE_KIND;
  version: number;
  name: string;
  slot: string;
  kit: string;
  quad: Quad;
  letter: string;
  solids: Solid[];
  specs?: Spec[];
}

export interface LibraryItem {
  id: string;
  name: string;
  slot: string;
  kit: string;
  quad?: Quad;
  letter?: string;
  solids: Solid[];
  updatedAt: number;
  builtin?: boolean;
  packId?: string;
}

export interface KitPack {
  id: string;
  name: string;
  builtin: boolean;
  addedAt: number;
  files: ForgePartFile[];
}
