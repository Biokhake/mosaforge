# MOSA Forge — 파츠 조형 명세

**이 문서는 Grok 봇에게 파츠 생성 태스크를 줄 때 붙이는 단일 브리프다.** 행거 소스·CAD 없이 이 파일만으로 `mosa-forge-part` JSON을 만들 수 있어야 한다.

행거 라이브: [mosa.grok.me](https://mosa.grok.me/)  
행거 제품 개요: [MOSA.md](attachments/MOSA.md)
행거 인제스트 브리프: [MOSA-HANGAR.md](MOSA-HANGAR.md)

---

## 0. 분장

| 제품 | 한다 | 안 한다 |
|---|---|---|
| **MOSA Hangar** | 골격 위 슬롯 조합, 킷 스타일 선택, 색·포즈 | 신규 메쉬 조형 |
| **MOSA Forge** | 슬롯 1개의 솔리드 스택을 깎고 JSON으로 내보낸다 | 전신 리깅, GLB, CSG, 스컬프트 |

파츠는 밖에서 만들고, 행거는 조합만 맡는다. Forge가 그 밖이다.

봇 산출물은 **슬롯 1개 · 킷 1개 · 솔리드 스택 1개**. 전신을 한 파일에 넣지 않는다.

---

## 1. 에디터 사용법

화면은 상단 바 + 좌측 Solids + 중앙 뷰포트 + 우측 Inspector. 라이브러리 아이콘을 누르면 우측이 Library로 바뀌고, 슬라이더 아이콘으로 Inspector로 돌아온다.

### 상단

| 컨트롤 | 역할 |
|---|---|
| 이름 | 파일명·라이브러리 라벨. `Helm · Blunt` 형식 권장. |
| Slot | 붙일 소켓. 바꾸면 고스트 바디가 그 슬롯 기준으로 재정렬된다. **솔리드는 리셋되지 않는다.** |
| SS / SR / RS / RR | 킷 밴드. 박스 필렛·원통 세그먼트에 영향. |
| Letter A–Z | 밴드 안 랭크. 스킵 글자는 셀렉트에 없다. |
| 킷 ID | `{quad}{letter}-{serial:03}` 미리보기. 예: `SSA-001`. |
| Undo / Redo | 솔리드 히스토리. |
| Reset | 현재 슬롯의 기본 시드를 다시 깐다. |
| Save | 브라우저 라이브러리 (최대 40). |
| Library / Edit | 우측 패널 전환. |
| Export JSON | `mosa-forge-part` 파일 다운로드. 행거가 읽는 `specs` 포함. |
| Import JSON | 같은 스키마만 받는다. `kind`가 다르면 거부. |
| Snapshot | 뷰포트 PNG. |

### 뷰포트

- 원점 `(0,0,0)` = **현재 슬롯의 소켓**. 금색 옥타가 소켓 마커.
- 고스트 와이어 = 전신 볼륨. 현재 그룹은 밝다. 파츠가 이웃 슬롯을 먹으면 안 된다.
- 드래그 공백 = 궤도 카메라. 솔리드 클릭 = 선택. 공백 클릭 = 선택 해제.
- 선택 솔리드에 Transform gizmo. Inspector의 T / R / S 또는 단축키로 모드.
- Snap 기본 `0.005`. 회전 스냅은 snap>0이면 `π/36`.

### 단축키

| 키 | 동작 |
|---|---|
| G / 1 | Translate |
| R / 2 | Rotate |
| S / 3 | Scale |
| Ctrl/⌘ Z | Undo |
| Ctrl/⌘ Shift Z | Redo |
| Ctrl/⌘ D | Duplicate (+0.03 X) |
| Delete / Backspace | 선택 삭제 (잠금이면 무시) |

입력 필드에 포커스면 단축키 꺼진다.

### Solids 패널

- 상단 12 도형 버튼 = 그 도형을 스택에 추가. 선택 솔리드가 있으면 그 옆(+0.02 X)에 생긴다.
- Seed = 슬롯별 아치 템플릿. **시드를 누르면 스택을 통째로 교체한다.**
- 눈 = visible. 잠금 = gizmo·삭제 차단.
- Add / Duplicate / Delete.

없는 슬롯은 Blank 시드 (trap + frame)만 나온다. 그게 조형 시작점이다.

### Inspector

Shape, Layer(재질), Position / Rotation(rad) / Size, trap·cowl의 Depth `d`, 곡면 도형의 Segments `n`.

Viewport 토글: Grid, Ghost, Edges, Socket. **Apply kit segments**는 현재 밴드·글자의 `n`을 cyl/sph/cone/capsule/prism/torus에 다시 찍는다.

---

## 2. 좌표 · 단위 · 소켓

Y-up, 오른손, Z+ = 전방 (얼굴·가슴이 +Z). 단위는 미터급. 헬름 두개골 한 변 ≈ 0.16–0.22.

솔리드 `p`는 **소켓 로컬 · 행거 스케일 적용 전**. 행거에 꽂히면 월드 = 소켓 + `p * defaultScaleFor(slot)`.

봇 JSON은 고스트 실루엣 기준(visual)으로 쓴다. `space`를 생략하면 Forge가 인제스트 때 hangar-local로 나눈다. Forge가 다시 뽑는 파일은 `space: "hangar"`.

헬름 소켓 월드 = `[0, 1.82, 0]`. 뷰포트는 이걸 원점으로 당긴 뒤 슬롯 스케일을 곱해 보여 준다. 고스트는 행거 월드 볼륨이라 파츠와 크기가 맞는다.

### 슬롯 (id · 라벨 · 소켓 월드)

그룹은 고정이다. 좌우 쌍은 미러. 오른쪽 시드를 만들고 X를 뒤집어 왼쪽을 뽑는다.

**Head**

| id | 라벨 | socket |
|---|---|---|
| helm | Helm | 0, 1.82, 0 |
| visor | Visor | 0, 1.81, 0.065 |
| brow | Brow | 0, 1.87, 0.06 |
| eyeL / eyeR | Eye L/R | ±0.048, 1.82, 0.07 |
| nose | Nose | 0, 1.79, 0.075 |
| mouth | Mouth | 0, 1.745, 0.065 |
| jaw | Jaw | 0, 1.69, 0.04 |
| earL / earR | Ear L/R | ±0.115, 1.81, 0 |
| vfin | Crest | 0, 1.91, 0.04 |
| antennaL / antennaR | Antenna L/R | ±0.08, 1.89, -0.01 |
| cheekL / cheekR | Cheek L/R | ±0.095, 1.76, 0.035 |
| chin | Chin Guard | 0, 1.71, 0.065 |

**Torso** — collar 0,1.62,0.02 · chestCore 0,1.44,0.04 · pecL/R ±0.13,1.46,0.09 · cockpit 0,1.4,0.14 · abdomen 0,1.22,0.03

**Waist** — pelvis 0,1.06,0 · skirtF 0,1.02,0.12 · skirtB 0,1.02,-0.1 · skirtL/R ±0.16,1.02,0

**Arm R** (L은 X 부호 반전, id `shoulderL`…) — shoulderR 0.3,1.48,0 · upperR 0.3,1.28,0 · elbowR 0.3,1.1,0 · forearmR 0.3,0.92,0 · vambraceR 0.3,0.9,0.03 · handR 0.3,0.74,0

**Leg R** — hipR 0.14,0.98,0 · thighR 0.14,0.76,0 · kneeR 0.14,0.5,0.02 · shinR 0.14,0.28,0.01 · ankleR 0.14,0.1,0 · footR 0.14,0.04,0.02

**Back** — pack 0,1.46,-0.16 · thrusterL/R ±0.14,1.42,-0.24 · binderL/R ±0.24,1.5,-0.18 · stabilizer 0,1.28,-0.22

**Weapons** — weaponR 0.3,0.74,0 · weaponL -0.3,0.74,0 · shield -0.33,0.92,0.04

**Extra HP** — extra1 R Shoulder · extra2 L Shoulder · extra3 R Hip · extra4 L Hip · extra5 Head Rear · extra6 Waist Rear · extra7 Face Front · extra8 Chest

### 고스트 박스 (이웃을 침범하지 말 것)

| id | center | size |
|---|---|---|
| head | 0, 1.82, 0 | 0.18, 0.20, 0.20 |
| torso | 0, 1.40, 0.02 | 0.32, 0.42, 0.20 |
| waist | 0, 1.06, 0 | 0.26, 0.16, 0.18 |
| armR / armL | ±0.30, 1.12, 0 | 0.12, 0.72, 0.12 |
| legR / legL | ±0.14, 0.50, 0 | 0.14, 0.96, 0.16 |
| pack | 0, 1.42, -0.20 | 0.22, 0.28, 0.14 |

헬름 솔리드가 head 박스를 크게 넘기면 실패. 어깨 셸이 머리·팩을 뚫으면 실패.

---

## 3. 솔리드 언어

한 파츠 = `Solid[]` 스택. CSG 없음. 겹쳐서 실루엣을 만든다. 권장 4–10개. 18개 넘기지 말 것.

### Solid

```
id        string     파일 안에서 유일. `s-skull` 같이 슬러그.
name      string     사람이 읽는 레이어명. Skull, Visor, Frame…
t         Shape      아래 표
m         MatKey     레이어 재질
p         [x,y,z]    소켓 로컬 위치
r         [x,y,z]    오일러 rad, XYZ
s         [a,b,c]    도형별 의미 다름. 스케일 필드가 아니라 치수.
d?        number     trap / cowl 깊이
n?        number     곡면 세그먼트
visible   boolean    false면 export specs에서 빠진다
locked    boolean    에디터 잠금. 행거는 무시.
```

### Shape → `s` 의미

| t | 기하 | s = [a, b, c] | 기본 s |
|---|---|---|---|
| box | 박스. SR 밴드면 코너 필렛 `min(a,b,c)*0.08` | 가로, 세로, 깊이 | 0.12, 0.08, 0.10 |
| trap | 사다리꼴 프리즘 | 윗변, 아랫변, 높이. `d` = 두께 | 0.10, 0.14, 0.12 · d 0.07 |
| wedge | 전방 쐐기 | 가로, 세로, 깊이 | 0.10, 0.12, 0.12 |
| cowl | 후드/카울 | 가로, 세로, 깊이 | 0.14, 0.12, 0.16 |
| cyl | Y축 원통 | 윗반지름, 아랫반지름, 높이 | 0.05, 0.05, 0.10 |
| hex | 6각 기둥 (cyl n=6) | 윗반지름, 아랫반지름, 높이 | 0.07, 0.07, 0.10 |
| prism | n각 기둥 | 같음. `n` ≥ 5 | 0.06, 0.06, 0.10 |
| cone | 원뿔 | a 무시, b=반지름, c=높이 | 0.01, 0.04, 0.10 |
| sph | 구 | a=반지름 | 0.05, 0.05, 0.05 |
| capsule | 캡슐 | a=반지름, b=원통 길이 | 0.03, 0.08, 0 |
| octa | 팔면체 | a=반지름 | 0.05, 0, 0 |
| torus | 토러스 | a=반지름, b=튜브 | 0.05, 0.012, 0 |

가로 원통(액슬·피스톤)은 `cyl` + `r: [0, 0, π/2]` 또는 `[π/2, 0, 0]`.

### 재질 `m`

| key | 쓰임 | 기본색 |
|---|---|---|
| prim | Part 1 메인 장갑 | 밴드별 오프화이트 |
| sec | Part 2. A–L은 시임, M–Z는 장식 모티프 | #3a3e48 |
| acc | 포인트 (적) | #b42222 |
| trim | 금 트림. 장식 키트만 | #c4a35a |
| dark | 프레임. 관절축·연결부만 | #2a2c31 |
| metal | 피스톤, 림, 노즐 | #8b919a |
| joint | 관절 캡 | #3d4048 |
| visor | 센서 유리 | #79d7ff 발광 |
| glow | 바이저 라이트·분사구 | #79d7ff 더 밝음 |

프레임을 검게 칠하려고 장갑 전체를 `dark`로 두지 않는다. Eye 슬롯만 강한 발광.

---

## 4. 킷 문법 — SS / SR / RS / RR

한 키트 = 한 골격 언어. **크기만 바꿔 100칸을 채우지 않는다.** 동일 형태소 반복 금지.

### ID

`{major}{form}{letter}-{serial:03}`

| Band | Serial | Skip | 실루엣 | 모서리 |
|---|---|---|---|---|
| SS | 001–025 | S | 직선 | 각진. 박스·4–8각 프리즘. 라운드/고구 금지. |
| SR | 026–050 | R | 직선 | 둥근 필렛. 스파이크 금지. |
| RS | 051–075 | S | 곡선 | 뾰족 (콘·혼·블레이드). 필렛으로 둥글게 위장 금지. |
| RR | 076–100 | R | 곡선 | 구·캡슐·고세그. 각진 프리즘·날카로운 뿔 금지. |

글자 집합:

```
SS  ABCDEFGHIJKLMNOPQRTUVWXYZ   (S 없음)
SR  ABCDEFGHIJKLMNOPQSTUVWXYZ   (R 없음)
RS  ABCDEFGHIJKLMNOPQRTUVWXYZ   (S 없음)
RR  ABCDEFGHIJKLMNOPQSTUVWXYZ   (R 없음)
```

serial = 밴드 베이스 + 글자 인덱스.

```
SS base 1    SR base 26    RS base 51    RR base 76
SSA-001  SSB-002  …  SSR-018  SST-019  …  SSZ-025
SRA-026  …  SRQ-042  SRS-043  …  SRZ-050
RSA-051  …  RSR-068  RST-069  …  RSZ-075
RRA-076  …  RRQ-092  RRS-093  …  RRZ-100
```

### 밀도 1–12

Letter 코드포인트 기준. A=0 … Z=25. `ornate = letter >= "M"`.

| 구간 | rank | density | 장식 |
|---|---|---|---|
| A–L | 0–11 | `index+1` → 1–12 | **적음.** 뿔·패널·날개 0–1. 면 분할로 밀도. 크레스트 슬롯 비움. |
| M–Z | 12–24 | `min(12, index-11)` → 1–12 | **많음.** A–L과 **다른 골격 + 그 키트만의 장식 1세트.** |

밀도는 스케일이 아니다. 면 분할·세그먼트·패널 수다. 헬름이 기준. 가슴·팔·다리·팩은 같은 계수.

### 세그먼트 `n`

```
SS  4 + floor(density / 3)     → 4–8   각진 유지
SR  8 + density                → 9–20
RS  10 + density               → 11–22
RR  16 + density               → 17–28
```

에디터의 Apply kit segments가 이 값을 곡면 솔리드에 찍는다. JSON을 손으로 쓸 때도 cyl/sph/cone/capsule/prism/torus에 같은 `n`을 넣는다.

A–L 헬름 레이어 수 = `2 + floor((density-1)/3)` (2–5). 장식 없이 면만 는다.

### 헬름 아치 (빌드 시작점)

사각 뚜껑 금지. 정수리 = 완만한 다각형, 턱으로 갈수록 좁아지는 테이퍼.

**A–L — 장식 최소, 밀도 = 면**

| rank | L | arch | 구조 |
|---|---|---|---|
| 0 | A | blunt | 약한 테이퍼 스택. 뭉툭. 피크 없음. |
| 1 | B | hex | 6각 프리즘 두개골. |
| 2 | C | wedge | 경사 바이저면. |
| 3 | D | bucket | 원통/각통 오픈페이스. |
| 4 | E | shelf | 전방 브로우 선반. |
| 5 | F | diamond | 45° 크라운 + 사각 턱. |
| 6 | G | split | 좌우 이엽. |
| 7 | H | trap | 강한 턱 테이퍼. |
| 8 | I | snout | 전방 주둥이 볼륨. |
| 9 | J | hood | 후방 카울. |
| 10 | K | step | 밀도 = 계단 수. |
| 11 | L | gem | 팔면체 정수리. |

**M–Z — 다른 머리통 + 고유 장식 1세트**

| rank | L | arch | 장식 |
|---|---|---|---|
| 12 | M | anvil | 넓은 T 크라운 |
| 13 | N | arrow | **유일 `^` 쉐브론** (밴드당 이 키트만) |
| 14 | O | beak | 하향 비크 |
| 15 | P | clam | 이매패 셸 |
| 16 | Q | plow | 전방 플로우 플레이트 |
| 17 | R | tower | 수직 타워 (SS/RS만. SR/RR은 R 스킵 → 이 칸 없음) |
| 18 | T | mask | 전면 마스크 |
| 19 | U | cap | 돔 캡 |
| 20 | V | ram | 사이드 램 |
| 21 | W | ridge | 정수리 리지 |
| 22 | X | facet | 밀도 격자 패널 |
| 23 | Y | hawk | 후퇴 스웹 |
| 24 | Z | cage | 프레임 케이지 |

같은 아치 이름이어도 밴드는 프리미티브가 다르다. **SS arrow ≠ RR arrow.** SS arrow는 box/trap/wedge. RR arrow는 capsule/sph로 같은 실루엣만 남긴다.

### 밴드 언어 (전 파츠)

| Band | 쓸 것 | 금지 |
|---|---|---|
| SS | box, trap, wedge, hex, prism n≤8, 날카로운 cone은 장식 키트만 | rounded 느낌, sph, capsule, torus, n>8 |
| SR | box (필렛 자동), trap, cyl n≈8+d | 스파이크, cone 뿔, 강한 곡면 실루엣, octa 날카로움 |
| RS | cyl, cone, wedge, cowl + 뾰족 장식 | 필렛만으로 둥글게 위장, 순수 구 덩어리 |
| RR | sph, capsule, torus, cyl n≥16, cowl | box 각진 스택, trap을 칼날처럼, 날카로운 뿔 |

### 형태소 규칙

1. 한 형태소(헬름 `^` 핀, 트윈 혼, 헤일로 등)는 **밴드당 최대 2키트. 기본 0–1.** SSA와 SSH가 같은 `^`를 공유하지 않는다. `^`는 arrow (SSN-014) 한 키트.
2. 스케일만 다른 복제는 다른 키트가 아니다. 높이/두께를 밀도로 쓰지 않는다.
3. 바이저는 핵심 가독 요소라 A–L에서도 키트마다 다르다. 크레스트(`vfin`)는 장식이라 **A–L에서 비운다.**
4. Part 2(`sec`)는 장식 레이어. A–L은 구조 시임만. M–Z만 모티프.
5. 기본 코/안테나에 밴드 공통 스파이크를 넣지 않는다.
6. 좌우 미러 쌍은 한쪽만 조형하고 X 미러. 비대칭 장식은 M–Z에서만, 그리고 키트당 한 쪽.

---

## 5. 산출 스키마

파일 하나 = 파츠 하나.

```json
{
  "kind": "mosa-forge-part",
  "version": 1,
  "name": "Helm · Blunt",
  "slot": "helm",
  "kit": "SSA-001",
  "quad": "SS",
  "letter": "A",
  "solids": [ ],
  "specs": [ ]
}
```

`kind`가 `"mosa-forge-part"`가 아니면 Forge가 거부한다.

### specs (행거 인제스트)

visible 솔리드만. Forge export가 자동 생성. 손으로 쓸 때도 같은 규칙을 따른다.

```
t   hex|prism → "cyl" 로 내린다. 나머지는 그대로.
m   MatKey
s   [a,b,c]
p   [x,y,z]
r?  영벡터면 생략
n?  hex는 6. 그 외 곡면은 솔리드 n
d?  trap|cowl 만
```

### 최소 예시 — SSA-001 Helm · Blunt

```json
{
  "kind": "mosa-forge-part",
  "version": 1,
  "name": "Helm · Blunt",
  "slot": "helm",
  "kit": "SSA-001",
  "quad": "SS",
  "letter": "A",
  "solids": [
    {
      "id": "s-frame", "name": "Frame", "t": "box", "m": "dark",
      "s": [0.14, 0.15, 0.16], "p": [0, -0.01, -0.02], "r": [0, 0, 0],
      "visible": true, "locked": false
    },
    {
      "id": "s-skull", "name": "Skull", "t": "trap", "m": "prim",
      "s": [0.16, 0.20, 0.18], "p": [0, 0.02, -0.01], "r": [-0.08, 0, 0],
      "d": 0.17, "visible": true, "locked": false
    },
    {
      "id": "s-visor", "name": "Visor", "t": "box", "m": "glow",
      "s": [0.09, 0.02, 0.016], "p": [0, 0.03, 0.086], "r": [0, 0, 0],
      "visible": true, "locked": false
    },
    {
      "id": "s-brow", "name": "Brow", "t": "trap", "m": "sec",
      "s": [0.07, 0.10, 0.04], "p": [0, 0.09, 0.055], "r": [0.22, 0, 0],
      "d": 0.05, "visible": true, "locked": false
    },
    {
      "id": "s-collar", "name": "Collar", "t": "cyl", "m": "metal",
      "s": [0.055, 0.055, 0.035], "p": [0, -0.09, 0], "r": [0, 0, 0],
      "n": 4, "visible": true, "locked": false
    }
  ]
}
```

`specs`는 export가 채운다. 봇이 생략하면 Forge에서 한 번 Export 하면 된다.

파일명: `{slot}-{kit}-{arch}.json`  
예: `helm-SSA-001-blunt.json`, `shoulderR-RRZ-100-cage.json`

---

## 6. 품질 게이트 (봇 셀프체크)

통과 못 하면 제출하지 않는다.

1. `kind`, `slot`, `quad`, `letter`, `kit`가 서로 맞다. `kit === quad+letter+"-"+serial`.
2. `letter`가 그 밴드 글자 집합에 있다 (SS/RS에 S 없음, SR/RR에 R 없음).
3. 솔리드 4–10개 (헬름 기준). 빈 스택·솔리드 1개 박스 = 실패.
4. prim 장갑이 있다. 전부 dark/metal이면 실패.
5. 바이저/센서가 있는 슬롯(helm, visor, eye, cockpit)은 glow 또는 visor 레이어가 있다.
6. A–L이면 `vfin` 슬롯 파일 자체를 만들지 않는다 (비움). M–Z만 크레스트.
7. 밴드 금기 도형을 안 썼다 (SS에 sph/capsule 없음 등).
8. 모든 `p`가 대략 `[-0.35, 0.35]` 안. 슬롯 로컬이다. 소켓 월드 좌표를 p에 넣지 말 것.
9. 고스트 박스를 크게 넘지 않는다. 헬름 폭 0.28 초과, 어깨가 머리 관통 = 실패.
10. 형태소가 이 키트의 아치와 맞다. blunt에 쉐브론 없음. arrow만 `^`.
11. 스케일-업 복제가 아니다. SSA blunt를 1.2배 한 게 SSB가 아니다.
12. 좌측 슬롯이면 우측 시드의 X 미러. 이름을 `Lobe L`처럼 방향에 맞게.
13. `n`이 밴드 공식과 같다 (곡면만).
14. 회전은 radian. 90도를 `90`으로 넣지 말 것 (`1.571`).

---

## 7. 이미 있는 시드 — 복제 금지

Forge 템플릿에 이미 깔린 아치. **같은 스택을 다시 제출하지 말고, 빈 칸을 채워라.**

헬름: blank, blunt, hex, wedge, bucket, shelf, diamond, split, trap, snout, hood, step, gem, anvil, arrow, beak, mask, cap, ram, cage

아직 없는 헬름 아치: **clam, plow, tower, ridge, facet, hawk** — 그리고 각 아치의 SR/RS/RR 번역.

바디 시드 (R측): visor slit/bar/dual, chest plow/wedge/slab, shoulder pauldron/cowl, shin greave, pack box, cockpit hatch, skirt flare

그 외 슬롯은 Blank뿐. 우선 공백이 큰 쪽: pec, collar, abdomen, pelvis, upper/forearm/hand, hip/thigh/knee/foot, binder, stabilizer, weapon, extra HP.

---

## 8. 태스크 분장

### 작업 단위

**권장 단위 = 킷 1개 × 슬롯 그룹 1개.**  
한 키트는 한 골격 언어라, 헬름만 만들고 가슴을 다른 언어로 깎으면 행거에서 깨진다.

| 패키지 | 범위 | 산출 파일 수 |
|---|---|---|
| `KIT-{id}-HEAD` | helm visor brow eyes nose mouth jaw ears chin (A–L은 vfin·antenna 생략) | 10–14 |
| `KIT-{id}-TORSO` | collar chestCore pecL/R cockpit abdomen | 6 |
| `KIT-{id}-WAIST` | pelvis skirtF/B/L/R | 5 |
| `KIT-{id}-ARM` | shoulder upper elbow forearm vambrace hand × R (L은 미러 파생) | 6 + 미러 6 |
| `KIT-{id}-LEG` | hip thigh knee shin ankle foot × R | 6 + 미러 6 |
| `KIT-{id}-BACK` | pack thrusterL/R binderL/R stabilizer | 6 |
| `KIT-{id}-WPN` | weaponR/L shield | 3 |
| `SLOT-{slot}-{band}` | 한 슬롯 × 밴드 25글자 (아치 번역 전용) | 25 |

처음 파일럿: **SSA-001 HEAD + TORSO + ARM-R + LEG-R + BACK**. 25파츠. 통과하면 같은 아치를 SR/RS/RR로 번역.

### 우선순위

1. 헬름 4밴드 × 25글자 = 100. 행거 얼굴이 킷을 읽는다.
2. chestCore, shoulderR, shinR, pack — 실루엣의 나머지 기둥.
3. 나머지 장갑 슬롯.
4. Extra / Weapons는 킷 언어가 안정된 뒤.

### 태스크 카드 (봇에 그대로 붙인다)

```
TASK: MOSA Forge part
DOC: 이 명세 전체 (MOSA-FORGE.md)
KIT: SSA-001
QUAD: SS
LETTER: A
ARCH: blunt
PACKAGE: HEAD
SLOTS: helm, visor, brow, eyeL, eyeR, nose, mouth, jaw, earL, earR, chin
NOT: vfin, antennaL, antennaR   (A–L, 크레스트 끔)
CONSTRAINTS:
  - SS 밴드: box/trap/wedge/hex/prism만. sph/capsule/torus 금지.
  - 밀도 1. 레이어 2–3. 장식 모티프 없음. sec는 시임만.
  - 쉐브론(^) 금지. blunt = 뭉툭 테이퍼.
  - 소켓 로컬 좌표. 고스트 head 박스 준수.
  - 좌우 쌍은 R 기준 조형 후 X 미러.
DELIVER:
  - 슬롯당 mosa-forge-part JSON 1개
  - 파일명 {slot}-{kit}-{arch}.json
  - 각 파일 품질 게이트 14항 통과
  - 한국어 3줄: 실루엣 / 쓴 형태소 / 의도적으로 뺀 것
DO NOT:
  - 전신 한 파일
  - GLB / 이미지 메쉬
  - 기존 blunt 시드를 숫자만 바꿔 복제 (helm은 시드가 이미 있음 — visor 이하를 채워라)
```

### 밴드 번역 카드 (아치가 있을 때)

```
TASK: translate arch
FROM: helm-SSA-001-blunt.json
TO QUAD: RR
KEEP: 실루엣·볼륨·바이저 위치
REPLACE: box→capsule/sph, trap→cowl, 각진 모서리 제거, n=17+
KIT: RRA-076
```

---

## 9. 봇 작업 절차

1. 카드에서 KIT / SLOT / ARCH / 금기를 읽는다.
2. 밴드 언어 표에서 허용 도형만 고른다.
3. 밀도 → 레이어 수·`n`을 계산한다.
4. 소켓을 원점으로 볼륨을 짠다. 먼저 prim 두개골/셸, 그다음 dark 프레임, 그다음 glow, 마지막 sec/trim.
5. JSON을 쓴다. `id`는 슬러그. `r` 0이면 `[0,0,0]`을 solids에 넣고 specs에서는 생략 가능.
6. 게이트 14항을 체크한다.
7. Forge에 Import → Ghost 켜고 궤도 → 이웃 침범 없으면 Export로 `specs`를 채운다.
8. 미러 슬롯은 `p[0]*=-1`, `r`의 Y·Z 부호를 뒤집어 별 파일로 저장한다.

한 봇이 한 카드. 한 번에 100킷을 만들지 않는다.

---

## 10. 운영자가 봇에게 보내는 한 줄

```
MOSA-FORGE.md를 브리프로 써서 KIT {id} PACKAGE {HEAD|TORSO|ARM|LEG|BACK} 파츠 JSON을 만들어.
아치는 문법 표, 금기는 밴드 언어, 산출은 mosa-forge-part. 복제·스케일업 금지.
```
