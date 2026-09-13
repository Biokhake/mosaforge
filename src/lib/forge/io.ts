import {
  cloneSolids,
  SAVE_KIND,
  SAVE_VERSION,
  type ForgePartFile,
  type LibraryItem,
  type Quad,
  type Solid,
  type Spec,
} from "./types";

const LIB_KEY = "mosa-forge-library";
const SESSION_KEY = "mosa-forge-session-v2";

export interface SessionState {
  name: string;
  slot: string;
  quad: Quad;
  letter: string;
  solids: Solid[];
  selectedId: string | null;
  space?: "hangar" | "visual";
}

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionState;
    if (!Array.isArray(data.solids)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSession(state: SessionState) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function loadLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as LibraryItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveLibrary(items: LibraryItem[]) {
  localStorage.setItem(LIB_KEY, JSON.stringify(items));
}

export function toPartFile(state: {
  name: string;
  slot: string;
  kit: string;
  quad: Quad;
  letter: string;
  solids: Solid[];
}): ForgePartFile {
  const solids = cloneSolids(state.solids);
  return {
    kind: SAVE_KIND,
    version: SAVE_VERSION,
    name: state.name,
    slot: state.slot,
    kit: state.kit,
    quad: state.quad,
    letter: state.letter,
    solids,
    specs: specsFromSolids(solids),
    space: "hangar",
  };
}

export function parsePartFile(raw: unknown): ForgePartFile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== SAVE_KIND) return null;
  if (!Array.isArray(o.solids)) return null;
  return o as unknown as ForgePartFile;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPng(filename: string, canvas: HTMLCanvasElement) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function specsFromSolids(solids: Solid[]): Spec[] {
  return solids
    .filter((s) => s.visible)
    .map((s) => {
      const t = s.t === "hex" || s.t === "prism" ? "cyl" : s.t;
      const spec: Spec = {
        t,
        m: s.m,
        s: [s.s[0], s.s[1], s.s[2]],
        p: [s.p[0], s.p[1], s.p[2]],
      };
      if (s.r[0] || s.r[1] || s.r[2]) spec.r = [s.r[0], s.r[1], s.r[2]];
      if (s.t === "hex") spec.n = 6;
      else if (s.n) spec.n = s.n;
      if (s.d != null && (s.t === "trap" || s.t === "cowl")) spec.d = s.d;
      return spec;
    });
}
