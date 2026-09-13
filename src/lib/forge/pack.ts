import { unzipSync } from "fflate";
import { cloneSolids, SAVE_KIND, type ForgePartFile, type LibraryItem } from "./types";
import { parsePartFile } from "./io";

const EXTRA_KEY = "mosa-forge-pack-extra";
export const BUILTIN_PACK_URL = "/kit-pack.zip";

export function fileToItem(file: ForgePartFile, builtin = false): LibraryItem {
  return {
    id: `${builtin ? "pack" : "imp"}:${file.slot}:${file.kit}`,
    name: file.name,
    slot: file.slot,
    kit: file.kit,
    quad: file.quad,
    letter: file.letter,
    solids: cloneSolids(file.solids),
    updatedAt: builtin ? 0 : Date.now(),
    builtin,
  };
}

export function parsePartFiles(raw: unknown): ForgePartFile[] {
  if (Array.isArray(raw)) {
    return raw.map(parsePartFile).filter((p): p is ForgePartFile => !!p);
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.kind === SAVE_KIND) {
      const one = parsePartFile(raw);
      return one ? [one] : [];
    }
    if (Array.isArray(o.parts)) return parsePartFiles(o.parts);
    if (Array.isArray(o.solids) && typeof o.slot === "string") {
      const one = parsePartFile({ ...o, kind: SAVE_KIND, version: o.version ?? 1 });
      return one ? [one] : [];
    }
  }
  return [];
}

export function partsFromZip(buf: ArrayBuffer): ForgePartFile[] {
  const files = unzipSync(new Uint8Array(buf));
  const out: ForgePartFile[] = [];
  for (const [name, data] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    try {
      const text = new TextDecoder().decode(data);
      out.push(...parsePartFiles(JSON.parse(text)));
    } catch {
      /* skip bad entry */
    }
  }
  return out;
}

export async function ingestFiles(files: File[]): Promise<ForgePartFile[]> {
  const out: ForgePartFile[] = [];
  for (const f of files) {
    const zip = f.name.toLowerCase().endsWith(".zip") || f.type === "application/zip";
    if (zip) {
      out.push(...partsFromZip(await f.arrayBuffer()));
      continue;
    }
    try {
      out.push(...parsePartFiles(JSON.parse(await f.text())));
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function loadBuiltinPack(): Promise<ForgePartFile[]> {
  const res = await fetch(BUILTIN_PACK_URL);
  if (!res.ok) throw new Error(`kit pack ${res.status}`);
  return partsFromZip(await res.arrayBuffer());
}

export function loadPackExtras(): ForgePartFile[] {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    if (!raw) return [];
    return parsePartFiles(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function savePackExtras(files: ForgePartFile[]) {
  try {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(files));
  } catch {
    /* quota — keep memory only */
  }
}

export function mergeParts(base: LibraryItem[], incoming: ForgePartFile[], builtin: boolean): LibraryItem[] {
  const map = new Map(base.map((x) => [`${x.slot}|${x.kit}`, x]));
  for (const file of incoming) {
    map.set(`${file.slot}|${file.kit}`, fileToItem(file, builtin));
  }
  return [...map.values()];
}
