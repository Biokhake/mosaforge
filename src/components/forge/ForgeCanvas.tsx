import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import { geometryFor } from "@/lib/forge/geometry";
import { getLineMat, getPalette } from "@/lib/forge/palette";
import { defaultScaleFor } from "@/lib/forge/scale";
import { slotTargetWorld } from "@/lib/forge/fit";
import { GHOST_BOXES, SLOT_BY_ID } from "@/lib/forge/slots";
import type { Solid } from "@/lib/forge/types";
import { useForge } from "@/lib/forge/store";

const meshMap = new Map<string, THREE.Mesh>();

function SolidMesh({
  solid,
  selected,
  showEdges,
}: {
  solid: Solid;
  selected: boolean;
  showEdges: boolean;
}) {
  const quad = useForge((s) => s.quad);
  const dragging = useForge((s) => s.dragging);
  const select = useForge((s) => s.select);
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(
    () => geometryFor(solid, quad),
    // rebuild when shape params change
    [solid.t, solid.s[0], solid.s[1], solid.s[2], solid.d, solid.n, quad],
  );
  const pal = useMemo(() => getPalette(quad), [quad]);
  const line = useMemo(() => getLineMat(), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 18), [geo]);
  const skipSync = dragging && selected;

  useEffect(() => {
    return () => {
      geo.dispose();
      edges.dispose();
    };
  }, [geo, edges]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    meshMap.set(solid.id, m);
    if (skipSync) return;
    m.position.set(solid.p[0], solid.p[1], solid.p[2]);
    m.rotation.set(solid.r[0], solid.r[1], solid.r[2]);
    m.scale.set(1, 1, 1);
    return () => {
      meshMap.delete(solid.id);
    };
  }, [solid.id, solid.p, solid.r, skipSync]);

  return (
    <mesh
      ref={ref}
      geometry={geo}
      material={pal[solid.m]}
      visible={solid.visible}
      onClick={(e) => {
        e.stopPropagation();
        select(solid.id);
      }}
    >
      {showEdges ? <lineSegments geometry={edges} material={line} /> : null}
    </mesh>
  );
}

function Gizmo() {
  const selectedId = useForge((s) => s.selectedId);
  const mode = useForge((s) => s.mode);
  const snap = useForge((s) => s.snap);
  const solids = useForge((s) => s.solids);
  const updateSolid = useForge((s) => s.updateSolid);
  const commit = useForge((s) => s.commit);
  const setDragging = useForge((s) => s.setDragging);
  const selected = solids.find((s) => s.id === selectedId);
  const [object, setObject] = useState<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    setObject(selectedId ? (meshMap.get(selectedId) ?? null) : null);
  }, [selectedId, solids]);

  if (!selected || !object || selected.locked || !selected.visible) return null;

  const rotSnap = snap > 0 ? Math.PI / 36 : undefined;

  return (
    <TransformControls
      object={object}
      mode={mode}
      size={0.45}
      translationSnap={snap || undefined}
      rotationSnap={rotSnap}
      scaleSnap={snap ? 0.05 : undefined}
      onMouseDown={() => setDragging(true)}
      onMouseUp={() => {
        const mesh = meshMap.get(selected.id);
        if (mesh) {
          const sx = Math.max(0.002, selected.s[0] * mesh.scale.x);
          const sy = Math.max(0.002, selected.s[1] * mesh.scale.y);
          const sz = Math.max(0.002, selected.s[2] * mesh.scale.z);
          commit();
          updateSolid(selected.id, {
            p: [mesh.position.x, mesh.position.y, mesh.position.z],
            r: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            s: [sx, sy, sz],
          });
          mesh.scale.set(1, 1, 1);
        }
        setDragging(false);
      }}
    />
  );
}

function SlotSpace({ children }: { children: ReactNode }) {
  const slot = useForge((s) => s.slot);
  const sc = defaultScaleFor(slot);
  return <group scale={[sc.sx, sc.sy, sc.sz]}>{children}</group>;
}

function Ghost() {
  const slot = useForge((s) => s.slot);
  const def = SLOT_BY_ID[slot];
  const socket = def?.socket ?? ([0, 0, 0] as const);
  const cell = slotTargetWorld(slot);
  return (
    <group position={[-socket[0], -socket[1], -socket[2]]}>
      {GHOST_BOXES.map((b) => (
        <mesh key={b.id} position={b.p} raycast={() => {}}>
          <boxGeometry args={b.s} />
          <meshBasicMaterial
            color={b.id === def?.group ? "#79d7ff" : "#6a6f78"}
            wireframe
            transparent
            opacity={b.id === def?.group ? 0.22 : 0.08}
          />
        </mesh>
      ))}
      {cell ? (
        <mesh position={cell.p} raycast={() => {}}>
          <boxGeometry args={cell.s} />
          <meshBasicMaterial color="#c4a35a" wireframe transparent opacity={0.45} />
        </mesh>
      ) : null}
    </group>
  );
}

function SocketMark() {
  return (
    <mesh raycast={() => {}}>
      <octahedronGeometry args={[0.018, 0]} />
      <meshStandardMaterial
        color="#c4a35a"
        emissive="#c4a35a"
        emissiveIntensity={0.4}
        metalness={0.6}
        roughness={0.3}
      />
    </mesh>
  );
}

function CaptureBridge({
  captureRef,
}: {
  captureRef: MutableRefObject<(() => void) | null>;
}) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    captureRef.current = () => {
      const url = gl.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${useForge.getState().name.replace(/\s+/g, "-").toLowerCase() || "part"}.png`;
      a.click();
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, captureRef]);
  return null;
}

export function ForgeCanvas({
  captureRef,
}: {
  captureRef: MutableRefObject<(() => void) | null>;
}) {
  const solids = useForge((s) => s.solids);
  const selectedId = useForge((s) => s.selectedId);
  const showGrid = useForge((s) => s.showGrid);
  const showGhost = useForge((s) => s.showGhost);
  const showEdges = useForge((s) => s.showEdges);
  const showSocket = useForge((s) => s.showSocket);
  const dragging = useForge((s) => s.dragging);
  const theme = useForge((s) => s.theme);
  const select = useForge((s) => s.select);
  const bg = theme === "dark" ? "#0b0c0e" : "#f4f1ea";

  return (
    <Canvas
      className="absolute inset-0 block h-full w-full touch-none"
      dpr={[1, 1.75]}
      resize={{ debounce: 0 }}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: [0.3, 0.12, 0.36], fov: 36, near: 0.01, far: 40 }}
      onPointerMissed={() => select(null)}
      onCreated={({ gl, size, camera }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        if (size.width > 0 && size.height > 0) {
          gl.setSize(size.width, size.height, false);
          camera.updateProjectionMatrix();
        }
      }}
      style={{ width: "100%", height: "100%", display: "block", background: bg }}
    >
      <color attach="background" args={[bg]} />
      <hemisphereLight args={[theme === "dark" ? "#c8ccd4" : "#fff8ee", "#1a1c21", 0.65]} />
      <directionalLight position={[2.4, 3.6, 2]} intensity={1.35} />
      <directionalLight position={[-2.8, 1.2, -1.6]} intensity={0.32} />
      <ambientLight intensity={0.22} />

      <SlotSpace>
        {solids.map((s) => (
          <SolidMesh key={s.id} solid={s} selected={s.id === selectedId} showEdges={showEdges} />
        ))}
      </SlotSpace>
      <Gizmo />
      {showGhost ? <Ghost /> : null}
      {showSocket ? <SocketMark /> : null}

      {showGrid ? (
        <Grid
          infiniteGrid
          fadeDistance={2.4}
          fadeStrength={1.4}
          cellSize={0.02}
          sectionSize={0.1}
          cellColor={theme === "dark" ? "#2a2d33" : "#d4cdc2"}
          sectionColor={theme === "dark" ? "#3a3e46" : "#b8b0a4"}
          position={[0, -0.16, 0]}
        />
      ) : null}
      <ContactShadows position={[0, -0.155, 0]} opacity={0.35} scale={1.4} blur={2.2} far={0.6} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enabled={!dragging}
        minDistance={0.12}
        maxDistance={4}
        target={[0, 0.02, 0]}
      />
      <GizmoHelper alignment="bottom-right" margin={[56, 56]}>
        <GizmoViewport
          axisColors={["#b42222", "#3d5c3a", "#1f3d73"]}
          labelColor={theme === "dark" ? "#e8eaee" : "#16151c"}
        />
      </GizmoHelper>
      <CaptureBridge captureRef={captureRef} />
    </Canvas>
  );
}
