import { SLOTS } from "./slots";
import { specsFromSolids } from "./io";
import type { LibraryItem } from "./types";

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

export function hangarSaveForKit(kit: string, catalog: LibraryItem[]) {
  const bySlot = new Map(
    catalog.filter((x) => x.kit === kit).map((x) => [x.slot, x]),
  );
  const slots: Record<string, { variant: string; visible: boolean }> = {};
  const forgeParts: Record<string, { name: string; specs: ReturnType<typeof specsFromSolids> }> = {};

  for (const def of SLOTS) {
    if (SKIP.has(def.id) || def.id.startsWith("extra")) {
      slots[def.id] = { variant: "none", visible: false };
      continue;
    }
    slots[def.id] = { variant: kit, visible: true };
    const part = bySlot.get(def.id);
    if (part) {
      forgeParts[def.id] = {
        name: part.name,
        specs: specsFromSolids(part.solids),
      };
    }
  }

  return {
    version: 9,
    name: kit,
    kit,
    poseId: "attention",
    theme: "dark" as const,
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
