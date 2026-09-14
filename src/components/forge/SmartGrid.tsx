import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { anyGridOn, GRID_COLORS, type GridAxis } from "@/lib/forge/snap";
import { useForge } from "@/lib/forge/store";

const EXTENT = 0.48;
const AXIS: GridAxis[] = ["x", "y", "z"];
const AXIS_I = { x: 0, y: 1, z: 2 } as const;

function helperEuler(axis: GridAxis): [number, number, number] {
  if (axis === "x") return [0, 0, 0];
  if (axis === "y") return [0, 0, Math.PI / 2];
  return [Math.PI / 2, 0, 0];
}

function pickEuler(axis: GridAxis): [number, number, number] {
  if (axis === "x") return [Math.PI / 2, 0, 0];
  if (axis === "y") return [0, Math.PI / 2, 0];
  return [0, 0, 0];
}

function cylEuler(axis: GridAxis): [number, number, number] {
  if (axis === "x") return [0, 0, Math.PI / 2];
  if (axis === "z") return [Math.PI / 2, 0, 0];
  return [0, 0, 0];
}

function dimColor(hex: string, s = 0.32): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(s);
  return `#${c.getHexString()}`;
}

function PlaneGrid({ axis, cell }: { axis: GridAxis; cell: number }) {
  const color = GRID_COLORS[axis];
  const helper = useMemo(() => {
    const div = Math.max(2, Math.round(EXTENT / Math.max(0.002, cell)));
    const g = new THREE.GridHelper(EXTENT, div, color, dimColor(color));
    g.raycast = () => {};
    return g;
  }, [axis, cell, color]);

  useEffect(
    () => () => {
      helper.geometry.dispose();
      const mats = helper.material;
      if (Array.isArray(mats)) mats.forEach((m) => m.dispose());
      else (mats as THREE.Material).dispose();
    },
    [helper],
  );

  return (
    <group>
      <primitive object={helper} rotation={helperEuler(axis)} />
      <mesh rotation={pickEuler(axis)} userData={{ forgeGrid: axis }}>
        <planeGeometry args={[EXTENT, EXTENT]} />
        <meshBasicMaterial transparent opacity={0.035} color={color} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function AxisBar({ axis }: { axis: GridAxis }) {
  const color = GRID_COLORS[axis];
  return (
    <mesh rotation={cylEuler(axis)} raycast={() => {}}>
      <cylinderGeometry args={[0.0011, 0.0011, EXTENT * 1.15, 6]} />
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  );
}

function RulerTicks({ axis, cell }: { axis: GridAxis; cell: number }) {
  const color = GRID_COLORS[axis];
  const geo = useMemo(() => {
    const i = AXIS_I[axis];
    const a = ((i + 1) % 3) as 0 | 1 | 2;
    const n = Math.max(1, Math.floor(EXTENT / 2 / Math.max(0.002, cell)));
    const pos: number[] = [];
    const push = (p: number[], q: number[]) => pos.push(...p, ...q);
    for (let k = -n; k <= n; k++) {
      const v = k * cell;
      if (Math.abs(v) > EXTENT / 2 + 1e-6) continue;
      const major = k === 0 || k % 5 === 0;
      const t = major ? cell * 0.42 : cell * 0.18;
      const p = [0, 0, 0];
      const q = [0, 0, 0];
      p[i] = v;
      q[i] = v;
      p[a] = -t;
      q[a] = t;
      push(p, q);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [axis, cell]);

  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo],
  );

  return (
    <lineSegments geometry={geo} raycast={() => {}}>
      <lineBasicMaterial color={color} depthTest={false} />
    </lineSegments>
  );
}

function OriginMark() {
  return (
    <mesh raycast={() => {}}>
      <octahedronGeometry args={[0.006, 0]} />
      <meshBasicMaterial color="#e8eaee" depthTest={false} />
    </mesh>
  );
}

export function SmartGrids() {
  const grids = useForge((s) => s.grids);
  if (!anyGridOn(grids)) return null;
  return (
    <group>
      {grids.x.on ? <PlaneGrid axis="x" cell={grids.x.cell} /> : null}
      {grids.y.on ? <PlaneGrid axis="y" cell={grids.y.cell} /> : null}
      {grids.z.on ? <PlaneGrid axis="z" cell={grids.z.cell} /> : null}
      {AXIS.map((a) => (
        <AxisBar key={`bar-${a}`} axis={a} />
      ))}
      {AXIS.map((a) =>
        grids[a].on ? <RulerTicks key={`tick-${a}`} axis={a} cell={grids[a].cell} /> : null,
      )}
      <OriginMark />
    </group>
  );
}
