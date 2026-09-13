import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import { handleCorners } from "@/lib/forge/csg";
import { geometryFor } from "@/lib/forge/geometry";
import { getLineMat, getPalette } from "@/lib/forge/palette";
import { defaultScaleFor } from "@/lib/forge/scale";
import { slotTargetWorld } from "@/lib/forge/fit";
import { GHOST_BOXES, SLOT_BY_ID } from "@/lib/forge/slots";
import { opacityOf, type Solid, type Vec3 } from "@/lib/forge/types";
import { normalizeAnchors, samplePath } from "@/lib/forge/bezier";
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
  const tool = useForge((s) => s.tool);
  const select = useForge((s) => s.select);
  const addAnchor = useForge((s) => s.addAnchor);
  const setDragging = useForge((s) => s.setDragging);
  const updateSolid = useForge((s) => s.updateSolid);
  const commit = useForge((s) => s.commit);
  const ref = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const dragRef = useRef<{
    startHitLocal: THREE.Vector3;
    startPos: THREE.Vector3;
    plane: THREE.Plane;
  } | null>(null);
  const geo = useMemo(
    () => geometryFor(solid, quad),
    [solid.t, solid.s[0], solid.s[1], solid.s[2], solid.d, solid.n, solid.mesh, quad],
  );
  const pal = useMemo(() => getPalette(quad), [quad]);
  const line = useMemo(() => getLineMat(), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 18), [geo]);
  const skipSync = dragging && selected;
  const o = opacityOf(solid);
  const cutter = solid.op === "sub";

  const mat = useMemo(() => {
    const base = pal[solid.m].clone();
    base.transparent = o < 0.999 || cutter;
    base.opacity = cutter ? Math.min(o, 0.35) : o;
    base.depthWrite = o > 0.94 && !cutter;
    if (cutter) {
      base.color = new THREE.Color("#c43b3b");
      base.wireframe = false;
    }
    if (selected) base.emissive = new THREE.Color(cutter ? "#c43b3b" : "#2a3340");
    return base;
  }, [pal, solid.m, o, cutter, selected]);

  useEffect(() => {
    return () => {
      geo.dispose();
      edges.dispose();
      mat.dispose();
    };
  }, [geo, edges, mat]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    meshMap.set(solid.id, m);
    m.userData.forgeSolid = solid.id;
    if (!skipSync) {
      m.position.set(solid.p[0], solid.p[1], solid.p[2]);
      m.rotation.set(solid.r[0], solid.r[1], solid.r[2]);
      m.scale.set(1, 1, 1);
    }
    return () => {
      if (meshMap.get(solid.id) === m) meshMap.delete(solid.id);
    };
  }, [solid.id, solid.p, solid.r, skipSync]);

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const sess = dragRef.current;
      const m = ref.current;
      if (!sess || !m) return;
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (!ray.ray.intersectPlane(sess.plane, hit)) return;
      const hitLocal = hit.clone();
      m.parent?.worldToLocal(hitLocal);
      const delta = hitLocal.sub(sess.startHitLocal);
      m.position.copy(sess.startPos).add(delta);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      const m = ref.current;
      dragRef.current = null;
      if (m) {
        commit();
        updateSolid(solid.id, {
          p: [m.position.x, m.position.y, m.position.z],
        });
      }
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera, gl, solid.id, commit, updateSolid, setDragging]);

  return (
    <mesh
      ref={ref}
      geometry={geo}
      material={mat}
      visible={solid.visible}
      onPointerDown={(e) => {
        e.stopPropagation();
        const shift = e.nativeEvent.shiftKey;
        if (tool === "plus") {
          const local = e.object.worldToLocal(e.point.clone());
          addAnchor(solid.id, [local.x, local.y, local.z]);
          select(solid.id, shift);
          return;
        }
        if (tool === "c") {
          const st = useForge.getState();
          if (st.selectedId && st.selectedId !== solid.id) {
            st.select(solid.id, true);
            queueMicrotask(() => useForge.getState().cropSelected());
            return;
          }
        }
        const already = useForge.getState().selectedIds.includes(solid.id);
        select(solid.id, shift);
        if (tool !== "v" || solid.locked || shift) return;
        if (!already) return;
        const m = ref.current;
        if (!m) return;
        const hitLocal = e.point.clone();
        m.parent?.worldToLocal(hitLocal);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(new THREE.Vector3()).negate(),
          e.point,
        );
        dragRef.current = { startHitLocal: hitLocal, startPos: m.position.clone(), plane };
        setDragging(true);
      }}
    >
      {showEdges ? <lineSegments geometry={edges} material={line} /> : null}
    </mesh>
  );
}

function AnchorMarks({ solid }: { solid: Solid }) {
  const tool = useForge((s) => s.tool);
  const removeAnchor = useForge((s) => s.removeAnchor);
  const moveAnchor = useForge((s) => s.moveAnchor);
  const moveHandle = useForge((s) => s.moveHandle);
  const convertAnchorAt = useForge((s) => s.convertAnchorAt);
  const addAnchor = useForge((s) => s.addAnchor);
  const commit = useForge((s) => s.commit);
  const user = normalizeAnchors(solid.anchors);
  const boxes = handleCorners(solid);
  const showBox = tool === "v" || tool === "a" || tool === "plus" || tool === "minus" || tool === "shiftc";
  const [drag, setDrag] = useState<{ i: number; kind: "pt" | "hin" | "hout" } | null>(null);
  const { camera, gl } = useThree();
  const curvePts = useMemo(() => samplePath(user, 14), [user]);
  const curveGeo = useMemo(() => {
    if (curvePts.length < 6) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(curvePts, 3));
    return g;
  }, [curvePts]);
  const curveLine = useMemo(() => {
    if (!curveGeo) return null;
    return new THREE.Line(curveGeo, new THREE.LineBasicMaterial({ color: 0x79d7ff }));
  }, [curveGeo]);

  useEffect(() => () => {
    curveGeo?.dispose();
    if (curveLine) {
      (curveLine.material as THREE.Material).dispose();
    }
  }, [curveGeo, curveLine]);

  useEffect(() => {
    if (!drag) return;
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();
    const onMove = (ev: PointerEvent) => {
      const m = meshMap.get(solid.id);
      if (!m) return;
      const list = normalizeAnchors(useForge.getState().solids.find((x) => x.id === solid.id)?.anchors);
      const cur = list[drag.i];
      if (!cur) return;
      const origin =
        drag.kind === "pt"
          ? cur.p
          : [
              cur.p[0] + (drag.kind === "hout" ? cur.hout[0] : cur.hin[0]),
              cur.p[1] + (drag.kind === "hout" ? cur.hout[1] : cur.hin[1]),
              cur.p[2] + (drag.kind === "hout" ? cur.hout[2] : cur.hin[2]),
            ];
      const world = m.localToWorld(new THREE.Vector3(origin[0], origin[1], origin[2]));
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), world);
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const local = m.worldToLocal(hit.clone());
      if (drag.kind === "pt") {
        moveAnchor(solid.id, drag.i, [local.x, local.y, local.z]);
      } else {
        moveHandle(solid.id, drag.i, drag.kind, [local.x - cur.p[0], local.y - cur.p[1], local.z - cur.p[2]], ev.shiftKey);
      }
    };
    const onUp = () => {
      commit();
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, camera, gl, solid.id, moveAnchor, moveHandle, commit]);

  if (!solid.visible) return null;

  return (
    <group position={solid.p} rotation={solid.r}>
      {curveLine ? <primitive object={curveLine} /> : null}
      {showBox
        ? boxes.map((p, i) => (
            <mesh key={`b${i}`} position={p} raycast={() => {}}>
              <boxGeometry args={[0.006, 0.006, 0.006]} />
              <meshBasicMaterial color="#e8eaee" />
            </mesh>
          ))
        : null}
      {user.map((a, i) => (
        <group key={`u${i}`}>
          {a.kind === "smooth" ? (
            <>
              {(["hin", "hout"] as const).map((which) => {
                const h = which === "hin" ? a.hin : a.hout;
                return (
                  <mesh
                    key={which}
                    position={[a.p[0] + h[0], a.p[1] + h[1], a.p[2] + h[2]]}
                    onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                      e.stopPropagation();
                      commit();
                      setDrag({ i, kind: which });
                    }}
                  >
                    <sphereGeometry args={[0.005, 8, 8]} />
                    <meshBasicMaterial color="#e8eaee" />
                  </mesh>
                );
              })}
            </>
          ) : null}
          <mesh
            position={a.p}
            userData={{ forgeAnchor: true }}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (tool === "minus") {
                removeAnchor(solid.id, i);
                return;
              }
              if (tool === "shiftc") {
                convertAnchorAt(solid.id, i);
                return;
              }
              if (tool === "a" || tool === "v") {
                commit();
                setDrag({ i, kind: "pt" });
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (tool === "minus") removeAnchor(solid.id, i);
              if (tool === "shiftc") convertAnchorAt(solid.id, i);
            }}
          >
            {a.kind === "smooth" ? <sphereGeometry args={[0.008, 10, 10]} /> : <octahedronGeometry args={[0.008, 0]} />}
            <meshBasicMaterial color={tool === "shiftc" || tool === "minus" ? "#c43b3b" : "#79d7ff"} />
          </mesh>
        </group>
      ))}
      {tool === "plus" ? (
        <mesh
          raycast={() => {}}
          onClick={(e) => {
            e.stopPropagation();
            const local = e.object.parent ? e.object.parent.worldToLocal(e.point.clone()) : e.point;
            addAnchor(solid.id, [local.x, local.y, local.z] as Vec3);
          }}
        />
      ) : null}
    </group>
  );
}

function Gizmo() {
  const selectedId = useForge((s) => s.selectedId);
  const tool = useForge((s) => s.tool);
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
  }, [selectedId, selected?.p, selected?.r]);

  if (tool !== "v") return null;
  if (!selected || !object || selected.locked || !selected.visible) return null;

  const rotSnap = snap > 0 ? Math.PI / 36 : undefined;

  return (
    <TransformControls
      object={object}
      mode={mode}
      size={0.85}
      space="local"
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

function isEditHit(obj: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData?.forgeSolid || o.userData?.forgeAnchor) return true;
    const n = o.constructor?.name ?? "";
    if (n.includes("TransformControlsGizmo")) return true;
    if (/^(X|Y|Z|E|XY|YZ|XZ|XYZ|XYZE)$/.test(o.name)) return true;
    o = o.parent;
  }
  return false;
}

function EmptyClickDeselect() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      if (useForge.getState().dragging) return;
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (!hits.some((h) => isEditHit(h.object))) {
        useForge.getState().select(null);
      }
    };
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  }, [gl, camera, scene]);
  return null;
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
  const selectedIds = useForge((s) => s.selectedIds);
  const showGrid = useForge((s) => s.showGrid);
  const showGhost = useForge((s) => s.showGhost);
  const showEdges = useForge((s) => s.showEdges);
  const showSocket = useForge((s) => s.showSocket);
  const dragging = useForge((s) => s.dragging);
  const theme = useForge((s) => s.theme);
  const tool = useForge((s) => s.tool);
  const select = useForge((s) => s.select);
  const selectedId = useForge((s) => s.selectedId);
  const bg = theme === "dark" ? "#0b0c0e" : "#f4f1ea";
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const editing = !!selectedId;

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
      onPointerMissed={() => {
        if (useForge.getState().dragging) return;
        select(null);
      }}
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
          <SolidMesh
            key={s.id}
            solid={s}
            selected={selectedSet.has(s.id)}
            showEdges={showEdges}
          />
        ))}
        {solids
          .filter((s) => selectedSet.has(s.id) && (tool === "v" || tool === "a" || tool === "plus" || tool === "minus" || tool === "shiftc"))
          .map((s) => (
            <AnchorMarks key={`a-${s.id}`} solid={s} />
          ))}
        <Gizmo />
      </SlotSpace>
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
          raycast={() => {}}
        />
      ) : null}
      <ContactShadows position={[0, -0.155, 0]} opacity={0.35} scale={1.4} blur={2.2} far={0.6} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enabled={!editing && !dragging}
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
      <EmptyClickDeselect />
    </Canvas>
  );
}
