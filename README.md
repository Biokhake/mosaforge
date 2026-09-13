# MOSA Forge

슬롯 단위 솔리드 조형 스튜디오. 행거([MOSA-Editor](https://github.com/Biokhake/MOSA-Editor) / [mosa.grok.me](https://mosa.grok.me/))는 조합만 하고, 파츠는 여기서 깎아 `mosa-forge-part` JSON으로 보낸다.

## 문서

- [MOSA-FORGE.md](MOSA-FORGE.md) — 에디터 사용법, SS/SR/RS/RR 킷 문법, 봇 태스크 카드
- [MOSA-HANGAR.md](MOSA-HANGAR.md) — 행거가 Forge JSON을 읽는 인제스트 브리프
- [attachments/MOSA.md](attachments/MOSA.md) — 행거 제품 개요

## 스택

TanStack Start · React 19 · three / R3F · zustand · Tailwind v4

로컬 세션·라이브러리는 `localStorage`. 계정 없음.

## 개발

```bash
npm install
npm run dev
```

## 산출

Export JSON `kind: "mosa-forge-part"`. `specs` 배열이 행거 Spec `{ t, m, s, p, r, n, d }` 이다. 값은 소켓 로컬 · **행거 `defaultScaleFor` 적용 전**. Export kit → MOSA (`mosa-hangar`)가 슬롯 `sx,sy,sz`를 같이 넣는다.
