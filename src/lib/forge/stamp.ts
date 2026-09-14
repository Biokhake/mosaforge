import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { geometryFor } from "./geometry";
import { defaultScaleFor } from "./scale";
import { SLOT_BY_ID } from "./slots";
import { uid, type Quad, type Solid, type Vec3 } from "./types";

export type StampAxis = "x" | "y" | "z";

export const STAMP_HINT: Record<string, { cutter: string; axis: StampAxis }> = {
  shinR: { cutter: "kneeR", axis: "x" },
  shinL: { cutter: "kneeL", axis: "x" },
  thighR: { cutter: "hipR", axis: "x" },
  thighL: { cutter: "hipL", axis: "x" },
  footR: { cutter: "ankleR", axis: "x" },
  footL: { cutter: "ankleL", axis: "x" },
  forearmR: { cutter: "elbowR", axis: "x" },
  forearmL: { cutter: "elbowL", axis: "x" },
  upperR: { cutter: "shoulderR", axis: "x" },
  upperL: { cutter: "shoulderL", axis: "x" },
  visor: { cutter: "helm", axis: "z" },
  jaw: { cutter: "helm", axis: "z" },
  abdomen: { cutter: "pelvis", axis: "y" },
};

function meshOf(solid: Solid, quad: Quad): THREE.Mesh {
  const geo = geometryFor(solid, quad).clone();
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(solid.p[0], solid.p[1], solid.p[2]);
  mesh.rotation.set(solid.r[0], solid.r[1], solid.r[2]);
  mesh.updateMatrix();
  return mesh;
}

export function slotToSlotMatrix(fromSlot: string, toSlot: string): THREE.Matrix4 {
  const from = SLOT_BY_ID[fromSlot];
  const to = SLOT_BY_ID[toSlot];
  const fs = defaultScaleFor(fromSlot);
  const ts = defaultScaleFor(toSlot);
  const world = new THREE.Matrix4()
    .makeTranslation(from?.socket[0] ?? 0, from?.socket[1] ?? 0, from?.socket[2] ?? 0)
    .multiply(new THREE.Matrix4().makeScale(fs.sx, fs.sy, fs.sz));
  const into = new THREE.Matrix4()
    .makeScale(1 / ts.sx, 1 / ts.sy, 1 / ts.sz)
    .multiply(
      new THREE.Matrix4().makeTranslation(-(to?.socket[0] ?? 0), -(to?.socket[1] ?? 0), -(to?.socket[2] ?? 0)),
    );
  return into.multiply(world);
}

function hull2d(pts: { u: number; v: number }[]): { u: number; v: number }[] {
  const s = [...pts].sort((a, b) => a.u - b.u || a.v - b.v);
  if (s.length < 3) return s;
  const cross = (o: { u: number; v: number }, a: { u: number; v: number }, b: { u: number; v: number }) =>
    (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
  const lower: { u: number; v: number }[] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { u: number; v: number }[] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function project(p: THREE.Vector3, axis: StampAxis): { u: number; v: number } {
  if (axis === "x") return { u: p.y, v: p.z };
  if (axis === "y") return { u: p.x, v: p.z };
  return { u: p.x, v: p.y };
}

function prismFromHull(hull: { u: number; v: number }[], axis: StampAxis, depth: number): THREE.BufferGeometry | null {
  if (hull.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(hull[0]!.u, hull[0]!.v);
  for (let i = 1; i < hull.length; i++) shape.lineTo(hull[i]!.u, hull[i]!.v);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -depth / 2);
  if (axis === "x") geo.rotateY(Math.PI / 2);
  else if (axis === "y") geo.rotateX(-Math.PI / 2);
  return geo;
}

function bakeMesh(mesh: THREE.Mesh, name: string, source: Solid): Solid {
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrix);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox();
  const c = new THREE.Vector3();
  geo.boundingBox?.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  const pos = Array.from(geo.getAttribute("position").array as ArrayLike<number>);
  const nrmAttr = geo.getAttribute("normal");
  const nrm = nrmAttr ? Array.from(nrmAttr.array as ArrayLike<number>) : undefined;
  const idx = geo.index ? Array.from(geo.index.array) : undefined;
  geo.dispose();
  return {
    id: uid(),
    name,
    t: "mesh",
    m: source.m,
    p: [c.x, c.y, c.z],
    r: [0, 0, 0],
    s: [1, 1, 1],
    visible: true,
    locked: false,
    o: source.o,
    mesh: { pos, nrm, idx },
  };
}

export function stampCut(opts: {
  target: Solid[];
  cutter: Solid[];
  cutterSlot: string;
  targetSlot: string;
  axis: StampAxis;
  quad: Quad;
}): Solid[] | null {
  const cuts = opts.cutter.filter((s) => s.visible);
  const keep = opts.target.filter((s) => s.visible);
  if (!cuts.length || !keep.length) return null;
  const xform = slotToSlotMatrix(opts.cutterSlot, opts.targetSlot);
  const pts: { u: number; v: number }[] = [];
  for (const s of cuts) {
    const m = meshOf(s, opts.quad);
    m.updateMatrix();
    const mat = xform.clone().multiply(m.matrix);
    const pos = m.geometry.getAttribute("position");
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mat);
      pts.push(project(v, opts.axis));
    }
    m.geometry.dispose();
  }
  const hull = hull2d(pts);
  const prism = prismFromHull(hull, opts.axis, 0.8);
  if (!prism) return null;
  const cutter = new THREE.Mesh(prism);
  cutter.updateMatrix();
  try {
    let acc: THREE.Mesh | null = null;
    for (const s of keep) {
      const m = meshOf(s, opts.quad);
      acc = acc ? CSG.union(acc, m) : m;
      if (acc !== m) m.geometry.dispose();
    }
    if (!acc) return null;
    const next = CSG.subtract(acc, cutter);
    acc.geometry.dispose();
    cutter.geometry.dispose();
    const baked = bakeMesh(next, `${keep[0]!.name} stamp`, keep[0]!);
    next.geometry.dispose();
    const hidden = opts.target.filter((s) => !s.visible);
    return [...hidden, baked];
  } catch {
    cutter.geometry.dispose();
    return null;
  }
}

export function remapSolid(solid: Solid, fromSlot: string, toSlot: string): Solid {
  const m = slotToSlotMatrix(fromSlot, toSlot);
  const p = new THREE.Vector3(solid.p[0], solid.p[1], solid.p[2]).applyMatrix4(m);
  const fs = defaultScaleFor(fromSlot);
  const ts = defaultScaleFor(toSlot);
  const s: Vec3 = [
    solid.s[0] * (fs.sx / ts.sx),
    solid.s[1] * (fs.sy / ts.sy),
    solid.s[2] * (fs.sz / ts.sz),
  ];
  return { ...solid, p: [p.x, p.y, p.z], s };
}
