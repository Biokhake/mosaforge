import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Anchor, Quad, Solid, Vec3 } from "./types";
import { normalizeAnchors, cubicPoint } from "./bezier";
import { inferLoops } from "./cage";
import { innerRing, type FaceBulge } from "./face";

function facesToGeo(positions: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createTrapGeometry(wTop: number, wBot: number, h: number, d = 0.06): THREE.BufferGeometry {
  const hwT = wTop / 2;
  const hwB = wBot / 2;
  const hh = h / 2;
  const hd = d / 2;
  return facesToGeo([
    -hwB, -hh, hd, hwB, -hh, hd, hwT, hh, hd, -hwB, -hh, hd, hwT, hh, hd, -hwT, hh, hd,
    hwB, -hh, -hd, -hwB, -hh, -hd, -hwT, hh, -hd, hwB, -hh, -hd, -hwT, hh, -hd, hwT, hh, -hd,
    -hwB, -hh, -hd, -hwB, -hh, hd, -hwT, hh, hd, -hwB, -hh, -hd, -hwT, hh, hd, -hwT, hh, -hd,
    hwB, -hh, hd, hwB, -hh, -hd, hwT, hh, -hd, hwB, -hh, hd, hwT, hh, -hd, hwT, hh, hd,
    -hwT, hh, hd, hwT, hh, hd, hwT, hh, -hd, -hwT, hh, hd, hwT, hh, -hd, -hwT, hh, -hd,
    -hwB, -hh, -hd, hwB, -hh, -hd, hwB, -hh, hd, -hwB, -hh, -hd, hwB, -hh, hd, -hwB, -hh, hd,
  ]);
}

export function createWedgeGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  return facesToGeo([
    -hw, -hh, 0, 0, -hh, hd, 0, hh, hd, -hw, -hh, 0, 0, hh, hd, -hw, hh, 0,
    0, -hh, hd, hw, -hh, 0, hw, hh, 0, 0, -hh, hd, hw, hh, 0, 0, hh, hd,
    hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
    -hw, -hh, -hd, -hw, -hh, 0, -hw, hh, 0, -hw, -hh, -hd, -hw, hh, 0, -hw, hh, -hd,
    hw, -hh, 0, hw, -hh, -hd, hw, hh, -hd, hw, -hh, 0, hw, hh, -hd, hw, hh, 0,
    -hw, hh, 0, 0, hh, hd, -hw, hh, -hd, 0, hh, hd, 0, hh, -hd, -hw, hh, -hd,
    0, hh, hd, hw, hh, 0, hw, hh, -hd, 0, hh, hd, hw, hh, -hd, 0, hh, -hd,
    -hw, -hh, -hd, 0, -hh, hd, -hw, -hh, 0, -hw, -hh, -hd, 0, -hh, -hd, 0, -hh, hd,
    0, -hh, hd, 0, -hh, -hd, hw, -hh, -hd, 0, -hh, hd, hw, -hh, -hd, hw, -hh, 0,
  ]);
}

export function createCowlGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const fn = hw * 0.42;
  const ft = hh * 0.55;
  return facesToGeo([
    -fn, -ft, hd, fn, -ft, hd, fn * 0.7, hh * 0.7, hd * 0.7,
    -fn, -ft, hd, fn * 0.7, hh * 0.7, hd * 0.7, -fn * 0.7, hh * 0.7, hd * 0.7,
    -hw, -hh, -hd, -fn, -ft, hd, -fn * 0.7, hh * 0.7, hd * 0.7,
    -hw, -hh, -hd, -fn * 0.7, hh * 0.7, hd * 0.7, -hw * 0.9, hh * 0.85, -hd * 0.2,
    fn, -ft, hd, hw, -hh, -hd, hw * 0.9, hh * 0.85, -hd * 0.2,
    fn, -ft, hd, hw * 0.9, hh * 0.85, -hd * 0.2, fn * 0.7, hh * 0.7, hd * 0.7,
    -fn * 0.7, hh * 0.7, hd * 0.7, fn * 0.7, hh * 0.7, hd * 0.7, hw * 0.9, hh * 0.85, -hd * 0.2,
    -fn * 0.7, hh * 0.7, hd * 0.7, hw * 0.9, hh * 0.85, -hd * 0.2, -hw * 0.9, hh * 0.85, -hd * 0.2,
    -hw * 0.9, hh * 0.85, -hd * 0.2, hw * 0.9, hh * 0.85, -hd * 0.2, hw, hh * 0.6, -hd,
    -hw * 0.9, hh * 0.85, -hd * 0.2, hw, hh * 0.6, -hd, -hw, hh * 0.6, -hd,
    -hw, -hh, -hd, hw, -hh, -hd, hw, hh * 0.6, -hd, -hw, -hh, -hd, hw, hh * 0.6, -hd, -hw, hh * 0.6, -hd,
    -hw, -hh, -hd, hw, -hh, -hd, fn, -ft, hd, -hw, -hh, -hd, fn, -ft, hd, -fn, -ft, hd,
  ]);
}

function pushTri(pos: number[], a: Vec3, b: Vec3, c: Vec3) {
  pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

function hexaFrom8(pts: Vec3[]): THREE.BufferGeometry {
  const p = pts;
  const pos: number[] = [];
  const quads: [number, number, number, number][] = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  for (const [a, b, c, d] of quads) {
    pushTri(pos, p[a]!, p[b]!, p[c]!);
    pushTri(pos, p[a]!, p[c]!, p[d]!);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function sampleRing(anchors: ReturnType<typeof normalizeAnchors>, segs: number): Vec3[] {
  const n = anchors.length;
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const a = anchors[i]!;
    const b = anchors[(i + 1) % n]!;
    for (let s = 0; s < segs; s++) {
      const p = cubicPoint(a, b, s / segs);
      pts.push([p[0], p[1], p[2]]);
    }
  }
  return pts;
}

function extrudeRing(ring: Vec3[], depth: number): THREE.BufferGeometry | null {
  const n = ring.length;
  if (n < 3) return null;
  const back: Vec3[] = ring.map((p) => [p[0], p[1], p[2] - depth]);
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pushTri(pos, ring[i]!, ring[j]!, back[j]!);
    pushTri(pos, ring[i]!, back[j]!, back[i]!);
  }
  const c: Vec3 = [0, 0, 0];
  const cb: Vec3 = [0, 0, 0];
  for (const p of ring) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  for (const p of back) {
    cb[0] += p[0];
    cb[1] += p[1];
    cb[2] += p[2];
  }
  c[0] /= n;
  c[1] /= n;
  c[2] /= n;
  cb[0] /= n;
  cb[1] /= n;
  cb[2] /= n;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pushTri(pos, c, ring[i]!, ring[j]!);
    pushTri(pos, cb, back[j]!, back[i]!);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function lerpV(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function atCurve(curve: Vec3[], t: number): Vec3 {
  const n = curve.length - 1;
  if (n <= 0) return curve[0] ?? [0, 0, 0];
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.min(n - 1, Math.floor(x));
  return lerpV(curve[i]!, curve[i + 1]!, x - i);
}

function resampleEdge(a: Anchor, b: Anchor, div: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let s = 0; s <= div; s++) pts.push(cubicPoint(a, b, s / div));
  return pts;
}

function rev(curve: Vec3[]): Vec3[] {
  return curve.slice().reverse();
}

function coonsPoint(u: number, v: number, c0: Vec3[], c1: Vec3[], d0: Vec3[], d1: Vec3[]): Vec3 {
  const lu = lerpV(atCurve(c0, u), atCurve(c1, u), v);
  const lv = lerpV(atCurve(d0, v), atCurve(d1, v), u);
  const p00 = c0[0]!;
  const p10 = c0[c0.length - 1]!;
  const p01 = c1[0]!;
  const p11 = c1[c1.length - 1]!;
  const b: Vec3 = [
    p00[0] * (1 - u) * (1 - v) + p10[0] * u * (1 - v) + p01[0] * (1 - u) * v + p11[0] * u * v,
    p00[1] * (1 - u) * (1 - v) + p10[1] * u * (1 - v) + p01[1] * (1 - u) * v + p11[1] * u * v,
    p00[2] * (1 - u) * (1 - v) + p10[2] * u * (1 - v) + p01[2] * (1 - u) * v + p11[2] * u * v,
  ];
  return [lu[0] + lv[0] - b[0], lu[1] + lv[1] - b[1], lu[2] + lv[2] - b[2]];
}

function fillCoons(pos: number[], a: Anchor, b: Anchor, c: Anchor, d: Anchor, div: number) {
  const c0 = resampleEdge(a, b, div);
  const d1 = resampleEdge(b, c, div);
  const c1 = rev(resampleEdge(c, d, div));
  const d0 = rev(resampleEdge(d, a, div));
  const grid: Vec3[][] = [];
  for (let j = 0; j <= div; j++) {
    const row: Vec3[] = [];
    for (let i = 0; i <= div; i++) row.push(coonsPoint(i / div, j / div, c0, c1, d0, d1));
    grid.push(row);
  }
  for (let j = 0; j < div; j++) {
    for (let i = 0; i < div; i++) {
      const p00 = grid[j]![i]!;
      const p10 = grid[j]![i + 1]!;
      const p01 = grid[j + 1]![i]!;
      const p11 = grid[j + 1]![i + 1]!;
      pushTri(pos, p00, p10, p11);
      pushTri(pos, p00, p11, p01);
    }
  }
}

function fillFan(pos: number[], ring: Vec3[]) {
  if (ring.length < 3) return;
  const c: Vec3 = [0, 0, 0];
  for (const p of ring) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  const n = ring.length;
  c[0] /= n;
  c[1] /= n;
  c[2] /= n;
  for (let i = 0; i < n; i++) pushTri(pos, c, ring[i]!, ring[(i + 1) % n]!);
}

function meshFromLoops(anchors: Anchor[], loops: number[][], bulges?: FaceBulge[]): THREE.BufferGeometry | null {
  const pos: number[] = [];
  for (let li = 0; li < loops.length; li++) {
    const loop = loops[li]!;
    if (loop.length < 3) continue;
    const pts = loop.map((i) => anchors[i]?.p).filter(Boolean) as Vec3[];
    if (pts.length < 3) continue;
    const bulge = bulges?.find((b) => b.loop === li && Math.abs(b.k) > 1e-4);
    if (bulge) {
      const inner = innerRing(pts, bulge.k, bulge.ax);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        pushTri(pos, pts[i]!, pts[j]!, inner[j]!);
        pushTri(pos, pts[i]!, inner[j]!, inner[i]!);
      }
      for (let i = 1; i < inner.length - 1; i++) pushTri(pos, inner[0]!, inner[i]!, inner[i + 1]!);
      continue;
    }
    if (pts.length === 4) {
      pushTri(pos, pts[0]!, pts[1]!, pts[2]!);
      pushTri(pos, pts[0]!, pts[2]!, pts[3]!);
    } else {
      fillFan(pos, pts);
    }
  }
  if (pos.length < 9) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function cageEdited(solid: Solid): boolean {
  const anchors = normalizeAnchors(solid.anchors);
  if (!anchors.length) return false;
  if (solid.bulges?.some((b) => Math.abs(b.k) > 1e-4)) return true;
  if (anchors.length !== 8) return true;
  const hx = Math.max(0.004, Math.abs(solid.s[0]) / 2);
  const hy = Math.max(0.004, Math.abs(solid.s[1]) / 2);
  const hz = Math.max(0.004, Math.abs(solid.s[2] || solid.s[0]) / 2);
  const expected: Vec3[] = [
    [-hx, -hy, -hz],
    [hx, -hy, -hz],
    [-hx, hy, -hz],
    [hx, hy, -hz],
    [-hx, -hy, hz],
    [hx, -hy, hz],
    [-hx, hy, hz],
    [hx, hy, hz],
  ];
  return anchors.some((a, i) => {
    const e = expected[i]!;
    return Math.hypot(a.p[0] - e[0], a.p[1] - e[1], a.p[2] - e[2]) > 0.002;
  });
}

function pathGeometry(solid: Solid): THREE.BufferGeometry | null {
  if (!solid.path) return null;
  if (solid.t === "box" && !cageEdited(solid)) return null;
  const anchors = normalizeAnchors(solid.anchors);
  if (anchors.length < 3) return null;
  const loops = inferLoops(anchors, solid.loops);
  if (loops.length >= 2) {
    const cage = meshFromLoops(anchors, loops, solid.bulges);
    if (cage) return cage;
  }
  if (anchors.length === 8 && anchors.every((a) => a.kind === "corner")) {
    return hexaFrom8(anchors.map((a) => a.p));
  }
  const depth = Math.max(0.004, Math.abs(solid.s[2] || 0.06));
  const segs = anchors.some((a) => a.kind === "smooth") ? 8 : 1;
  return extrudeRing(sampleRing(anchors, segs), depth);
}

export function createChamferBox(w: number, h: number, d: number, ch: number): THREE.BufferGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const t = Math.min(Math.max(ch, 0), hw * 0.49, hh * 0.49, hd * 0.49);
  const pos: number[] = [];
  const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
    pushTri(pos, a, b, c);
    pushTri(pos, a, c, d);
  };
  const v = (x: number, y: number, z: number): Vec3 => [x, y, z];
  quad(v(hw, -hh + t, -hd + t), v(hw, -hh + t, hd - t), v(hw, hh - t, hd - t), v(hw, hh - t, -hd + t));
  quad(v(-hw, -hh + t, hd - t), v(-hw, -hh + t, -hd + t), v(-hw, hh - t, -hd + t), v(-hw, hh - t, hd - t));
  quad(v(-hw + t, hh, -hd + t), v(hw - t, hh, -hd + t), v(hw - t, hh, hd - t), v(-hw + t, hh, hd - t));
  quad(v(-hw + t, -hh, hd - t), v(hw - t, -hh, hd - t), v(hw - t, -hh, -hd + t), v(-hw + t, -hh, -hd + t));
  quad(v(-hw + t, -hh + t, hd), v(hw - t, -hh + t, hd), v(hw - t, hh - t, hd), v(-hw + t, hh - t, hd));
  quad(v(hw - t, -hh + t, -hd), v(-hw + t, -hh + t, -hd), v(-hw + t, hh - t, -hd), v(hw - t, hh - t, -hd));
  for (const sy of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const y = sy * hh;
      const z = sz * hd;
      const yi = sy * (hh - t);
      const zi = sz * (hd - t);
      const a = v(-hw + t, y, zi);
      const b = v(hw - t, y, zi);
      const c = v(hw - t, yi, z);
      const d = v(-hw + t, yi, z);
      if (sy * sz > 0) quad(a, b, c, d);
      else quad(d, c, b, a);
    }
  }
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const x = sx * hw;
      const z = sz * hd;
      const xi = sx * (hw - t);
      const zi = sz * (hd - t);
      const a = v(x, -hh + t, zi);
      const b = v(x, hh - t, zi);
      const c = v(xi, hh - t, z);
      const d = v(xi, -hh + t, z);
      if (sx * sz < 0) quad(a, b, c, d);
      else quad(d, c, b, a);
    }
  }
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      const x = sx * hw;
      const y = sy * hh;
      const xi = sx * (hw - t);
      const yi = sy * (hh - t);
      const a = v(xi, y, -hd + t);
      const b = v(xi, y, hd - t);
      const c = v(x, yi, hd - t);
      const d = v(x, yi, -hd + t);
      if (sx * sy > 0) quad(a, b, c, d);
      else quad(d, c, b, a);
    }
  }
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const px: Vec3 = [sx * hw, sy * (hh - t), sz * (hd - t)];
        const py: Vec3 = [sx * (hw - t), sy * hh, sz * (hd - t)];
        const pz: Vec3 = [sx * (hw - t), sy * (hh - t), sz * hd];
        if (sx * sy * sz > 0) pushTri(pos, px, py, pz);
        else pushTri(pos, px, pz, py);
      }
    }
  }
  return facesToGeo(pos);
}

export function flipSolid(solid: Solid, axis: 0 | 1 | 2): Solid {
  const flip = (v: Vec3): Vec3 => {
    const n: Vec3 = [v[0], v[1], v[2]];
    n[axis] = -(n[axis] || 0);
    return n;
  };
  const anchors = solid.anchors
    ? normalizeAnchors(solid.anchors).map((a) => ({
        ...a,
        p: flip(a.p),
        hin: flip(a.hin),
        hout: flip(a.hout),
      }))
    : solid.anchors;
  let mesh = solid.mesh;
  if (mesh?.pos?.length) {
    const pos = mesh.pos.slice();
    for (let i = axis; i < pos.length; i += 3) pos[i] = -(pos[i] || 0);
    let nrm = mesh.nrm ? mesh.nrm.slice() : undefined;
    if (nrm) for (let i = axis; i < nrm.length; i += 3) nrm[i] = -(nrm[i] || 0);
    mesh = { ...mesh, pos, nrm };
  }
  const s: Vec3 = [solid.s[0], solid.s[1], solid.s[2]];
  s[axis] = -(s[axis] || 0.004);
  const r: Vec3 = [solid.r[0], solid.r[1], solid.r[2]];
  if (axis === 0) {
    r[1] = -r[1];
    r[2] = -r[2];
  } else if (axis === 1) {
    r[0] = -r[0];
    r[2] = -r[2];
  } else {
    r[0] = -r[0];
    r[1] = -r[1];
  }
  return { ...solid, s, r, anchors, mesh };
}

export function geometryFor(solid: Solid, quad: Quad): THREE.BufferGeometry {
  const shaped = pathGeometry(solid);
  if (shaped) return shaped;
  const sx = Math.sign(solid.s[0]) || 1;
  const sy = Math.sign(solid.s[1]) || 1;
  const sz = Math.sign(solid.s[2]) || 1;
  const a = Math.abs(solid.s[0]);
  const b = Math.abs(solid.s[1]);
  const c = Math.abs(solid.s[2]);
  const n = Math.max(3, Math.round(solid.n ?? (quad === "SS" ? 6 : quad === "SR" ? 12 : 16)));
  const round = solid.b ?? 0;
  const chamfer = solid.ch ?? 0;
  let geo: THREE.BufferGeometry;
  switch (solid.t) {
    case "box": {
      if (round > 0.0008) {
        geo = new RoundedBoxGeometry(
          a,
          b,
          c,
          Math.max(1, Math.min(4, Math.round(solid.n ?? 2))),
          Math.min(round, Math.min(a, b, c) * 0.49),
        );
      } else if (chamfer > 0.0008) {
        geo = createChamferBox(a, b, c, chamfer);
      } else if (quad === "SR") {
        const rad = Math.min(a, b, c) * 0.08;
        geo = new RoundedBoxGeometry(a, b, c, 2, Math.max(0.004, rad));
      } else {
        geo = new THREE.BoxGeometry(a, b, c);
      }
      break;
    }
    case "cyl":
      geo = new THREE.CylinderGeometry(a, b || a, c, n);
      break;
    case "hex":
      geo = new THREE.CylinderGeometry(a, b || a, c, 6);
      break;
    case "prism":
      geo = new THREE.CylinderGeometry(a, b || a, c, Math.max(5, n));
      break;
    case "sph":
      geo = new THREE.SphereGeometry(a, n, Math.max(6, Math.floor(n * 0.7)));
      break;
    case "cone":
      geo = new THREE.ConeGeometry(b || a, c, n);
      break;
    case "capsule":
      geo = new THREE.CapsuleGeometry(a, Math.max(0.01, b), 4, n);
      break;
    case "octa":
      geo = new THREE.OctahedronGeometry(a, 0);
      break;
    case "torus":
      geo = new THREE.TorusGeometry(a, Math.max(0.004, b), Math.max(6, Math.floor(n / 2)), n);
      break;
    case "trap":
      geo = createTrapGeometry(a, b, c, solid.d ?? 0.06);
      break;
    case "wedge":
      geo = createWedgeGeometry(a, b, c);
      break;
    case "cowl":
      geo = createCowlGeometry(a, b, c);
      break;
    case "mesh": {
      const data = solid.mesh;
      if (!data?.pos?.length) {
        geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        break;
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(data.pos, 3));
      if (data.nrm && data.nrm.length === data.pos.length) {
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(data.nrm, 3));
      } else {
        geo.computeVertexNormals();
      }
      if (data.idx && data.idx.length) geo.setIndex(data.idx);
      geo.computeBoundingBox();
      return geo;
    }
    default:
      geo = new THREE.BoxGeometry(a, b, c);
  }
  if (sx < 0 || sy < 0 || sz < 0) {
    geo.applyMatrix4(new THREE.Matrix4().makeScale(sx, sy, sz));
    geo.computeVertexNormals();
  }
  return geo;
}

