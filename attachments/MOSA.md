# MOSA

**Modular Omni-Support Automata / Mimetic Operating System Architecture**

휴머노이드 메카닉 믹스빌드 행거. 스켈레톤 위에 파츠를 얹고, 스타일·색·포즈를 조합한다. 3D 모델러가 아니다.

라이브: [mosa.grok.me](https://mosa.grok.me/)

---

## 무엇인가

MOSA는 한 대의 기체를 **슬롯 단위로 갈아끼우는** 스튜디오다.

- 골격은 고정. 파츠가 소켓에 붙는다.
- 각 장갑 슬롯은 킷 스타일(SS/SR/RS/RR)을 고른다.
- Part 1 / Part 2 색, 바이저 라이트, 위치·회전·스케일을 슬롯·그룹별로 조정한다.
- 결과는 JSON으로 저장·불러오고, 뷰포트 PNG를 뽑을 수 있다.

메쉬를 스캔하거나 GLB를 뜯어 새 파츠를 깎지 않는다. 파츠는 엔진이 스타일 코드로 **생성**하고, 사용자는 **조합**한다.

---

## 이름

| 읽기 | 뜻 |
|---|---|
| Modular Omni-Support Automata | 모듈 교환형 지원 기체. 행거에서 만지는 쪽. |
| Mimetic Operating System Architecture | 모사(模倣)하는 OS. 골격 위에 양식을 입히는 쪽. |

로봇 명칭 **모사(Mosa)** 와 같은 줄기다. 지혜를 빌리는 모사, 형태를 모사하는 모사.

---

## 화면

상단: 로고, 애크로님, 기체 이름, 테마, 리셋, 랜덤 믹스, 저장, JSON보내기/가져오기, 스냅샷.

| 영역 | 역할 |
|---|---|
| 뷰포트 | 3D 행거. 궤도 카메라, 턴테이블, 폭파(explode), 그리드. 우클릭으로 포즈. |
| 좌측 | 그룹 탭 + 슬롯 목록. 그룹 단위 이동/회전/스케일, Hide / Default, explode. |
| 우측 | 선택 파츠 디테일. 스타일 코드, 무장·엑스트라 변형, Part 1/2 색, 바이저, Mirror / Edges. |

포즈: 차렷(attention), 조준(aim) 등. Mirror 켜면 좌우 슬롯이 같이 움직인다.

---

## 슬롯

그룹은 고정이다.

| 그룹 | 슬롯 |
|---|---|
| Head | Helm, Visor, Brow, Eye L/R, Nose, Mouth, Jaw, Ear L/R, Crest, Antenna L/R, Cheek L/R, Chin Guard |
| Torso | Collar, Chest Core, Pec L/R, Cockpit, Abdomen |
| Waist | Pelvis, Skirt F/B/L/R |
| Arm R / L | Shoulder, Upper, Elbow, Forearm, Vambrace, Hand |
| Leg R / L | Hip, Thigh, Knee, Shin, Ankle, Foot |
| Back | Pack Core, Thruster L/R, Binder L/R, Stabilizer |
| Weapons | Weapon R, Weapon L, Shield |
| Extra | 어깨·힙·후두부·흉부 등 하드포인트 (Module / Weapon / Accent / Shape) |

좌우 파츠는 미러 쌍이다. 무장은 none 포함 라이플·사벨·실드 등. Extra는 부스터, 바인더, 레이돔, 안테나 같은 덧붙임.

---

## 킷 스타일

장갑 슬롯의 변형 ID는 `{major}{form}{letter}-{serial}` 이다. 100키트.

| 밴드 | 시리얼 | 실루엣 | 모서리 |
|---|---|---|---|
| SS | 001–025 | 직선 | 각진 |
| SR | 026–050 | 직선 | 필렛 |
| RS | 051–075 | 곡선 | 뾰족 |
| RR | 076–100 | 곡선 | 구·캡슐 |

밀도는 스케일이 아니라 면 분할이다. 헬름이 기준이고 가슴·팔·다리·팩이 같은 계수를 따른다. 형태소 반복 금지, 스케일만 다른 복제는 다른 키가 아니다. 상세는 [KIT-GRAMMAR.md](KIT-GRAMMAR.md).

---

## 색

- **Part 1** — 메인 장갑.
- **Part 2** — 세컨드 패널·장식 레이어. A–L은 시임 위주, M–Z는 장식 모티프.
- **Visor / Light** — 센서·빔. Eye만 발광 재질.
- 슬롯 단위 또는 그룹 일괄 적용.

프레임은 색이 검정이라서가 아니라, 관절축·연결부에만 둔다.

---

## 저장

브라우저에 세션이 남는다. JSON 스키마는 슬롯별 variant, paint, paint2, 트랜스폼, 그룹 트랜스폼, 포즈, 테마를 담는다. PNG는 현재 뷰포트 캡처다.

---

## 아닌 것

- CAD / 하드서피스 모델러가 아니다.
- 샘플 GLB를 뜯거나 삼면도로 신규 메쉬를 복각하지 않는다.
- 펜툴 피킹으로 파츠를 따지 않는다.
- 고폴리 스캔 뷰어가 아니다.

파츠 생성의 한계는 여기 있다. 엔진은 스타일 문법으로 저폴리 솔리드를 조합한다. 레퍼런스 기체와 같은 볼륨·패널 라인을 재현하는 작업은 MOSA의 범위 밖이다. 그 방향이 필요하면 파츠는 밖에서 만들고, 행거는 조합만 맡는다.

---

## 현재 빌드

이 워크스페이스는 가벼운 행거 백업(`biokhake/MOSA-Editor`) 기준이다. 배포본이 본판이다. 샌드박스 미리보기는 개발 서버가 아니라 같은 빌드 산출물을 띄울 때 배포와 가까운 체감이 난다.
