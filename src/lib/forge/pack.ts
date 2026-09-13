import { strToU8, unzipSync, zipSync } from "fflate";
import {
  cloneSolids,
  SAVE_KIND,
  uid,
  type ForgePartFile,
  type KitPack,
  type LibraryItem,
} from "./types";
import { parsePartFile, specsFromSolids } from "./io";
import { ensureHangarLocal } from "./scale";
import { fitSolidsToGhost } from "./fit";
import { hangarSaveForKit, hangarSaveFromFiles, HANGAR_KIND, partsFromHangarKit } from "./hangar-export";

const EXTRA_KEY = "mosa-forge-pack-extra";
const DB_NAME = "mosa-forge";
const STORE = "packs";
export const BUILTIN_PACK_ID = "builtin";
export const BUILTIN_PACK_URL = "/kit-pack.zip";

export function normalizePartFile(file: ForgePartFile): ForgePartFile {
  const local = ensureHangarLocal(file.slot, file.solids, file.space);
  const solids = file.space === "hangar" ? local : fitSolidsToGhost(file.slot, local);
  return {
    ...file,
    version: 2,
    solids: cloneSolids(solids),
    specs: specsFromSolids(solids),
    space: "hangar",
  };
}

export function fileToItem(file: ForgePartFile, pack: { id: string; builtin: boolean }): LibraryItem {
  const norm = normalizePartFile(file);
  return {
    id: `${pack.id}:${norm.slot}:${norm.kit}`,
    name: norm.name,
    slot: norm.slot,
    kit: norm.kit,
    quad: norm.quad,
    letter: norm.letter,
    solids: norm.solids,
    updatedAt: pack.builtin ? 0 : Date.now(),
    builtin: pack.builtin,
    packId: pack.id,
    space: "hangar",
  };
}

export function parsePartFiles(raw: unknown): ForgePartFile[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((x) => parsePartFiles(x));
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.kind === HANGAR_KIND) return partsFromHangarKit(raw);
    if (o.kind === SAVE_KIND) {
      const one = parsePartFile(raw);
      return one ? [one] : [];
    }
    if (Array.isArray(o.parts)) return parsePartFiles(o.parts);
    if (Array.isArray(o.solids) && typeof o.slot === "string") {
      const one = parsePartFile({ ...o, kind: SAVE_KIND, version: o.version ?? 1 });
      return one ? [one] : [];
    }
    if (o.forgeParts && typeof o.forgeParts === "object") return partsFromHangarKit({ ...o, kind: HANGAR_KIND });
  }
  return [];
}

export function partsFromZip(buf: ArrayBuffer): ForgePartFile[] {
  const files = unzipSync(new Uint8Array(buf));
  const out: ForgePartFile[] = [];
  for (const [name, data] of Object.entries(files)) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    try {
      out.push(...parsePartFiles(JSON.parse(new TextDecoder().decode(data))));
    } catch {
      /* skip bad entry */
    }
  }
  return out;
}

export function packToZip(files: ForgePartFile[]): Blob {
  const byKit = new Map<string, ForgePartFile[]>();
  for (const p of files) {
    const list = byKit.get(p.kit) ?? [];
    list.push(p);
    byKit.set(p.kit, list);
  }
  const bundle: Record<string, Uint8Array> = {};
  for (const [kit, parts] of byKit) {
    bundle[`${kit}.json`] = strToU8(JSON.stringify(hangarSaveFromFiles(kit, parts)));
  }
  return new Blob([zipSync(bundle) as BlobPart], { type: "application/zip" });
}

export function kitsToZip(catalog: LibraryItem[]): Blob {
  const kits = [...new Set(catalog.map((x) => x.kit))].sort();
  const bundle: Record<string, Uint8Array> = {};
  for (const kit of kits) {
    bundle[`${kit}.json`] = strToU8(JSON.stringify(hangarSaveForKit(kit, catalog)));
  }
  return new Blob([zipSync(bundle) as BlobPart], { type: "application/zip" });
}

export function downloadZip(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stem(name: string) {
  return name.replace(/\.(zip|json)$/i, "").replace(/[/\\]/g, "-") || "pack";
}

export async function ingestBatches(files: File[]): Promise<{ name: string; files: ForgePartFile[] }[]> {
  const batches: { name: string; files: ForgePartFile[] }[] = [];
  const loose: ForgePartFile[] = [];
  for (const f of files) {
    const zip = f.name.toLowerCase().endsWith(".zip") || f.type === "application/zip";
    if (zip) {
      const parts = partsFromZip(await f.arrayBuffer());
      if (parts.length) batches.push({ name: stem(f.name), files: parts.map(normalizePartFile) });
      continue;
    }
    try {
      const raw = JSON.parse(await f.text()) as Record<string, unknown>;
      const parts = parsePartFiles(raw).map(normalizePartFile);
      if (!parts.length) continue;
      if (raw.kind === HANGAR_KIND || raw.forgeParts) {
        batches.push({ name: typeof raw.kit === "string" ? raw.kit : stem(f.name), files: parts });
      } else {
        loose.push(...parts);
      }
    } catch {
      /* skip */
    }
  }
  if (loose.length === 1) batches.push({ name: loose[0]!.name || "part", files: loose });
  else if (loose.length > 1) batches.push({ name: files.length === 1 ? stem(files[0]!.name) : "JSON pack", files: loose });
  return batches;
}

export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const items = [...dt.items];

  const readAll = (reader: FileSystemDirectoryReader) =>
    new Promise<FileSystemEntry[]>((resolve) => {
      const acc: FileSystemEntry[] = [];
      const next = () => {
        reader.readEntries((batch) => {
          if (!batch.length) resolve(acc);
          else {
            acc.push(...batch);
            next();
          }
        }, () => resolve(acc));
      };
      next();
    });

  const walk = async (entry: FileSystemEntry) => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) =>
        (entry as FileSystemFileEntry).file(res, rej),
      );
      out.push(file);
      return;
    }
    if (entry.isDirectory) {
      const kids = await readAll((entry as FileSystemDirectoryEntry).createReader());
      for (const kid of kids) await walk(kid);
    }
  };

  let walked = false;
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      walked = true;
      await walk(entry);
    }
  }
  if (!walked) out.push(...dt.files);
  return out;
}

export async function loadBuiltinPack(): Promise<ForgePartFile[]> {
  const res = await fetch(BUILTIN_PACK_URL);
  if (!res.ok) throw new Error(`kit pack ${res.status}`);
  return partsFromZip(await res.arrayBuffer()).map(normalizePartFile);
}

export function catalogFromPacks(packs: KitPack[]): LibraryItem[] {
  const map = new Map<string, LibraryItem>();
  for (const pack of packs) {
    for (const file of pack.files) {
      map.set(`${file.slot}|${file.kit}`, fileToItem(file, pack));
    }
  }
  return [...map.values()];
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function loadStoredPacks(): Promise<KitPack[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as KitPack[]).filter((p) => p && p.id !== BUILTIN_PACK_ID && Array.isArray(p.files));
      resolve(rows);
    };
    req.onerror = () => resolve([]);
  });
}

export async function putStoredPack(pack: KitPack) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function deleteStoredPack(id: string) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
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

export function clearPackExtras() {
  try {
    localStorage.removeItem(EXTRA_KEY);
  } catch {
    /* ignore */
  }
}

export function makePack(name: string, files: ForgePartFile[], builtin = false): KitPack {
  return {
    id: builtin ? BUILTIN_PACK_ID : uid("pk"),
    name,
    builtin,
    addedAt: builtin ? 0 : Date.now(),
    files,
  };
}
