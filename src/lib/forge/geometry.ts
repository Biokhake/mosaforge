import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Quad, Solid, Vec3 } from "./types";
import { normalizeAnchors, cubicPoint } from "./bezier";
import { inferLoops } from "./cage";

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

function meshFromLoops(pts: Vec3[], loops: number[][]): THREE.BufferGeometry | null {
  const pos: number[] = [];
  for (const loop of loops) {
    if (loop.length < 3) continue;
    const v = loop.map((i) => pts[i]).filter(Boolean) as Vec3[];
    if (v.length < 3) continue;
    for (let i = 1; i < v.length - 1; i++) pushTri(pos, v[0]!, v[i]!, v[i + 1]!);
  }
  if (pos.length < 9) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function pathGeometry(solid: Solid): THREE.BufferGeometry | null {
  if (!solid.path) return null;
  const anchors = normalizeAnchors(solid.anchors);
  if (anchors.length < 3) return null;
  const loops = inferLoops(anchors, solid.loops);
  if (loops.length >= 2) {
    const cage = meshFromLoops(
      anchors.map((a) => a.p),
      loops,
    );
    if (cage) return cage;
  }
  if (anchors.length === 8 && anchors.every((a) => a.kind === "corner")) {
    return hexaFrom8(anchors.map((a) => a.p));
  }
  const depth = Math.max(0.004, Math.abs(solid.s[2] || 0.06));
  const segs = anchors.some((a) => a.kind === "smooth") ? 8 : 1;
  return extrudeRing(sampleRing(anchors, segs), depth);
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
  const bevel = solid.b ?? 0;
  const roundBox = solid.t === "box" && (bevel > 0.0008 || (quad === "SR" && bevel === 0));
  if (!roundBox) {
    const shaped = pathGeometry(solid);
    if (shaped) return shaped;
  }
  const sx = Math.sign(solid.s[0]) || 1;
  const sy = Math.sign(solid.s[1]) || 1;
  const sz = Math.sign(solid.s[2]) || 1;
  const a = Math.abs(solid.s[0]);
  const b = Math.abs(solid.s[1]);
  const c = Math.abs(solid.s[2]);
  const n = Math.max(3, Math.round(solid.n ?? (quad === "SS" ? 6 : quad === "SR" ? 12 : 16)));
  let geo: THREE.BufferGeometry;
  switch (solid.t) {
    case "box": {
      const rad = bevel > 0 ? bevel : quad === "SR" ? Math.min(a, b, c) * 0.08 : 0;
      geo =
        rad > 0.0008
          ? new RoundedBoxGeometry(a, b, c, Math.max(1, Math.min(4, Math.round(solid.n ?? 2))), Math.min(rad, Math.min(a, b, c) * 0.49))
          : new THREE.BoxGeometry(a, b, c);
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

