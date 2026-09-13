import { densityFor, kitId, segsFor, type MatKey, type Quad, type Shape, type Solid, type Vec3 } from "./types";

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "solid";
}

function sol(
  name: string,
  t: Shape,
  m: MatKey,
  s: Vec3,
  p: Vec3,
  extra: Partial<Solid> = {},
): Solid {
  return {
    id: extra.id ?? `s-${slug(name)}`,
    name,
    t,
    m,
    s,
    p,
    r: extra.r ?? [0, 0, 0],
    d: extra.d,
    n: extra.n,
    visible: true,
    locked: false,
  };
}

export type SeedId = string;

export interface Seed {
  id: SeedId;
  slot: string;
  label: string;
  arch: string;
  build: (quad: Quad, density: number) => Solid[];
}

function nSeg(quad: Quad, density: number) {
  return segsFor(quad, density);
}

const HELM: Seed[] = [
  {
    id: "helm-blank",
    slot: "helm",
    label: "Blank",
    arch: "blank",
    build: () => [sol("Skull", "box", "prim", [0.16, 0.16, 0.16], [0, 0, 0])],
  },
  {
    id: "helm-blunt",
    slot: "helm",
    label: "Blunt",
    arch: "blunt",
    build: (q, d) => [
      sol("Frame", "box", "dark", [0.14, 0.15, 0.16], [0, -0.01, -0.02]),
      sol("Skull", "trap", "prim", [0.16, 0.2, 0.18], [0, 0.02, -0.01], { d: 0.17, r: [-0.08, 0, 0] }),
      sol("Visor", "box", "glow", [0.09, 0.02, 0.016], [0, 0.03, 0.086]),
      sol("Brow", "trap", "sec", [0.07, 0.1, 0.04], [0, 0.09, 0.055], { d: 0.05, r: [0.22, 0, 0] }),
      sol("Collar", "cyl", "metal", [0.055, 0.055, 0.035], [0, -0.09, 0], { n: nSeg(q, d) }),
    ],
  },
  {
    id: "helm-hex",
    slot: "helm",
    label: "Hex",
    arch: "hex",
    build: (q, d) => [
      sol("Skull", "hex", "prim", [0.1, 0.1, 0.18], [0, 0.01, -0.01], { n: 6 }),
      sol("Crown", "hex", "prim", [0.08, 0.09, 0.08], [0, 0.11, -0.02], { n: 6 }),
      sol("Visor", "box", "glow", [0.08, 0.018, 0.016], [0, 0.02, 0.09]),
      sol("Frame", "cyl", "dark", [0.07, 0.07, 0.04], [0, -0.08, 0], { n: nSeg(q, d) }),
    ],
  },
  {
    id: "helm-wedge",
    slot: "helm",
    label: "Wedge",
    arch: "wedge",
    build: () => [
      sol("Skull", "wedge", "prim", [0.18, 0.18, 0.2], [0, 0.01, 0], { r: [-0.12, 0, 0] }),
      sol("Visor", "box", "glow", [0.1, 0.016, 0.014], [0, 0.02, 0.09]),
      sol("Frame", "box", "dark", [0.12, 0.12, 0.1], [0, -0.02, -0.04]),
    ],
  },
  {
    id: "helm-bucket",
    slot: "helm",
    label: "Bucket",
    arch: "bucket",
    build: (q, d) => [
      sol("Openface", "cyl", "prim", [0.1, 0.1, 0.16], [0, 0.02, 0], { n: nSeg(q, d) }),
      sol("Rim", "cyl", "metal", [0.108, 0.108, 0.02], [0, -0.06, 0], { n: nSeg(q, d) }),
      sol("Visor", "box", "glow", [0.12, 0.03, 0.012], [0, 0.03, 0.09]),
    ],
  },
  {
    id: "helm-shelf",
    slot: "helm",
    label: "Shelf",
    arch: "shelf",
    build: () => [
      sol("Skull", "trap", "prim", [0.15, 0.19, 0.16], [0, 0.01, -0.02], { d: 0.16 }),
      sol("Brow shelf", "box", "sec", [0.16, 0.03, 0.07], [0, 0.09, 0.05]),
      sol("Visor", "box", "glow", [0.1, 0.02, 0.014], [0, 0.04, 0.08]),
    ],
  },
  {
    id: "helm-diamond",
    slot: "helm",
    label: "Diamond",
    arch: "diamond",
    build: () => [
      sol("Crown", "octa", "prim", [0.1, 0, 0], [0, 0.08, -0.02]),
      sol("Jaw", "trap", "prim", [0.1, 0.16, 0.12], [0, -0.04, 0], { d: 0.14 }),
      sol("Visor", "box", "glow", [0.07, 0.018, 0.014], [0, 0.02, 0.08]),
    ],
  },
  {
    id: "helm-split",
    slot: "helm",
    label: "Split",
    arch: "split",
    build: () => [
      sol("Lobe L", "box", "prim", [0.08, 0.16, 0.16], [-0.05, 0.01, 0]),
      sol("Lobe R", "box", "prim", [0.08, 0.16, 0.16], [0.05, 0.01, 0]),
      sol("Seam", "box", "dark", [0.02, 0.14, 0.14], [0, 0.01, 0]),
      sol("Visor", "box", "glow", [0.1, 0.018, 0.014], [0, 0.03, 0.085]),
    ],
  },
  {
    id: "helm-trap",
    slot: "helm",
    label: "Trap",
    arch: "trap",
    build: () => [
      sol("Skull", "trap", "prim", [0.12, 0.22, 0.2], [0, 0, 0], { d: 0.16, r: [-0.1, 0, 0] }),
      sol("Jaw", "trap", "sec", [0.08, 0.14, 0.08], [0, -0.08, 0.02], { d: 0.1 }),
      sol("Visor", "box", "glow", [0.08, 0.018, 0.014], [0, 0.03, 0.08]),
    ],
  },
  {
    id: "helm-snout",
    slot: "helm",
    label: "Snout",
    arch: "snout",
    build: () => [
      sol("Skull", "cowl", "prim", [0.16, 0.16, 0.2], [0, 0.01, 0]),
      sol("Snout", "wedge", "prim", [0.08, 0.07, 0.1], [0, -0.02, 0.1], { r: [0.4, 0, 0] }),
      sol("Visor", "box", "glow", [0.09, 0.016, 0.012], [0, 0.04, 0.07]),
    ],
  },
  {
    id: "helm-hood",
    slot: "helm",
    label: "Hood",
    arch: "hood",
    build: () => [
      sol("Cowl", "cowl", "prim", [0.2, 0.18, 0.22], [0, 0.02, -0.02]),
      sol("Face", "trap", "dark", [0.1, 0.14, 0.1], [0, 0, 0.04], { d: 0.08 }),
      sol("Visor", "box", "glow", [0.1, 0.02, 0.014], [0, 0.03, 0.09]),
    ],
  },
  {
    id: "helm-step",
    slot: "helm",
    label: "Step",
    arch: "step",
    build: () => [
      sol("Base", "box", "prim", [0.18, 0.06, 0.16], [0, -0.06, 0]),
      sol("Mid", "box", "prim", [0.16, 0.06, 0.15], [0, 0.0, -0.01]),
      sol("Crown", "box", "prim", [0.13, 0.06, 0.13], [0, 0.06, -0.02]),
      sol("Visor", "box", "glow", [0.1, 0.018, 0.014], [0, 0.01, 0.08]),
    ],
  },
  {
    id: "helm-gem",
    slot: "helm",
    label: "Gem",
    arch: "gem",
    build: () => [
      sol("Crown", "octa", "prim", [0.11, 0, 0], [0, 0.04, -0.01]),
      sol("Jaw", "trap", "prim", [0.1, 0.16, 0.1], [0, -0.06, 0.01], { d: 0.12 }),
      sol("Visor", "box", "glow", [0.06, 0.016, 0.012], [0, 0.02, 0.07]),
    ],
  },
  {
    id: "helm-anvil",
    slot: "helm",
    label: "Anvil",
    arch: "anvil",
    build: () => [
      sol("T-crown", "box", "prim", [0.22, 0.05, 0.1], [0, 0.1, 0]),
      sol("Stem", "box", "prim", [0.1, 0.14, 0.14], [0, 0, -0.01]),
      sol("Visor", "box", "glow", [0.1, 0.02, 0.014], [0, 0.02, 0.08]),
      sol("Fin", "trap", "trim", [0.04, 0.08, 0.05], [0, 0.14, 0.02], { d: 0.04 }),
    ],
  },
  {
    id: "helm-arrow",
    slot: "helm",
    label: "Arrow",
    arch: "arrow",
    build: () => [
      sol("Skull", "trap", "prim", [0.14, 0.18, 0.16], [0, 0, 0], { d: 0.16 }),
      sol("Chevron L", "wedge", "trim", [0.02, 0.12, 0.05], [-0.05, 0.14, 0.04], { r: [0.2, 0.35, 0.5] }),
      sol("Chevron R", "wedge", "trim", [0.02, 0.12, 0.05], [0.05, 0.14, 0.04], { r: [0.2, -0.35, -0.5] }),
      sol("Visor", "box", "glow", [0.09, 0.018, 0.014], [0, 0.03, 0.085]),
    ],
  },
  {
    id: "helm-beak",
    slot: "helm",
    label: "Beak",
    arch: "beak",
    build: () => [
      sol("Skull", "cowl", "prim", [0.16, 0.16, 0.18], [0, 0.02, -0.02]),
      sol("Beak", "wedge", "sec", [0.06, 0.08, 0.12], [0, -0.04, 0.1], { r: [0.7, 0, 0] }),
      sol("Visor", "box", "glow", [0.08, 0.016, 0.012], [0, 0.04, 0.07]),
    ],
  },
  {
    id: "helm-mask",
    slot: "helm",
    label: "Mask",
    arch: "mask",
    build: () => [
      sol("Skull", "box", "dark", [0.16, 0.16, 0.14], [0, 0, -0.03]),
      sol("Mask", "trap", "prim", [0.14, 0.16, 0.14], [0, 0.01, 0.05], { d: 0.05 }),
      sol("Visor", "box", "glow", [0.1, 0.022, 0.012], [0, 0.03, 0.08]),
      sol("Vent", "box", "metal", [0.06, 0.03, 0.02], [0, -0.05, 0.08]),
    ],
  },
  {
    id: "helm-cap",
    slot: "helm",
    label: "Cap",
    arch: "cap",
    build: (q, d) => [
      sol("Dome", "sph", "prim", [0.11, 0.11, 0.11], [0, 0.04, -0.01], { n: nSeg(q, d) }),
      sol("Jaw", "cyl", "prim", [0.09, 0.1, 0.08], [0, -0.04, 0], { n: nSeg(q, d) }),
      sol("Visor", "box", "glow", [0.1, 0.018, 0.012], [0, 0.02, 0.09]),
    ],
  },
  {
    id: "helm-ram",
    slot: "helm",
    label: "Ram",
    arch: "ram",
    build: () => [
      sol("Skull", "trap", "prim", [0.16, 0.2, 0.16], [0, 0, 0], { d: 0.16 }),
      sol("Ram L", "box", "sec", [0.06, 0.08, 0.16], [-0.1, 0.02, 0.04]),
      sol("Ram R", "box", "sec", [0.06, 0.08, 0.16], [0.1, 0.02, 0.04]),
      sol("Visor", "box", "glow", [0.08, 0.018, 0.014], [0, 0.03, 0.085]),
    ],
  },
  {
    id: "helm-cage",
    slot: "helm",
    label: "Cage",
    arch: "cage",
    build: () => [
      sol("Core", "box", "dark", [0.12, 0.14, 0.12], [0, 0, 0]),
      sol("Bar V", "box", "metal", [0.016, 0.18, 0.016], [0.07, 0.01, 0.05]),
      sol("Bar V2", "box", "metal", [0.016, 0.18, 0.016], [-0.07, 0.01, 0.05]),
      sol("Bar H", "box", "metal", [0.16, 0.016, 0.016], [0, 0.08, 0.05]),
      sol("Bar H2", "box", "metal", [0.16, 0.016, 0.016], [0, -0.06, 0.05]),
      sol("Visor", "box", "glow", [0.08, 0.02, 0.012], [0, 0.02, 0.07]),
    ],
  },
];

const BODY: Seed[] = [
  {
    id: "visor-slit",
    slot: "visor",
    label: "Slit",
    arch: "slit",
    build: () => [sol("Slit", "box", "glow", [0.1, 0.014, 0.018], [0, 0, 0])],
  },
  {
    id: "visor-bar",
    slot: "visor",
    label: "Bar",
    arch: "bar",
    build: () => [
      sol("Bar", "box", "glow", [0.12, 0.024, 0.016], [0, 0, 0]),
      sol("Frame", "box", "dark", [0.14, 0.036, 0.01], [0, 0, -0.008]),
    ],
  },
  {
    id: "visor-dual",
    slot: "visor",
    label: "Dual",
    arch: "dual",
    build: () => [
      sol("Eye L", "box", "glow", [0.04, 0.02, 0.016], [-0.035, 0, 0]),
      sol("Eye R", "box", "glow", [0.04, 0.02, 0.016], [0.035, 0, 0]),
    ],
  },
  {
    id: "chest-plow",
    slot: "chestCore",
    label: "Plow",
    arch: "plow",
    build: () => [
      sol("Core", "box", "dark", [0.22, 0.26, 0.12], [0, 0, -0.02]),
      sol("Plow", "trap", "prim", [0.18, 0.28, 0.26], [0, 0.01, 0.04], { d: 0.12, r: [0.25, 0, 0] }),
      sol("V-cut", "box", "sec", [0.08, 0.18, 0.04], [0, 0.02, 0.1]),
      sol("Gem", "box", "glow", [0.04, 0.05, 0.02], [0, 0.04, 0.12]),
    ],
  },
  {
    id: "chest-wedge",
    slot: "chestCore",
    label: "Wedge",
    arch: "wedge",
    build: () => [
      sol("Core", "wedge", "prim", [0.26, 0.28, 0.18], [0, 0, 0.02], { r: [0.2, 0, 0] }),
      sol("Frame", "box", "dark", [0.18, 0.22, 0.1], [0, 0, -0.04]),
    ],
  },
  {
    id: "chest-slab",
    slot: "chestCore",
    label: "Slab",
    arch: "slab",
    build: () => [
      sol("Slab", "box", "prim", [0.28, 0.26, 0.14], [0, 0, 0.02]),
      sol("Panel L", "box", "sec", [0.1, 0.18, 0.04], [-0.08, 0, 0.08]),
      sol("Panel R", "box", "sec", [0.1, 0.18, 0.04], [0.08, 0, 0.08]),
    ],
  },
  {
    id: "shoulder-trap",
    slot: "shoulderR",
    label: "Pauldron",
    arch: "trap",
    build: (q, d) => [
      sol("Base", "box", "dark", [0.14, 0.035, 0.14], [0.02, -0.07, 0]),
      sol("Axle", "cyl", "metal", [0.03, 0.03, 0.12], [0, -0.06, 0], { r: [0, 0, Math.PI / 2], n: nSeg(q, d) }),
      sol("Shell", "trap", "prim", [0.16, 0.24, 0.18], [0.03, 0.02, 0], { d: 0.18, r: [0, 0, -0.14] }),
      sol("Panel", "trap", "sec", [0.1, 0.14, 0.05], [0.04, 0.03, 0.08], { d: 0.05 }),
    ],
  },
  {
    id: "shoulder-cowl",
    slot: "shoulderR",
    label: "Cowl",
    arch: "cowl",
    build: () => [
      sol("Base", "box", "dark", [0.12, 0.03, 0.12], [0.02, -0.07, 0]),
      sol("Cowl", "cowl", "prim", [0.2, 0.16, 0.2], [0.03, 0.02, 0], { r: [0, 0, -0.18] }),
    ],
  },
  {
    id: "shin-greave",
    slot: "shinR",
    label: "Greave",
    arch: "greave",
    build: (q, d) => [
      sol("Spine", "box", "dark", [0.07, 0.22, 0.08], [0, 0.02, -0.02]),
      sol("Piston L", "cyl", "metal", [0.012, 0.012, 0.2], [-0.024, 0, -0.01], { n: nSeg(q, d) }),
      sol("Piston R", "cyl", "metal", [0.012, 0.012, 0.2], [0.024, 0, -0.01], { n: nSeg(q, d) }),
      sol("Greave", "trap", "prim", [0.14, 0.09, 0.24], [0, 0.015, 0.02], { d: 0.12, r: [-0.12, 0, 0] }),
      sol("Knee plate", "trap", "sec", [0.1, 0.12, 0.06], [0, 0.13, 0.07], { d: 0.06, r: [0.35, 0, 0] }),
    ],
  },
  {
    id: "pack-box",
    slot: "pack",
    label: "Box",
    arch: "box",
    build: (q, d) => [
      sol("Housing", "box", "dark", [0.18, 0.24, 0.12], [0, 0, -0.04]),
      sol("Shell", "trap", "prim", [0.22, 0.18, 0.26], [0, 0.02, -0.08], { d: 0.14, r: [0.15, 0, 0] }),
      sol("Nozzle L", "cyl", "metal", [0.04, 0.05, 0.06], [-0.07, -0.1, -0.12], { r: [0.5, 0, 0], n: nSeg(q, d) }),
      sol("Glow L", "cyl", "glow", [0.032, 0.042, 0.02], [-0.07, -0.12, -0.14], { r: [0.5, 0, 0], n: nSeg(q, d) }),
      sol("Nozzle R", "cyl", "metal", [0.04, 0.05, 0.06], [0.07, -0.1, -0.12], { r: [0.5, 0, 0], n: nSeg(q, d) }),
      sol("Glow R", "cyl", "glow", [0.032, 0.042, 0.02], [0.07, -0.12, -0.14], { r: [0.5, 0, 0], n: nSeg(q, d) }),
    ],
  },
  {
    id: "cockpit-hatch",
    slot: "cockpit",
    label: "Hatch",
    arch: "hatch",
    build: () => [
      sol("Bulkhead", "box", "dark", [0.14, 0.16, 0.08], [0, 0, 0]),
      sol("Hatch", "trap", "prim", [0.12, 0.15, 0.14], [0, 0.01, 0.04], { d: 0.08, r: [0.3, 0, 0] }),
      sol("Glass", "trap", "glow", [0.08, 0.1, 0.06], [0, 0.03, 0.07], { d: 0.03, r: [0.3, 0, 0] }),
    ],
  },
  {
    id: "skirt-flare",
    slot: "skirtR",
    label: "Flare",
    arch: "flare",
    build: (q, d) => [
      sol("Hinge", "box", "dark", [0.08, 0.04, 0.1], [0, 0.05, 0]),
      sol("Pin", "cyl", "metal", [0.012, 0.012, 0.1], [0, 0.04, 0], { r: [0, 0, Math.PI / 2], n: nSeg(q, d) }),
      sol("Plate", "trap", "prim", [0.12, 0.16, 0.2], [0, -0.04, 0], { d: 0.1, r: [0, 0, -0.18] }),
      sol("Sub", "trap", "sec", [0.08, 0.11, 0.12], [0.02, -0.03, 0.01], { d: 0.05, r: [0, 0, -0.18] }),
    ],
  },
];

export const SEEDS: Seed[] = [...HELM, ...BODY];

export function seedsForSlot(slot: string): Seed[] {
  const base = slot.replace(/[LR]$/, "");
  const mapped =
    base === "shoulder"
      ? "shoulderR"
      : base === "shin"
        ? "shinR"
        : base === "skirt"
          ? "skirtR"
          : slot;
  const list = SEEDS.filter((s) => s.slot === mapped || s.slot === slot);
  if (list.length) return list;
  return [
    {
      id: `${slot}-blank`,
      slot,
      label: "Blank",
      arch: "blank",
      build: () => [
        sol("Mass", "trap", "prim", [0.12, 0.14, 0.12], [0, 0.01, 0], { d: 0.08 }),
        sol("Frame", "box", "dark", [0.08, 0.06, 0.08], [0, -0.04, -0.02]),
      ],
    },
  ];
}

export function defaultSeedFor(slot: string): Seed {
  const list = seedsForSlot(slot);
  return list.find((s) => s.arch !== "blank") ?? list[0]!;
}

export function buildSeed(seed: Seed, quad: Quad, letter: string): Solid[] {
  const { density } = densityFor(letter);
  return seed.build(quad, density);
}

export function defaultKitLabel(quad: Quad, letter: string): string {
  return kitId(quad, letter, 1);
}
