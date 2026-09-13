import { SLOTS } from "./slots";
import { solidsFromSpecs, specsFromSolids } from "./io";
import { defaultScaleFor, ensureHangarLocal } from "./scale";
import { fitSolidsToGhost } from "./fit";
import type { ForgePartFile, LibraryItem, Quad, Solid, Spec } from "./types";

export const HANGAR_KIND = "mosa-hangar";

const SKIP = new Set([
  "weaponR",
  "weaponL",
  "shield",
  "extra1",
  "extra2",
  "extra3",
  "extra4",
  "extra5",
  "extra6",
  "extra7",
  "extra8",
]);

type SlotPayload = {
  variant: string;
  visible: boolean;
  sx?: number;
  sy?: number;
  sz?: number;
};

export type HangarForgePart = {
  name: string;
  slot?: string;
  kit?: string;
  quad?: Quad;
  letter?: string;
  space?: "hangar" | "visual";
  solids?: Solid[];
  specs: Spec[];
};

export type HangarKitFile = {
  kind: typeof HANGAR_KIND;
  version: number;
  name: string;
  kit: string;
  poseId: string;
  theme: "dark" | "light";
  selected: string;
  explode: number;
  autoRotate: boolean;
  edges: boolean;
  symmetry: boolean;
  uniformScale: boolean;
  groupFilter: string;
  slots: Record<string, SlotPayload>;
  forgeParts: Record<string, HangarForgePart>;
};

export function parseKitCode(kit: string): { quad: Quad; letter: string } {
  const m = /^(SS|SR|RS|RR)([A-Z])/i.exec(kit);
  return {
    quad: ((m?.[1] ?? "SS").toUpperCase() as Quad),
    letter: (m?.[2] ?? "A").toUpperCase(),
  };
}

function normalizeSolids(slot: string, solids: Solid[], space?: "hangar" | "visual"): Solid[] {
  const local = ensureHangarLocal(slot, solids, space);
  if (space === "hangar") return local;
  return fitSolidsToGhost(slot, local);
}

export function hangarSaveForKit(kit: string, catalog: LibraryItem[]): HangarKitFile {
  const bySlot = new Map(catalog.filter((x) => x.kit === kit).map((x) => [x.slot, x]));
  const slots: Record<string, SlotPayload> = {};
  const forgeParts: Record<string, HangarForgePart> = {};
  const { quad, letter } = parseKitCode(kit);

  for (const def of SLOTS) {
    if (SKIP.has(def.id) || def.id.startsWith("extra")) {
      slots[def.id] = { variant: "none", visible: false };
      continue;
    }
    const sc = defaultScaleFor(def.id);
    slots[def.id] = { variant: kit, visible: true, sx: sc.sx, sy: sc.sy, sz: sc.sz };
    const part = bySlot.get(def.id);
    if (part) {
      const solids = part.solids;
      forgeParts[def.id] = {
        name: part.name,
        slot: def.id,
        kit,
        quad: part.quad ?? quad,
        letter: part.letter ?? letter,
        space: "hangar",
        solids,
        specs: specsFromSolids(solids),
      };
    }
  }

  return {
    kind: HANGAR_KIND,
    version: 9,
    name: kit,
    kit,
    poseId: "attention",
    theme: "dark",
    selected: "helm",
    explode: 0,
    autoRotate: false,
    edges: true,
    symmetry: true,
    uniformScale: true,
    groupFilter: "head",
    slots,
    forgeParts,
  };
}

export function hangarSaveFromFiles(kit: string, files: ForgePartFile[]): HangarKitFile {
  const { quad, letter } = parseKitCode(kit);
  const items: LibraryItem[] = files
    .filter((f) => f.kit === kit)
    .map((f) => ({
      id: `${f.slot}:${f.kit}`,
      name: f.name,
      slot: f.slot,
      kit: f.kit,
      quad: f.quad ?? quad,
      letter: f.letter ?? letter,
      solids: normalizeSolids(f.slot, f.solids, f.space),
      updatedAt: 0,
      space: "hangar" as const,
    }));
  return hangarSaveForKit(kit, items);
}

export function partsFromHangarKit(raw: unknown): ForgePartFile[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (o.kind !== HANGAR_KIND) return [];
  const kit = typeof o.kit === "string" ? o.kit : typeof o.name === "string" ? o.name : "KIT";
  const { quad, letter } = parseKitCode(kit);
  const parts = (o.forgeParts ?? {}) as Record<string, HangarForgePart>;
  const out: ForgePartFile[] = [];
  for (const [slot, part] of Object.entries(parts)) {
    if (!part) continue;
    const specs = Array.isArray(part.specs) ? part.specs : [];
    const solids = Array.isArray(part.solids) && part.solids.length ? part.solids : solidsFromSpecs(specs);
    if (!solids.length) continue;
    const space = part.space === "hangar" || part.space === "visual" ? part.space : undefined;
    out.push({
      kind: "mosa-forge-part",
      version: 2,
      name: part.name || slot,
      slot: part.slot || slot,
      kit: part.kit || kit,
      quad: part.quad ?? quad,
      letter: part.letter ?? letter,
      solids: normalizeSolids(part.slot || slot, solids, space),
      specs,
      space: "hangar",
    });
  }
  return out;
}
