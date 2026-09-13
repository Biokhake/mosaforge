import * as THREE from "three";
import type { MatKey, Quad } from "./types";

export const MAT_HEX: Record<MatKey, string> = {
  prim: "#d8d4cc",
  sec: "#3a3e48",
  acc: "#b42222",
  trim: "#c4a35a",
  dark: "#2a2c31",
  metal: "#8b919a",
  visor: "#79d7ff",
  glow: "#79d7ff",
  joint: "#3d4048",
};

const PRIM_BY_QUAD: Record<Quad, string> = {
  SS: "#e4dfd4",
  SR: "#ddd6c8",
  RS: "#d5d2d8",
  RR: "#d7d0c4",
};

function std(
  color: string,
  extra: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0] = {},
) {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.34,
    roughness: 0.4,
    envMapIntensity: 1.1,
    ...extra,
  });
  m.side = THREE.DoubleSide;
  return m;
}

export type Palette = Record<MatKey, THREE.MeshStandardMaterial>;

const cache = new Map<string, Palette>();

export function getPalette(quad: Quad): Palette {
  const hit = cache.get(quad);
  if (hit) return hit;
  const prim = PRIM_BY_QUAD[quad];
  const visor = MAT_HEX.visor;
  const pal: Palette = {
    prim: std(prim),
    sec: std(MAT_HEX.sec, { metalness: 0.35, roughness: 0.4 }),
    acc: std(MAT_HEX.acc, { metalness: 0.32, roughness: 0.42 }),
    trim: std(MAT_HEX.trim, { metalness: 0.45, roughness: 0.35 }),
    dark: std(MAT_HEX.dark, { metalness: 0.5, roughness: 0.4 }),
    metal: std(MAT_HEX.metal, { metalness: 0.78, roughness: 0.28 }),
    visor: std(visor, {
      metalness: 0.92,
      roughness: 0.08,
      emissive: visor,
      emissiveIntensity: 0.55,
    }),
    glow: std(visor, {
      metalness: 0.15,
      roughness: 0.22,
      emissive: visor,
      emissiveIntensity: 0.85,
    }),
    joint: std(MAT_HEX.joint, { metalness: 0.62, roughness: 0.32 }),
  };
  cache.set(quad, pal);
  return pal;
}

export function getLineMat() {
  return new THREE.LineBasicMaterial({
    color: 0x1a1a1e,
    transparent: true,
    opacity: 0.32,
  });
}
