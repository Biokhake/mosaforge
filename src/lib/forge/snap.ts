import type { Solid, Vec3 } from "./types";

export type GridAxis = "x" | "y" | "z";

export interface GridPlane {
  on: boolean;
  cell: number;
}

export type Grids = Record<GridAxis, GridPlane>;

export interface Guide {
  a: Vec3;
  b: Vec3;
}

const AX: GridAxis[] = ["x", "y", "z"];

export function activeCells(grids: Grids): number[] {
  return AX.filter((a) => grids[a].on && grids[a].cell > 0).map((a) => grids[a].cell);
}

export function anyGridOn(grids: Grids): boolean {
  return activeCells(grids).length > 0;
}

export function primaryCell(grids: Grids): number {
  const c = activeCells(grids);
  return c.length ? Math.min(...c) : 0;
}

function snap1(v: number, cells: number[]): number {
  if (!cells.length) return v;
  let best = v;
  let d = Infinity;
  for (const c of cells) {
    const s = Math.round(v / c) * c;
    const dist = Math.abs(s - v);
    if (dist < d) {
      d = dist;
      best = s;
    }
  }
  return best;
}

export function snapVec(p: Vec3, grids: Grids): Vec3 {
  if (!anyGridOn(grids)) return p;
  const allow = enabledAxes(grids);
  const cells = activeCells(grids);
  return [
    allow[0] ? snap1(p[0], cells) : p[0],
    allow[1] ? snap1(p[1], cells) : p[1],
    allow[2] ? snap1(p[2], cells) : p[2],
  ];
}

function guideLine(axis: 0 | 1 | 2, v: number): Guide {
  const a: Vec3 = [0, 0, 0];
  const b: Vec3 = [0, 0, 0];
  const o1 = ((axis + 1) % 3) as 0 | 1 | 2;
  a[axis] = v;
  b[axis] = v;
  a[o1] = -0.24;
  b[o1] = 0.24;
  return { a, b };
}

export function snapMove(_id: string, p: Vec3, _solids: Solid[], grids: Grids): { p: Vec3; guides: Guide[] } {
  const cells = activeCells(grids);
  if (!cells.length) return { p, guides: [] };
  const out = snapVec(p, grids);
  return {
    p: out,
    guides: [
      guideLine(0, out[0]),
      guideLine(1, out[1]),
      guideLine(2, out[2]),
    ],
  };
}

export function enabledAxes(grids: Grids): [boolean, boolean, boolean] {
  if (!anyGridOn(grids)) return [true, true, true];
  return [grids.x.on, grids.y.on, grids.z.on];
}

export function constrainMove(
  from: Vec3,
  to: Vec3,
  grids: Grids,
  shift: boolean,
  lock: 0 | 1 | 2 | null,
): { p: Vec3; lock: 0 | 1 | 2 | null } {
  const allow = enabledAxes(grids);
  const delta: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  for (let i = 0; i < 3; i++) if (!allow[i]) delta[i] = 0;

  let axis = lock;
  if (shift) {
    if (axis === null) {
      let best = 1e-6;
      let pick: 0 | 1 | 2 | null = null;
      ([0, 1, 2] as const).forEach((i) => {
        if (!allow[i]) return;
        const d = Math.abs(delta[i]);
        if (d > best) {
          best = d;
          pick = i;
        }
      });
      axis = pick;
    }
    if (axis !== null) {
      const keep = delta[axis];
      delta[0] = 0;
      delta[1] = 0;
      delta[2] = 0;
      delta[axis] = keep;
    } else {
      return { p: from, lock: null };
    }
  }

  const next: Vec3 = [from[0] + delta[0], from[1] + delta[1], from[2] + delta[2]];
  const snapped = snapVec(next, grids);
  for (let i = 0; i < 3; i++) if (!allow[i]) snapped[i] = from[i];
  if (shift && axis !== null) {
    for (let i = 0; i < 3; i++) if (i !== axis) snapped[i] = from[i];
  }
  return { p: snapped, lock: shift ? axis : null };
}

export const GRID_COLORS: Record<GridAxis, string> = {
  x: "#b42222",
  y: "#3d5c3a",
  z: "#1f3d73",
};

export function defaultGrids(): Grids {
  return {
    x: { on: false, cell: 0.02 },
    y: { on: false, cell: 0.02 },
    z: { on: false, cell: 0.02 },
  };
}
