import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { geometryFor } from "./geometry";
import { uid, type Quad, type Solid } from "./types";

function meshFromSolid(solid: Solid, quad: Quad): THREE.Mesh {
  const geo = geometryFor(solid, quad).clone();
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(solid.p[0], solid.p[1], solid.p[2]);
  mesh.rotation.set(solid.r[0], solid.r[1], solid.r[2]);
  mesh.updateMatrix();
  mesh.updateMatrixWorld(true);
  return mesh;
}

function solidFromMesh(mesh: THREE.Mesh, name: string, source: Solid): Solid {
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

export function uniteSolids(solids: Solid[], quad: Quad): Solid | null {
  const list = solids.filter((s) => s.visible);
  if (list.length < 2) return null;
  try {
    let acc = meshFromSolid(list[0]!, quad);
    for (const s of list.slice(1)) {
      const b = meshFromSolid(s, quad);
      const next = CSG.union(acc, b);
      acc.geometry.dispose();
      b.geometry.dispose();
      acc = next;
    }
    return solidFromMesh(acc, `${list[0]!.name} merge`, list[0]!);
  } catch {
    return null;
  }
}

export function subtractSolids(keep: Solid, cutters: Solid[], quad: Quad): Solid | null {
  const cuts = cutters.filter((s) => s.visible && s.id !== keep.id);
  if (!cuts.length) return null;
  try {
    let acc = meshFromSolid(keep, quad);
    for (const s of cuts) {
      const b = meshFromSolid(s, quad);
      const next = CSG.subtract(acc, b);
      acc.geometry.dispose();
      b.geometry.dispose();
      acc = next;
    }
    return solidFromMesh(acc, `${keep.name} crop`, keep);
  } catch {
    return null;
  }
}

export function handleCorners(solid: Solid): [number, number, number][] {
  const hx = Math.max(0.004, Math.abs(solid.s[0]) / 2);
  const hy = Math.max(0.004, Math.abs(solid.s[1]) / 2);
  const hz = Math.max(0.004, Math.abs(solid.s[2] || solid.s[0]) / 2);
  return [
    [-hx, -hy, -hz],
    [hx, -hy, -hz],
    [-hx, hy, -hz],
    [hx, hy, -hz],
    [-hx, -hy, hz],
    [hx, -hy, hz],
    [-hx, hy, hz],
    [hx, hy, hz],
  ];
}
