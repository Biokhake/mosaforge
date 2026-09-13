# MOSA Hangar ← Forge 호환 인제스트

**이 문서는 MOSA 행거(mosa.grok.me / Biokhake/MOSA-Editor) 봇에게 붙이는 단일 브리프다.**  
행거가 Forge가 보낸 JSON을 **같은 솔리드로** 그리게 만드는 패치 명세다. 행거 소스만 고친다. Forge를 다시 만들지 마라.

Forge 라이브: 이 앱의 Export kit → MOSA  
Forge 소스: https://github.com/Biokhake/mosaforge  
행거 라이브: https://mosa.grok.me/

---

## 0. 한 줄

슬롯에 `forgeParts[slotId].specs`가 있으면 **kitFactory + dressPart2를 타지 말고 그 specs를 그대로 메쉬로 그린다.** 없으면 지금처럼 recipe로 생성한다.

---

## 1. 하지 마라

- Forge 앱을 이 워크스페이스에 다시 만들지 마라.
- GLB / CSG / 스컬프트 추가하지 마라.
- `ensureLR` / `dressPart2` / `makeStandoffArmor`를 forge specs 위에 덧씌우지 마라. 시임·모티프는 이미 Forge 솔리드에 들어 있다.
- 슬롯 소켓 좌표를 다시 더하지 마라. specs의 `p`는 **이미 소켓 로컬**이다.
- overlay라고 해서 `sx/sy/sz`를 1로 리셋하지 마라. specs는 **defaultScaleFor 적용 전**이다. 행거가 recipe와 같이 슬롯 스케일을 곱아야 Forge와 크기가 같다.
- `trap`의 `s`를 box `[w,h,d]`로 읽지 마라.

---

## 2. 파일 세 종류 — 전부 Import JSON이 받는다

### A. 기존 행거 세이브 (그대로)

```json
{ "version": 9, "name": "FRAME-00", "slots": { "helm": { "variant": "SSA-001", "visible": true } } }
```

`forgeParts` 없으면 현재 동작 유지.

### B. Forge 킷 세이브 (지금 Forge가 뽑는 것)

파일명 예: `ssa-001-mosa.json`

```json
{
  "kind": "mosa-hangar",
  "version": 9,
  "name": "SSA-001",
  "kit": "SSA-001",
  "poseId": "attention",
  "theme": "dark",
  "slots": {
    "helm": { "variant": "SSA-001", "visible": true, "sx": 0.72, "sy": 0.72, "sz": 0.72 },
    "weaponR": { "variant": "none", "visible": false }
  },
  "forgeParts": {
    "helm": {
      "name": "Helm · Blunt",
      "specs": [
        { "t": "box", "m": "dark", "s": [0.14, 0.15, 0.16], "p": [0, -0.01, -0.02] }
      ]
    }
  }
}
```

- `slots` 는 지금 PersistBlob과 같다. variant / visible / paint / 트랜스폼 그대로 머지.
- Forge가 장갑 슬롯에 `sx,sy,sz`를 넣는다. 값은 행거 `defaultScaleFor`와 같다. 있으면 그대로, 없으면 defaultScaleFor.
- `forgeParts[slotId].specs` 가 그 슬롯의 메쉬다. **p/s/d는 슬롯 스케일 적용 전 소켓 로컬.**
- 없는 슬롯은 recipe fallback.
- 무장·extra는 Forge가 `none`으로 보낸다. 행거 무기 생성기를 유지.

### C. 파츠 하나 (`mosa-forge-part`)

```json
{
  "kind": "mosa-forge-part",
  "version": 2,
  "name": "Helm · Blunt",
  "slot": "helm",
  "kit": "SSA-001",
  "quad": "SS",
  "letter": "A",
  "space": "hangar",
  "specs": [ { "t": "trap", "m": "prim", "s": [0.16, 0.20, 0.18], "p": [0, 0.02, -0.01], "r": [-0.08, 0, 0], "d": 0.17 } ]
}
```

이 파일이 들어오면:

1. 해당 `slot`의 `variant`를 `kit`로 설정, `visible: true`
2. `forgeParts[slot] = { name, specs }`
3. 나머지 슬롯은 건드리지 않는다

`solids`는 Forge 에디터용이다. 행거는 **specs만** 본다. specs가 없고 solids만 있으면 solids에서 specs를 내려 써도 된다 (visible만, hex/prism → cyl).

---

## 3. Spec 계약 (양쪽 동일)

Y-up, Z-forward, 단위 미터, 원점 = **그 슬롯의 소켓**. 회전은 라디안, XYZ 오일러.

```
t   도형
m   prim | sec | acc | trim | dark | metal | visor | glow | joint
s   [a, b, c]
p   [x, y, z]
r?  영벡터면 생략. 있으면 [rx, ry, rz]
n?  곡면 세그먼트
d?  trap 깊이만. cowl은 s[2]가 깊이.
```

### s 의미 — 이걸 틀리면 형상이 깨진다

| t | s[0] | s[1] | s[2] | 기타 |
|---|---|---|---|---|
| box | w | h | d | quad==SR 이면 RoundedBox, radius = min(w,h,d)*0.08 |
| cyl | topR | botR | h | n 기본 레시피 segs. Forge hex는 cyl+n=6 |
| sph | r | r | r | n |
| cone | topR | botR | h | n. botR만 있고 topR=0이면 원뿔 |
| capsule | r | length | 0 | n. THREE.CapsuleGeometry(r, length) |
| octa | r | 0 | 0 | |
| torus | R | tube | 0 | n |
| wedge | w | h | d | Forge `createWedgeGeometry`와 동일 와인딩 |
| trap | **wTop** | **wBot** | **h** | **d = 깊이** (없으면 0.06). Hangar `createTrapezoidGeometry(wTop,wBot,h,d)` |
| cowl | w | h | d | Forge/Hangar `createCowlGeometry` |

행거 전용 t (`claw`, `heel`, `hover`, `wing`, `layer`, `tetra`, `knot`, `hemi`, `ring`, `dodeca`, `icosa`)는 Forge가 안 보낸다. 오면 지금 생성기 유지.

알 수 없는 t → box.

### trap 주의

지금 행거 trapezoid는 `d` 기본 0.04 하드코드다. Forge는 `d`를 따로 보낸다.

```ts
if (spec.t === "trap") {
  const [wTop, wBot, h] = spec.s;
  const depth = spec.d ?? 0.06;
  geo = createTrapezoidGeometry(wTop, wBot, h, depth);
}
```

Spec 타입에 `d?: number` 추가.

### 3.1 슬롯 스케일 (최초 배치가 틀어지는 이유)

행거는 소켓 로컬 specs를 붙인 뒤 슬롯 그룹에 `defaultScaleFor(slot)` 을 곱한다. Forge overlay도 **같은 곱셈을 탄다.** specs 안에 스케일을 다시 넣거나 overlay만 sx=1로 빼지 마라.

Forge가 보내는 `p/s/d`는 이미 이 스케일 **앞** 값이다. 행거가 곱하면 Forge 뷰포트(고스트)와 크기가 같다.

```ts
// 행거 defaultScaleFor — Forge slots.sx/sy/sz 와 동일
head / extra5 / extra7          0.72
collar                          0.92, 0.88, 0.92
chestCore                       0.9, 1.06, 0.94
pecL/R                          0.88, 1, 0.9
cockpit                         0.88, 1, 0.88
abdomen                         0.86, 1.1, 0.9
pelvis                          0.9, 1, 0.92
skirtF/B                        0.9, 1.06, 0.92
skirtL/R                        0.9, 1.1, 0.92
shoulder                        0.88, 0.9, 0.88
upper                           0.88, 1.14, 0.88
elbow                           0.94
forearm                         0.88, 1.14, 0.88
vambrace                        0.9, 1.04, 0.9
hand                            0.94
hip                             1.06
thigh                           1.16, 1.28, 1.16
knee                            1.12, 1.08, 1.12
shin                            1.14, 1.32, 1.14
ankle                           1.1, 1.06, 1.1
foot                            1.08, 1, 1.18
pack                            0.9, 0.94, 0.9
thruster                        0.92
binder                          0.92, 0.96, 0.92
else                            1
```

---

## 4. 패치 지점

### 4.1 `specsFor(slotId, variant, beamZ)` 

파일: `src/lib/mech/geometry.ts` (또는 현재 specsFor가 있는 곳)

맨 앞:

```ts
const overlay = getForgeSpecs(slotId); // store에서
if (overlay && overlay.length) return overlay; // 복사본. mutate 금지
```

그 다음 기존 weapon / extra / kitFactory 분기.

`ensureLR` / `dressPart2`는 overlay 경로에서 호출하지 않는다. 좌우 파츠는 Forge가 `ankleL` / `ankleR`로 따로 보냈다.

### 4.2 세션 상태

```ts
forgeParts: Record<string, { name?: string; specs: Spec[] }>
```

PersistBlob / localStorage 키 `frame-mix-build-v10` 에 `forgeParts`를 같이 저장. 버전 숫자는 올리지 말고 필드만 추가해도 된다. 구세이브는 `forgeParts` 없음 = 빈 객체.

`resetAll` 하면 forgeParts도 비운다. `setVariant(id, kit)`로 유저가 킷을 바꾸면 그 슬롯의 forgeParts[id]를 지운다 (다시 recipe). `applyFamily`는 덮어쓴 슬롯의 overlay를 지운다.

### 4.3 `importJson`

순서:

1. JSON.parse
2. `kind === "mosa-forge-part"` → 단일 슬롯 주입, return true
3. `slots`가 있으면 기존 PersistBlob 머지 (지금 코드)
4. `forgeParts`가 있으면 세션에 저장 후 `refreshAll()`
5. 성공 toast: `MOSA kit SSA-001 · 54 overlay` 처럼 슬롯 수

알 수 없는 kind + slots 없음 → 지금처럼 false.

zip은 받지 않아도 된다. Forge가 이미 한 파일로 묶어 보낸다.

### 4.4 메쉬 빌드

행거가 Spec → BufferGeometry 하는 switch에 trap/`d`, capsule, cowl이 Forge와 같아야 한다. box+SR 필렛은 overlay에도 적용 (Forge 뷰포트와 맞추려고).

팔레트는 기존 `getPalette(recipe)` + slot.paint / paint2 / visor light. overlay specs의 `m` 키를 그대로 쓴다. 새 재질 만들지 마라.

슬롯 트랜스폼(px…sz), 그룹 트랜스폼, 포즈, explode는 지금처럼 메쉬 그룹에 적용. overlay는 로컬 지오메트리만 바꾼다. **슬롯 sx/sy/sz는 recipe와 동일하게 적용** — overlay라고 1로 두지 마라. Forge JSON에 sx가 있으면 그걸 쓰고, 없으면 defaultScaleFor.

### 4.5 UI

Import JSON 툴팁/토스트에 "Forge 킷 · 파츠 JSON 가능" 한 줄. 새 패널 만들지 마라.

선택 슬롯에 overlay가 있으면 스타일 코드 옆에 `FORGE` 뱃지. 클릭해서 overlay 지우기(recipe로 복귀)는 있으면 좋고 없어도 된다.

---

## 5. 슬롯 ID

카탈로그 id 그대로. 라벨 아님.

```
helm visor brow eyeL eyeR nose mouth jaw earL earR vfin antennaL antennaR
cheekL cheekR chin
collar chestCore pecL pecR cockpit abdomen
pelvis skirtF skirtB skirtL skirtR
shoulderR upperR elbowR forearmR vambraceR handR
shoulderL upperL elbowL forearmL vambraceL handL
hipR thighR kneeR shinR ankleR footR
hipL thighL kneeL shinL ankleL footL
pack thrusterL thrusterR binderL binderR stabilizer
weaponR weaponL shield
extra1 extra2 extra3 extra4 extra5 extra6 extra7 extra8
```

`vfin` = Crest. Forge도 이 id를 쓴다.

---

## 6. 검증

1. Forge에서 SSA-001 → Export kit to MOSA → `ssa-001-mosa.json` 받기
2. 행거 JSON 가져오기
3. 전신 슬롯 variant가 SSA-001
4. helm / chestCore / shoulderR 형상이 Forge 뷰포트와 같은 스택 (솔리드 수·위치)
5. 페이지 리로드 후에도 overlay 유지 (localStorage)
6. 그 슬롯 킷을 SSB-002로 바꾸면 overlay 사라지고 recipe SSB
7. overlay 없는 visor/crest는 기존 visor()/vfin() 생성
8. 구버전 세이브(forgeParts 없음) 로드가 깨지지 않는다
9. typecheck · smoke 통과. 콘솔 에러 없음

---

## 7. 작업 카드 (행거 봇)

1. Spec에 `d?: number`
2. trap 메쉬가 `d`를 쓴다
3. store에 `forgeParts` + persist + importJson 세 종류
4. `specsFor` overlay 가드 (dress/ensureLR 스킵)
5. setVariant / applyFamily / resetAll이 overlay를 정리
6. FORGE 뱃지
7. SSA-001 샘플 JSON으로 수동 확인

한 PR처럼 이 일곱 개만. 레시피 테이블·팔레트·포즈는 건드리지 마라.

---

## 8. 최소 샘플 (행거가 바로 먹어야 함)

```json
{
  "kind": "mosa-hangar",
  "version": 9,
  "name": "SSA-001",
  "kit": "SSA-001",
  "poseId": "attention",
  "theme": "dark",
  "slots": {
    "helm": { "variant": "SSA-001", "visible": true, "sx": 0.72, "sy": 0.72, "sz": 0.72 }
  },
  "forgeParts": {
    "helm": {
      "name": "Helm · Blunt",
      "specs": [
        { "t": "box", "m": "dark", "s": [0.14, 0.15, 0.16], "p": [0, -0.01, -0.02] },
        { "t": "trap", "m": "prim", "s": [0.16, 0.20, 0.18], "p": [0, 0.02, -0.01], "r": [-0.08, 0, 0], "d": 0.17 },
        { "t": "box", "m": "glow", "s": [0.09, 0.02, 0.016], "p": [0, 0.03, 0.086] }
      ]
    }
  }
}
```

이 JSON을 행거 Import에 넣으면 헬름만 Forge 솔리드, 나머지는 recipe.
`sx/sy/sz` 0.72는 helm defaultScale. specs 숫자는 그 앞 값이다.

---

Forge 쪽은 이미 `Export {kit} → MOSA`가 이 스키마를 뽑는다. 행거는 읽기만 하면 된다.
