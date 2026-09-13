import type { Anchor, AnchorKind, Vec3 } from "./types";

export type { Anchor, AnchorKind };

export function isRawVec(a: unknown): a is Vec3 {
  return Array.isArray(a) && a.length >= 3 && typeof a[0] === "number";
}

export function normalizeAnchor(a: unknown): Anchor {
  if (isRawVec(a)) {
    return { p: [a[0], a[1], a[2]], kind: "corner", hin: [0, 0, 0], hout: [0, 0, 0] };
  }
  const o = a as Partial<Anchor> | null;
  const p = o?.p;
  return {
    p: p && p.length >= 3 ? [p[0], p[1], p[2]] : [0, 0, 0],
    kind: o?.kind === "smooth" ? "smooth" : "corner",
    hin: o?.hin ? [o.hin[0], o.hin[1], o.hin[2]] : [0, 0, 0],
    hout: o?.hout ? [o.hout[0], o.hout[1], o.hout[2]] : [0, 0, 0],
  };
}

export function normalizeAnchors(list?: unknown): Anchor[] {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeAnchor);
}

export function cloneAnchors(list?: unknown): Anchor[] | undefined {
  if (!list) return undefined;
  return normalizeAnchors(list).map((a) => ({
    p: [...a.p] as Vec3,
    kind: a.kind,
    hin: [...a.hin] as Vec3,
    hout: [...a.hout] as Vec3,
  }));
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

function len(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function convertAnchor(anchors: Anchor[], i: number): Anchor[] {
  const cur = anchors[i];
  if (!cur) return anchors;
  if (cur.kind === "smooth") {
    return anchors.map((a, k) =>
      k === i ? { ...a, kind: "corner" as const, hin: [0, 0, 0] as Vec3, hout: [0, 0, 0] as Vec3 } : a,
    );
  }
  const n = anchors.length;
  const prev = n > 1 ? anchors[(i - 1 + n) % n] : null;
  const next = n > 1 ? anchors[(i + 1) % n] : null;
  let t: Vec3 = [0.02, 0, 0];
  if (prev && next && n >= 2) {
    t = scale(sub(next.p, prev.p), 1 / 6);
    if (len(t) < 0.006) t = [0.02, 0, 0];
  }
  return anchors.map((a, k) =>
    k === i
      ? { ...a, kind: "smooth" as const, hin: scale(t, -1), hout: t }
      : a,
  );
}

export function snap45(v: Vec3): Vec3 {
  const L = len(v);
  if (L < 1e-8) return v;
  const dirs: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
    [1, 1, 0],
    [1, -1, 0],
    [-1, 1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [1, 0, -1],
    [-1, 0, 1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, 1, -1],
    [0, -1, 1],
    [0, -1, -1],
  ];
  let best = dirs[0]!;
  let score = -Infinity;
  for (const d of dirs) {
    const nd = scale(d, 1 / (len(d) || 1));
    const s = v[0] * nd[0] + v[1] * nd[1] + v[2] * nd[2];
    if (s > score) {
      score = s;
      best = nd;
    }
  }
  return scale(best, L);
}

export function cubicPoint(a: Anchor, b: Anchor, t: number): Vec3 {
  const p0 = a.p;
  const p1 = add(a.p, a.hout);
  const p2 = add(b.p, b.hin);
  const p3 = b.p;
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    u * u * u * p0[2] + 3 * u * u * t * p1[2] + 3 * u * t * t * p2[2] + t * t * t * p3[2],
  ];
}

export function samplePath(anchors: Anchor[], segs = 12): number[] {
  const n = anchors.length;
  if (n < 2) return [];
  const pts: number[] = [];
  const spans = n >= 3 ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const a = anchors[i]!;
    const b = anchors[(i + 1) % n]!;
    for (let s = 0; s <= segs; s++) {
      const p = cubicPoint(a, b, s / segs);
      pts.push(p[0], p[1], p[2]);
    }
  }
  return pts;
}
