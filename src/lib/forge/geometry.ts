import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Quad, Solid } from "./types";

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

export function geometryFor(solid: Solid, quad: Quad): THREE.BufferGeometry {
  const [a, b, c] = solid.s;
  const n = Math.max(3, Math.round(solid.n ?? (quad === "SS" ? 6 : quad === "SR" ? 12 : 16)));
  switch (solid.t) {
    case "box":
      if (quad === "SR") {
        const rad = Math.min(a, b, c) * 0.08;
        return new RoundedBoxGeometry(a, b, c, 2, Math.max(0.004, rad));
      }
      return new THREE.BoxGeometry(a, b, c);
    case "cyl":
      return new THREE.CylinderGeometry(a, b || a, c, n);
    case "hex":
      return new THREE.CylinderGeometry(a, b || a, c, 6);
    case "prism":
      return new THREE.CylinderGeometry(a, b || a, c, Math.max(5, n));
    case "sph":
      return new THREE.SphereGeometry(a, n, Math.max(6, Math.floor(n * 0.7)));
    case "cone":
      return new THREE.ConeGeometry(b || a, c, n);
    case "capsule":
      return new THREE.CapsuleGeometry(a, Math.max(0.01, b), 4, n);
    case "octa":
      return new THREE.OctahedronGeometry(a, 0);
    case "torus":
      return new THREE.TorusGeometry(a, Math.max(0.004, b), Math.max(6, Math.floor(n / 2)), n);
    case "trap":
      return createTrapGeometry(a, b, c, solid.d ?? 0.06);
    case "wedge":
      return createWedgeGeometry(a, b, c);
    case "cowl":
      return createCowlGeometry(a, b, c);
    default:
      return new THREE.BoxGeometry(a, b, c);
  }
}
