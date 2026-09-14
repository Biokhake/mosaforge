import { MATS, SHAPES, opacityOf, type Solid } from "@/lib/forge/types";
import { useForge } from "@/lib/forge/store";
import { cn } from "@/lib/utils";

function Axis({
  label,
  values,
  keys,
  min,
  max,
  step,
  onLive,
  onCommit,
}: {
  label: string;
  values: [number, number, number];
  keys: ["x" | "y" | "z", "x" | "y" | "z", "x" | "y" | "z"];
  min: number;
  max: number;
  step: number;
  onLive: (i: 0 | 1 | 2, v: number) => void;
  onCommit: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-2xs uppercase tracking-wider text-subtle">{label}</div>
      {([0, 1, 2] as const).map((i) => (
        <label key={keys[i]} className="grid grid-cols-[14px_1fr_52px] items-center gap-2">
          <span className="font-mono text-2xs text-muted">{keys[i]}</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[i]}
            onChange={(e) => onLive(i, Number(e.target.value))}
            onPointerUp={onCommit}
          />
          <input
            type="number"
            step={step}
            value={Number(values[i].toFixed(3))}
            onChange={(e) => onLive(i, Number(e.target.value))}
            onBlur={onCommit}
            className="h-7 rounded-sm border border-border bg-elevated px-1 font-mono text-2xs text-fg"
          />
        </label>
      ))}
    </div>
  );
}

function patchVec(s: Solid, key: "p" | "r" | "s", i: 0 | 1 | 2, v: number): Solid[typeof key] {
  const next = [...s[key]] as [number, number, number];
  next[i] = v;
  return next;
}

export function Inspector() {
  const solid = useForge((s) => s.selected());
  const selectedIds = useForge((s) => s.selectedIds);
  const updateSolid = useForge((s) => s.updateSolid);
  const commit = useForge((s) => s.commit);
  const applyBand = useForge((s) => s.applyBand);
  const mergeSelected = useForge((s) => s.mergeSelected);
  const cropSelected = useForge((s) => s.cropSelected);
  const flipSelected = useForge((s) => s.flipSelected);
  const mirrorSelected = useForge((s) => s.mirrorSelected);
  const alignSelected = useForge((s) => s.alignSelected);
  const addJointRing = useForge((s) => s.addJointRing);
  const showGhost = useForge((s) => s.showGhost);
  const showEdges = useForge((s) => s.showEdges);
  const showSocket = useForge((s) => s.showSocket);
  const toggle = useForge((s) => s.toggle);
  const mode = useForge((s) => s.mode);
  const setMode = useForge((s) => s.setMode);

  if (!solid) {
    return (
      <div className="p-4 text-sm text-muted">
        Select a solid, or add one from the stack.
      </div>
    );
  }

  return (
    <div className="panel-scroll h-full min-h-0 overflow-y-auto px-3 py-3">
      <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Solid
      </div>
      <input
        value={solid.name}
        onChange={(e) => updateSolid(solid.id, { name: e.target.value })}
        className="mt-2 h-8 w-full rounded-sm border border-border bg-elevated px-2 text-sm text-fg"
        aria-label="Solid name"
      />

      <div className="mt-3 font-mono text-2xs uppercase tracking-wider text-subtle">Shape</div>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {SHAPES.map((sh) => (
          <button
            key={sh.id}
            type="button"
            onClick={() => updateSolid(solid.id, { t: sh.id }, true)}
            className={cn(
              "rounded-sm px-1 py-1.5 font-mono text-2xs",
              solid.t === sh.id ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
            )}
          >
            {sh.label}
          </button>
        ))}
      </div>

      <div className="mt-3 font-mono text-2xs uppercase tracking-wider text-subtle">Layer</div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {MATS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => updateSolid(solid.id, { m: m.id })}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-1.5 py-1.5 text-2xs",
              solid.m === m.id ? "bg-surface ring-1 ring-ring" : "hover:bg-surface",
            )}
          >
            <span className="size-2.5 rounded-sm" style={{ background: m.hex }} />
            {m.label}
          </button>
        ))}
      </div>

      <label className="mt-3 grid grid-cols-[52px_1fr_40px] items-center gap-2">
        <span className="font-mono text-2xs text-muted">Opacity</span>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={opacityOf(solid)}
          onChange={(e) => updateSolid(solid.id, { o: Number(e.target.value) })}
          onPointerUp={commit}
        />
        <span className="text-right font-mono text-2xs text-subtle">
          {Math.round(opacityOf(solid) * 100)}
        </span>
      </label>

      <div className="mt-3 font-mono text-2xs uppercase tracking-wider text-subtle">Pathfinder</div>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => updateSolid(solid.id, { op: solid.op === "sub" ? "add" : "sub" })}
          className={cn(
            "rounded-sm py-1.5 font-mono text-2xs",
            solid.op === "sub" ? "bg-signal text-signal-fg" : "bg-surface text-muted",
          )}
        >
          {solid.op === "sub" ? "Cutter −" : "Stack +"}
        </button>
        <button
          type="button"
          onClick={mergeSelected}
          disabled={selectedIds.length < 2}
          className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg disabled:opacity-30"
        >
          Merge ∪
        </button>
        <button
          type="button"
          onClick={cropSelected}
          disabled={selectedIds.length < 2}
          className="col-span-2 rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg disabled:opacity-30"
        >
          Crop {selectedIds.length > 1 ? `(keep ${solid.name})` : ""}
        </button>
      </div>

      <div className="mt-3 font-mono text-2xs uppercase tracking-wider text-subtle">Flip</div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {([
          [0, "H", "Horizontal"],
          [1, "V", "Vertical"],
          [2, "D", "Depth"],
        ] as const).map(([axis, k, label]) => (
          <button
            key={k}
            type="button"
            title={label}
            onClick={() => flipSelected(axis)}
            className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg"
          >
            Flip {k}
          </button>
        ))}
      </div>

      <div className="mt-3 font-mono text-2xs uppercase tracking-wider text-subtle">Low poly</div>
      <label className="mt-1 grid grid-cols-[52px_1fr_40px] items-center gap-2">
        <span className="font-mono text-2xs text-muted">Bevel</span>
        <input
          type="range"
          min={0}
          max={0.04}
          step={0.001}
          value={solid.b ?? 0}
          onChange={(e) => updateSolid(solid.id, { b: Number(e.target.value) })}
          onPointerUp={commit}
        />
        <span className="text-right font-mono text-2xs text-subtle">{(solid.b ?? 0).toFixed(3)}</span>
      </label>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button type="button" onClick={mirrorSelected} className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg">
          Mirror X
        </button>
        <button type="button" onClick={addJointRing} className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg">
          Joint ring
        </button>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {(["min", "center", "max"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={selectedIds.length < 2}
            onClick={() => alignSelected(0, mode)}
            className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg disabled:opacity-30"
          >
            X {mode[0]!.toUpperCase()}
          </button>
        ))}
        {(["min", "center", "max"] as const).map((mode) => (
          <button
            key={`y${mode}`}
            type="button"
            disabled={selectedIds.length < 2}
            onClick={() => alignSelected(1, mode)}
            className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg disabled:opacity-30"
          >
            Y {mode[0]!.toUpperCase()}
          </button>
        ))}
        {(["min", "center", "max"] as const).map((mode) => (
          <button
            key={`z${mode}`}
            type="button"
            disabled={selectedIds.length < 2}
            onClick={() => alignSelected(2, mode)}
            className="rounded-sm bg-surface py-1.5 font-mono text-2xs text-muted hover:text-fg disabled:opacity-30"
          >
            Z {mode[0]!.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <Axis
          label="Position"
          values={solid.p}
          keys={["x", "y", "z"]}
          min={-0.4}
          max={0.4}
          step={0.001}
          onLive={(i, v) => updateSolid(solid.id, { p: patchVec(solid, "p", i, v) })}
          onCommit={commit}
        />
        <Axis
          label="Rotation (rad)"
          values={solid.r}
          keys={["x", "y", "z"]}
          min={-Math.PI}
          max={Math.PI}
          step={0.01}
          onLive={(i, v) => updateSolid(solid.id, { r: patchVec(solid, "r", i, v) })}
          onCommit={commit}
        />
        <Axis
          label="Size"
          values={[Math.abs(solid.s[0]), Math.abs(solid.s[1]), Math.abs(solid.s[2])]}
          keys={["x", "y", "z"]}
          min={0.004}
          max={0.5}
          step={0.001}
          onLive={(i, v) => {
            const sign = solid.s[i] < 0 ? -1 : 1;
            updateSolid(solid.id, { s: patchVec(solid, "s", i, Math.max(0.002, Math.abs(v)) * sign) });
          }}
          onCommit={commit}
        />
      </div>

      {(solid.t === "trap" || solid.t === "cowl") && (
        <label className="mt-3 grid grid-cols-[1fr_52px] items-center gap-2">
          <span className="font-mono text-2xs text-muted">Depth</span>
          <input
            type="number"
            step={0.001}
            value={Number((solid.d ?? 0.06).toFixed(3))}
            onChange={(e) => updateSolid(solid.id, { d: Number(e.target.value) })}
            className="h-7 rounded-sm border border-border bg-elevated px-1 font-mono text-2xs text-fg"
          />
        </label>
      )}

      {(solid.t === "cyl" ||
        solid.t === "sph" ||
        solid.t === "cone" ||
        solid.t === "capsule" ||
        solid.t === "prism" ||
        solid.t === "torus") && (
        <label className="mt-3 grid grid-cols-[1fr_52px] items-center gap-2">
          <span className="font-mono text-2xs text-muted">Segments</span>
          <input
            type="number"
            min={3}
            max={32}
            value={solid.n ?? 8}
            onChange={(e) => updateSolid(solid.id, { n: Number(e.target.value) })}
            className="h-7 rounded-sm border border-border bg-elevated px-1 font-mono text-2xs text-fg"
          />
        </label>
      )}

      <div className="mt-5 border-t border-border pt-3">
        <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Viewport
        </div>
        <div className="mt-2 flex gap-1">
          {(["translate", "rotate", "scale"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-sm py-1.5 font-mono text-2xs uppercase",
                mode === m ? "bg-primary text-primary-foreground" : "bg-surface text-muted",
              )}
            >
              {m[0]}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(
            [
              ["showGhost", "Ghost", showGhost],
              ["showEdges", "Edges", showEdges],
              ["showSocket", "Socket", showSocket],
            ] as const
          ).map(([k, label, on]) => (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={cn(
                "rounded-sm py-1.5 text-2xs",
                on ? "bg-surface text-fg" : "text-subtle hover:bg-surface",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={applyBand}
          className="mt-2 w-full rounded-sm border border-border py-1.5 text-2xs text-muted hover:text-fg"
        >
          Apply kit segments
        </button>
      </div>
    </div>
  );
}
