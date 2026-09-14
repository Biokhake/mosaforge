import type { Anchor, Solid, Vec3 } from "./types";
import { anyGridOn, enabledAxes, type Grids } from "./snap";
export type { FaceBulge } from "./types";
import { normalizeAnchors } from "./bezier";
import { inferLoops } from "./cage";

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function len(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function centroid(pts: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  if (!pts.length) return c;
  for (const p of pts) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  const n = pts.length;
  return [c[0] / n, c[1] / n, c[2] / n];
}

export function faceNormal(pts: Vec3[]): Vec3 {
  if (pts.length < 3) return [0, 1, 0];
  const e1 = sub(pts[1]!, pts[0]!);
  const e2 = sub(pts[2]!, pts[0]!);
  const n = cross(e1, e2);
  const L = len(n) || 1;
  return [n[0] / L, n[1] / L, n[2] / L];
}

function insideTri(p: Vec3, a: Vec3, b: Vec3, c: Vec3, n: Vec3): boolean {
  const to = (x: Vec3, y: Vec3) => sub(y, x);
  const t0 = dot(n, cross(to(a, b), to(a, p)));
  const t1 = dot(n, cross(to(b, c), to(b, p)));
  const t2 = dot(n, cross(to(c, a), to(c, p)));
  return (t0 >= 0 && t1 >= 0 && t2 >= 0) || (t0 <= 0 && t1 <= 0 && t2 <= 0);
}

export function hitLoop(anchors: Anchor[], loops: number[][], local: Vec3): number {
  let best = -1;
  let bestD = 0.06;
  for (let i = 0; i < loops.length; i++) {
    const pts = loops[i]!.map((j) => anchors[j]?.p).filter(Boolean) as Vec3[];
    if (pts.length < 3) continue;
    const n = faceNormal(pts);
    const c = centroid(pts);
    const dist = Math.abs(dot(sub(local, c), n));
    if (dist > bestD) continue;
    const planar: Vec3 = [
      local[0] - n[0] * dot(sub(local, c), n),
      local[1] - n[1] * dot(sub(local, c), n),
      local[2] - n[2] * dot(sub(local, c), n),
    ];
    let inFace = false;
    for (let t = 1; t < pts.length - 1; t++) {
      if (insideTri(planar, pts[0]!, pts[t]!, pts[t + 1]!, n)) {
        inFace = true;
        break;
      }
    }
    if (!inFace) continue;
    bestD = dist;
    best = i;
  }
  return best;
}

export function bulgeAxis(normal: Vec3, grids: Grids): 0 | 1 | 2 {
  const locked = anyGridOn(grids);
  const allow = enabledAxes(grids);
  let best: 0 | 1 | 2 = 0;
  let score = -1;
  for (let i = 0; i < 3; i++) {
    if (locked && !allow[i]) continue;
    const d = Math.abs(normal[i]);
    if (d > score) {
      score = d;
      best = i as 0 | 1 | 2;
    }
  }
  return best;
}

export function innerRing(pts: Vec3[], k: number, ax: 0 | 1 | 2, inset = 0.32): Vec3[] {
  const nrm = faceNormal(pts);
  const c = centroid(pts);
  const sign = Math.sign(nrm[ax]) || 1;
  return pts.map((p) => {
    const q: Vec3 = [
      p[0] + (c[0] - p[0]) * inset,
      p[1] + (c[1] - p[1]) * inset,
      p[2] + (c[2] - p[2]) * inset,
    ];
    q[ax] += sign * k;
    return q;
  });
}

export function bakeOne(solid: Solid, loopIndex: number): Solid {
  const anchors = normalizeAnchors(solid.anchors);
  const loops = inferLoops(anchors, solid.loops);
  const bulge = (solid.bulges ?? []).find((b) => b.loop === loopIndex);
  if (!bulge || Math.abs(bulge.k) < 1e-4) {
    return { ...solid, bulges: (solid.bulges ?? []).filter((b) => b.loop !== loopIndex) };
  }
  const loop = loops[loopIndex];
  if (!loop || loop.length < 3) return solid;
  const pts = loop.map((i) => anchors[i]?.p).filter(Boolean) as Vec3[];
  if (pts.length < 3) return solid;
  const inner = innerRing(pts, bulge.k, bulge.ax);
  const base = anchors.length;
  const added: Anchor[] = inner.map((p) => ({
    p,
    kind: "corner",
    hin: [0, 0, 0],
    hout: [0, 0, 0],
  }));
  const innerIdx = inner.map((_, i) => base + i);
  const sides: number[][] = [];
  for (let i = 0; i < loop.length; i++) {
    const j = (i + 1) % loop.length;
    sides.push([loop[i]!, loop[j]!, innerIdx[j]!, innerIdx[i]!]);
  }
  const nextLoops = loops.map((l, i) => (i === loopIndex ? innerIdx : [...l]));
  nextLoops.push(...sides);
  return {
    ...solid,
    anchors: [...anchors, ...added],
    loops: nextLoops,
    bulges: (solid.bulges ?? []).filter((b) => b.loop !== loopIndex),
    path: true,
  };
}

export function bakeAll(solid: Solid): Solid {
  let next = solid;
  const loops = [...new Set((next.bulges ?? []).map((b) => b.loop))];
  for (const loop of loops) next = bakeOne(next, loop);
  return next;
}
