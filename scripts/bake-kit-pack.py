#!/usr/bin/env python3
"""Bake visual per-part zip → fitted hangar kit JSONs. Mirrors src/lib/forge/fit.ts."""
from __future__ import annotations

import json
import math
import sys
import zipfile
from collections import defaultdict
from io import BytesIO
from pathlib import Path

FILL = 0.96
K_MIN = 0.25
K_MAX = 6.0
CENTER_MIX = 0.72

SURFACE = {
    "visor", "brow", "eyeL", "eyeR", "nose", "mouth", "jaw", "earL", "earR", "vfin",
    "antennaL", "antennaR", "cheekL", "cheekR", "chin", "collar", "pecL", "pecR",
    "cockpit", "skirtF", "skirtB", "skirtL", "skirtR", "vambraceR", "vambraceL",
    "thrusterL", "thrusterR", "binderL", "binderR",
}
SURFACE_FRAC = {
    "visor": (0.82, 0.28, 0.24), "brow": (0.78, 0.2, 0.26),
    "eyeL": (0.24, 0.14, 0.14), "eyeR": (0.24, 0.14, 0.14),
    "nose": (0.2, 0.16, 0.18), "mouth": (0.38, 0.12, 0.16),
    "jaw": (0.72, 0.24, 0.42), "earL": (0.2, 0.3, 0.24), "earR": (0.2, 0.3, 0.24),
    "vfin": (0.22, 0.32, 0.38), "antennaL": (0.14, 0.38, 0.14), "antennaR": (0.14, 0.38, 0.14),
    "cheekL": (0.3, 0.24, 0.24), "cheekR": (0.3, 0.24, 0.24), "chin": (0.48, 0.18, 0.22),
    "collar": (0.72, 0.22, 0.5), "pecL": (0.42, 0.36, 0.42), "pecR": (0.42, 0.36, 0.42),
    "cockpit": (0.48, 0.26, 0.32), "skirtF": (0.72, 0.55, 0.42), "skirtB": (0.72, 0.55, 0.42),
    "skirtL": (0.38, 0.7, 0.55), "skirtR": (0.38, 0.7, 0.55),
    "vambraceR": (0.85, 0.2, 0.85), "vambraceL": (0.85, 0.2, 0.85),
    "thrusterL": (0.42, 0.55, 0.45), "thrusterR": (0.42, 0.55, 0.45),
    "binderL": (0.4, 0.5, 0.4), "binderR": (0.4, 0.5, 0.4),
}

# slots.ts
SLOTS = [
    ("helm", "head", (0, 1.82, 0)), ("visor", "head", (0, 1.81, 0.065)),
    ("brow", "head", (0, 1.87, 0.06)), ("eyeL", "head", (-0.048, 1.82, 0.07)),
    ("eyeR", "head", (0.048, 1.82, 0.07)), ("nose", "head", (0, 1.79, 0.075)),
    ("mouth", "head", (0, 1.745, 0.065)), ("jaw", "head", (0, 1.69, 0.04)),
    ("earL", "head", (-0.115, 1.81, 0)), ("earR", "head", (0.115, 1.81, 0)),
    ("vfin", "head", (0, 1.91, 0.04)), ("antennaL", "head", (-0.08, 1.89, -0.01)),
    ("antennaR", "head", (0.08, 1.89, -0.01)), ("cheekL", "head", (-0.095, 1.76, 0.035)),
    ("cheekR", "head", (0.095, 1.76, 0.035)), ("chin", "head", (0, 1.71, 0.065)),
    ("collar", "torso", (0, 1.62, 0.02)), ("chestCore", "torso", (0, 1.44, 0.04)),
    ("pecL", "torso", (-0.13, 1.46, 0.09)), ("pecR", "torso", (0.13, 1.46, 0.09)),
    ("cockpit", "torso", (0, 1.4, 0.14)), ("abdomen", "torso", (0, 1.22, 0.03)),
    ("pelvis", "waist", (0, 1.06, 0)), ("skirtF", "waist", (0, 1.02, 0.12)),
    ("skirtB", "waist", (0, 1.02, -0.1)), ("skirtL", "waist", (-0.16, 1.02, 0)),
    ("skirtR", "waist", (0.16, 1.02, 0)),
    ("shoulderR", "armR", (0.3, 1.48, 0)), ("upperR", "armR", (0.3, 1.28, 0)),
    ("elbowR", "armR", (0.3, 1.1, 0)), ("forearmR", "armR", (0.3, 0.92, 0)),
    ("vambraceR", "armR", (0.3, 0.9, 0.03)), ("handR", "armR", (0.3, 0.74, 0)),
    ("shoulderL", "armL", (-0.3, 1.48, 0)), ("upperL", "armL", (-0.3, 1.28, 0)),
    ("elbowL", "armL", (-0.3, 1.1, 0)), ("forearmL", "armL", (-0.3, 0.92, 0)),
    ("vambraceL", "armL", (-0.3, 0.9, 0.03)), ("handL", "armL", (-0.3, 0.74, 0)),
    ("hipR", "legR", (0.14, 0.98, 0)), ("thighR", "legR", (0.14, 0.76, 0)),
    ("kneeR", "legR", (0.14, 0.5, 0.02)), ("shinR", "legR", (0.14, 0.28, 0.01)),
    ("ankleR", "legR", (0.14, 0.1, 0)), ("footR", "legR", (0.14, 0.04, 0.02)),
    ("hipL", "legL", (-0.14, 0.98, 0)), ("thighL", "legL", (-0.14, 0.76, 0)),
    ("kneeL", "legL", (-0.14, 0.5, 0.02)), ("shinL", "legL", (-0.14, 0.28, 0.01)),
    ("ankleL", "legL", (-0.14, 0.1, 0)), ("footL", "legL", (-0.14, 0.04, 0.02)),
    ("pack", "back", (0, 1.46, -0.16)), ("thrusterL", "back", (-0.14, 1.42, -0.24)),
    ("thrusterR", "back", (0.14, 1.42, -0.24)), ("binderL", "back", (-0.24, 1.5, -0.18)),
    ("binderR", "back", (0.24, 1.5, -0.18)), ("stabilizer", "back", (0, 1.28, -0.22)),
    ("weaponR", "weapon", (0.3, 0.74, 0)), ("weaponL", "weapon", (-0.3, 0.74, 0)),
    ("shield", "weapon", (-0.33, 0.92, 0.04)),
]
SLOT_BY_ID = {s[0]: s for s in SLOTS}
GHOST = {
    "head": ((0, 1.82, 0), (0.18, 0.2, 0.2)),
    "torso": ((0, 1.4, 0.02), (0.32, 0.42, 0.2)),
    "waist": ((0, 1.06, 0), (0.26, 0.16, 0.18)),
    "armR": ((0.3, 1.12, 0), (0.12, 0.72, 0.12)),
    "armL": ((-0.3, 1.12, 0), (0.12, 0.72, 0.12)),
    "legR": ((0.14, 0.5, 0), (0.14, 0.96, 0.16)),
    "legL": ((-0.14, 0.5, 0), (0.14, 0.96, 0.16)),
    "back": ((0, 1.42, -0.2), (0.22, 0.28, 0.14)),
}
SKIP = {"weaponR", "weaponL", "shield"} | {f"extra{i}" for i in range(1, 9)}


def default_scale(sid: str) -> tuple[float, float, float]:
    g = SLOT_BY_ID.get(sid, ("", "", (0, 0, 0)))[1]
    if g == "head" or sid in ("extra5", "extra7"):
        return (0.72, 0.72, 0.72)
    table = {
        "collar": (0.92, 0.88, 0.92), "chestCore": (0.9, 1.06, 0.94),
        "pecL": (0.88, 1, 0.9), "pecR": (0.88, 1, 0.9), "cockpit": (0.88, 1, 0.88),
        "abdomen": (0.86, 1.1, 0.9), "pelvis": (0.9, 1, 0.92),
        "skirtF": (0.9, 1.06, 0.92), "skirtB": (0.9, 1.06, 0.92),
        "skirtL": (0.9, 1.1, 0.92), "skirtR": (0.9, 1.1, 0.92),
        "shoulderR": (0.88, 0.9, 0.88), "shoulderL": (0.88, 0.9, 0.88),
        "upperR": (0.88, 1.14, 0.88), "upperL": (0.88, 1.14, 0.88),
        "elbowR": (0.94, 0.94, 0.94), "elbowL": (0.94, 0.94, 0.94),
        "forearmR": (0.88, 1.14, 0.88), "forearmL": (0.88, 1.14, 0.88),
        "vambraceR": (0.9, 1.04, 0.9), "vambraceL": (0.9, 1.04, 0.9),
        "handR": (0.94, 0.94, 0.94), "handL": (0.94, 0.94, 0.94),
        "hipR": (1.06, 1.06, 1.06), "hipL": (1.06, 1.06, 1.06),
        "thighR": (1.16, 1.28, 1.16), "thighL": (1.16, 1.28, 1.16),
        "kneeR": (1.12, 1.08, 1.12), "kneeL": (1.12, 1.08, 1.12),
        "shinR": (1.14, 1.32, 1.14), "shinL": (1.14, 1.32, 1.14),
        "ankleR": (1.1, 1.06, 1.1), "ankleL": (1.1, 1.06, 1.1),
        "footR": (1.08, 1, 1.18), "footL": (1.08, 1, 1.18),
        "pack": (0.9, 0.94, 0.9),
        "thrusterL": (0.92, 0.92, 0.92), "thrusterR": (0.92, 0.92, 0.92),
        "binderL": (0.92, 0.96, 0.92), "binderR": (0.92, 0.96, 0.92),
    }
    return table.get(sid, (1.0, 1.0, 1.0))


def volume_slots(group: str):
    return [s for s in SLOTS if s[1] == group and s[0] not in SURFACE and not s[0].startswith("extra") and s[1] not in ("weapon", "extra")]


def slot_target_world(slot_id: str):
    defn = SLOT_BY_ID.get(slot_id)
    if not defn:
        return None
    ghost = GHOST.get(defn[1])
    if not ghost:
        return None
    gp, gs = ghost
    if slot_id in SURFACE:
        frac = SURFACE_FRAC.get(slot_id, (0.36, 0.28, 0.32))
        return (defn[2], tuple(gs[i] * frac[i] for i in range(3)))
    vols = volume_slots(defn[1])
    if len(vols) <= 1:
        return (gp, gs)
    axis = 1 if gs[1] >= gs[0] and gs[1] >= gs[2] else (0 if gs[0] >= gs[2] else 2)
    sorted_v = sorted(vols, key=lambda s: s[2][axis])
    gmin = gp[axis] - gs[axis] / 2
    gmax = gp[axis] + gs[axis] / 2
    cuts = [gmin]
    for i in range(1, len(sorted_v)):
        cuts.append((sorted_v[i - 1][2][axis] + sorted_v[i][2][axis]) / 2)
    cuts.append(gmax)
    try:
        idx = next(i for i, s in enumerate(sorted_v) if s[0] == slot_id)
    except StopIteration:
        return (gp, gs)
    lo0 = max(gmin, min(gmax, cuts[idx]))
    hi0 = max(gmin, min(gmax, cuts[idx + 1]))
    pad = (hi0 - lo0) * 0.12
    lo = max(gmin, lo0 - pad)
    hi = min(gmax, hi0 + pad)
    p = list(gp)
    s = list(gs)
    p[axis] = (lo + hi) / 2
    s[axis] = max(0.02, hi - lo)
    return (tuple(p), tuple(s))


def half_extent(solid):
    a, b, c = solid["s"]
    t = solid.get("t")
    if t in ("cyl", "hex", "prism"):
        r = max(abs(a), abs(b or a))
        return (r, c / 2, r)
    if t in ("sph", "octa"):
        return (a, a, a)
    if t == "cone":
        r = max(abs(a), abs(b or a))
        return (r, c / 2, r)
    if t == "capsule":
        return (a, abs(b) / 2 + a, a)
    if t == "torus":
        return (a + b, b, a + b)
    if t == "trap":
        d = solid.get("d") or 0.06
        return (max(a, b) / 2, c / 2, d / 2)
    return (a / 2, b / 2, c / 2)


def rotate_euler(r, v):
    cx, sx = math.cos(r[0]), math.sin(r[0])
    y1, z1 = v[1] * cx - v[2] * sx, v[1] * sx + v[2] * cx
    cy, sy = math.cos(r[1]), math.sin(r[1])
    x2, z2 = v[0] * cy + z1 * sy, -v[0] * sy + z1 * cy
    cz, sz = math.cos(r[2]), math.sin(r[2])
    return (x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2)


def solids_aabb(solids):
    mn = mx = None
    for s in solids:
        if s.get("visible") is False:
            continue
        h = half_extent(s)
        r = s.get("r") or [0, 0, 0]
        p = s["p"]
        for sx in (-h[0], h[0]):
            for sy in (-h[1], h[1]):
                for sz in (-h[2], h[2]):
                    c = rotate_euler(r, (sx, sy, sz))
                    x, y, z = p[0] + c[0], p[1] + c[1], p[2] + c[2]
                    if mn is None:
                        mn, mx = [x, y, z], [x, y, z]
                    else:
                        mn[0], mn[1], mn[2] = min(mn[0], x), min(mn[1], y), min(mn[2], z)
                        mx[0], mx[1], mx[2] = max(mx[0], x), max(mx[1], y), max(mx[2], z)
    return (mn, mx) if mn else None


def mul(v, sc):
    return [v[0] * sc[0], v[1] * sc[1], v[2] * sc[2]]


def div(v, sc):
    return [v[0] / sc[0], v[1] / sc[1], v[2] / sc[2]]


def to_visual(slot, solids):
    sc = default_scale(slot)
    out = []
    for s in solids:
        ns = dict(s)
        ns["p"] = mul(s["p"], sc)
        ns["s"] = mul(s["s"], sc)
        if s.get("d") is not None:
            ns["d"] = s["d"] * sc[2]
        out.append(ns)
    return out


def to_local(slot, solids):
    sc = default_scale(slot)
    out = []
    for s in solids:
        ns = dict(s)
        ns["p"] = div(s["p"], sc)
        ns["s"] = div(s["s"], sc)
        if s.get("d") is not None:
            ns["d"] = s["d"] / sc[2]
        out.append(ns)
    return out


def scale_solid(s, k, frm, to):
    ns = dict(s)
    ns["p"] = [(s["p"][i] - frm[i]) * k[i] + to[i] for i in range(3)]
    kx, ky, kz = k
    xz = min(kx, kz)
    t = s.get("t")
    a, b, c = s["s"]
    if t in ("cyl", "hex", "prism", "cone"):
        ns["s"] = [a * xz, b * xz, c * ky]
    elif t in ("sph", "octa"):
        r = min(kx, ky, kz)
        ns["s"] = [a * r, b * r, c * r]
    elif t == "capsule":
        ns["s"] = [a * xz, b * ky, c * xz]
    elif t == "torus":
        ns["s"] = [a * xz, b * min(kx, ky, kz), c * xz]
    elif t == "trap":
        ns["s"] = [a * kx, b * kx, c * ky]
        if s.get("d") is not None:
            ns["d"] = s["d"] * kz
    else:
        ns["s"] = [a * kx, b * ky, c * kz]
        if s.get("d") is not None:
            ns["d"] = s["d"] * kz
    return ns


def fit_visual(solids, center, size):
    aabb = solids_aabb(solids)
    if not aabb:
        return solids
    mn, mx = aabb
    src = [mx[i] - mn[i] for i in range(3)]
    frm = [(mn[i] + mx[i]) / 2 for i in range(3)]
    k = [1.0, 1.0, 1.0]
    for i in range(3):
        if src[i] < 1e-6:
            continue
        k[i] = min(K_MAX, max(K_MIN, (size[i] * FILL) / src[i]))
    to = [frm[i] + (center[i] - frm[i]) * CENTER_MIX for i in range(3)]
    return [scale_solid(s, k, frm, to) for s in solids]


def fit_solids(slot, solids):
    target = slot_target_world(slot)
    defn = SLOT_BY_ID.get(slot)
    if not target or not defn:
        return solids
    visual = to_visual(slot, solids)
    center = [target[0][i] - defn[2][i] for i in range(3)]
    return to_local(slot, fit_visual(visual, center, target[1]))


def ensure_hangar(slot, solids, space):
    if space == "hangar":
        return solids
    sc = default_scale(slot)
    if sc == (1.0, 1.0, 1.0):
        return solids
    out = []
    for s in solids:
        ns = dict(s)
        ns["p"] = div(s["p"], sc)
        ns["s"] = div(s["s"], sc)
        if s.get("d") is not None:
            ns["d"] = s["d"] / sc[2]
        out.append(ns)
    return out


def specs_from(solids):
    specs = []
    for s in solids:
        if s.get("visible") is False:
            continue
        t = "cyl" if s.get("t") in ("hex", "prism") else s.get("t")
        spec = {"t": t, "m": s.get("m"), "s": list(s["s"]), "p": list(s["p"])}
        r = s.get("r") or [0, 0, 0]
        if any(r):
            spec["r"] = list(r)
        if s.get("t") == "hex":
            spec["n"] = 6
        elif s.get("n"):
            spec["n"] = s["n"]
        if s.get("d") is not None and s.get("t") in ("trap", "cowl"):
            spec["d"] = s["d"]
        specs.append(spec)
    return specs


def normalize(part):
    slot = part["slot"]
    space = part.get("space")
    solids = ensure_hangar(slot, part["solids"], space)
    if space != "hangar":
        solids = fit_solids(slot, solids)
    part = dict(part)
    part["solids"] = solids
    part["specs"] = specs_from(solids)
    part["space"] = "hangar"
    part["version"] = 2
    return part


def kit_file(kit, parts):
    slots = {}
    forge = {}
    for sid, group, socket in SLOTS:
        if sid in SKIP or sid.startswith("extra"):
            slots[sid] = {"variant": "none", "visible": False}
            continue
        sx, sy, sz = default_scale(sid)
        slots[sid] = {"variant": kit, "visible": True, "sx": sx, "sy": sy, "sz": sz}
    by_slot = {p["slot"]: p for p in parts}
    for p in parts:
        sid = p["slot"]
        if sid in SKIP or sid.startswith("extra"):
            continue
        sx, sy, sz = default_scale(sid)
        slots[sid] = {"variant": kit, "visible": True, "sx": sx, "sy": sy, "sz": sz}
        forge[sid] = {
            "name": p.get("name", sid),
            "slot": sid,
            "kit": kit,
            "quad": p.get("quad"),
            "letter": p.get("letter"),
            "space": "hangar",
            "solids": p["solids"],
            "specs": p["specs"],
        }
    return {
        "kind": "mosa-hangar",
        "version": 9,
        "name": kit,
        "kit": kit,
        "poseId": "attention",
        "theme": "dark",
        "selected": "helm",
        "explode": 0,
        "autoRotate": False,
        "edges": True,
        "symmetry": True,
        "uniformScale": True,
        "groupFilter": "head",
        "slots": slots,
        "forgeParts": forge,
    }


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "public/kit-pack.zip")
    dst = Path(sys.argv[2] if len(sys.argv) > 2 else "public/kit-pack.zip")
    files = []
    with zipfile.ZipFile(src) as z:
        for name in z.namelist():
            if not name.lower().endswith(".json"):
                continue
            raw = json.loads(z.read(name))
            if isinstance(raw, list):
                parts = raw
            else:
                parts = [raw]
            for p in parts:
                if p.get("kind") == "mosa-hangar":
                    continue
                if not p.get("solids") or not p.get("slot"):
                    continue
                files.append(normalize(p))
    by_kit = defaultdict(list)
    for p in files:
        by_kit[p["kit"]].append(p)
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for kit in sorted(by_kit):
            z.writestr(f"{kit}.json", json.dumps(kit_file(kit, by_kit[kit]), separators=(",", ":")))
    dst.write_bytes(buf.getvalue())
    print(f"baked {len(by_kit)} kits / {len(files)} parts → {dst}")


if __name__ == "__main__":
    main()
