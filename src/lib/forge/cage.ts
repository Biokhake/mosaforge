import type { Anchor, Vec3 } from "./types";
import { normalizeAnchors } from "./bezier";

export const BOX_LOOPS: number[][] = [
  [0, 1, 3, 2],
  [4, 6, 7, 5],
  [0, 4, 5, 1],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 5, 7, 3],
];

export function loopsOf(anchors: Anchor[], loops?: number[][]): number[][] {
  if (loops && loops.length) return loops.map((l) => [...l]);
  if (anchors.length === 8) return BOX_LOOPS.map((l) => [...l]);
  if (anchors.length >= 3) return [anchors.map((_, i) => i)];
  return [];
}

function key(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function uniqueEdges(loops: number[][]): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const loop of loops) {
    const n = loop.length;
    for (let i = 0; i < n; i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % n]!;
      const k = key(a, b);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([a, b]);
    }
  }
  return out;
}

function closestOnSeg(a: Vec3, b: Vec3, p: Vec3): { t: number; q: Vec3; dist: number } {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const ab2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t = ab2 < 1e-12 ? 0 : Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ab2));
  const q: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  const dist = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  return { t, q, dist };
}

export function closestEdge(
  anchors: Anchor[],
  loops: number[][],
  p: Vec3,
): { a: number; b: number; t: number; q: Vec3; dist: number } | null {
  let best: { a: number; b: number; t: number; q: Vec3; dist: number } | null = null;
  for (const [ia, ib] of uniqueEdges(loops)) {
    const A = anchors[ia]?.p;
    const B = anchors[ib]?.p;
    if (!A || !B) continue;
    const hit = closestOnSeg(A, B, p);
    if (hit.t < 0.04 || hit.t > 0.96) continue;
    if (!best || hit.dist < best.dist) best = { a: ia, b: ib, t: hit.t, q: hit.q, dist: hit.dist };
  }
  return best;
}

export function splitEdge(loops: number[][], a: number, b: number, k: number): number[][] {
  return loops.map((loop) => {
    const next: number[] = [];
    const n = loop.length;
    for (let i = 0; i < n; i++) {
      const u = loop[i]!;
      const v = loop[(i + 1) % n]!;
      next.push(u);
      if ((u === a && v === b) || (u === b && v === a)) next.push(k);
    }
    return next;
  });
}

export function dropVertex(loops: number[][], index: number): number[][] {
  return loops
    .map((loop) =>
      loop.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    )
    .filter((loop) => loop.length >= 3);
}

export function edgePositions(anchors: Anchor[], loops: number[][]): number[] {
  const pos: number[] = [];
  for (const [ia, ib] of uniqueEdges(loops)) {
    const a = anchors[ia]?.p;
    const b = anchors[ib]?.p;
    if (!a || !b) continue;
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  return pos;
}

export function inferLoops(raw?: unknown, loopSrc?: number[][]): number[][] {
  return loopsOf(normalizeAnchors(raw), loopSrc);
}

export function weldAnchors(
  anchors: Anchor[],
  loops: number[][],
  eps = 0.0015,
): { anchors: Anchor[]; loops: number[][]; changed: boolean } {
  const n = anchors.length;
  if (n < 2) return { anchors, loops, changed: false };
  const parent = anchors.map((_, i) => i);
  const find = (i: number): number => {
    let x = i;
    while (parent[x] !== x) x = parent[x]!;
    return x;
  };
  const unite = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };
  for (let i = 0; i < n; i++) {
    const a = anchors[i]!.p;
    for (let j = i + 1; j < n; j++) {
      const b = anchors[j]!.p;
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= eps) unite(i, j);
    }
  }
  const first = new Map<number, number>();
  const out: Anchor[] = [];
  const remap: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!first.has(r)) {
      first.set(r, out.length);
      out.push(anchors[r]!);
    }
    remap[i] = first.get(r)!;
  }
  if (out.length === n) return { anchors, loops, changed: false };
  const nextLoops = loops
    .map((loop) => {
      const seq: number[] = [];
      for (const idx of loop) {
        const v = remap[idx];
        if (v === undefined) continue;
        if (seq[seq.length - 1] !== v) seq.push(v);
      }
      if (seq.length > 1 && seq[0] === seq[seq.length - 1]) seq.pop();
      return seq;
    })
    .filter((l) => new Set(l).size >= 3);
  return { anchors: out, loops: nextLoops, changed: true };
}
