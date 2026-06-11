# DestinyCode - 프로젝트 컨텍스트

## 프로젝트 개요
생년월일을 입력하면 사주를 RPG 게임 용어로 변환해서 캐릭터를 만들어주는 웹 서비스

## 확정된 사항

| 항목 | 결정 |
|------|------|
| 프로젝트명 | DestinyCode |
| 백엔드 | Node.js + Express |
| 프론트 | HTML / CSS / JS |
| 사주→RPG 변환 | GPT API |
| 이미지 생성 | DALL-E API |

## 핵심 기능 흐름
1. 사용자가 생년월일 입력
2. 백엔드에서 사주 계산 → GPT API로 RPG 캐릭터 생성 (JSON 반환)
3. 캐릭터 설명 → DALL-E로 이미지 생성
4. 프론트에서 결과 카드 렌더링

## 결과 카드에 들어갈 것들 (예시)
- 캐릭터명 (ex. "화염의 전사 갑목")
- 클래스 (ex. 워리어, 마법사, 궁수 등)
- 주요 스탯 (힘/지력/민첩 수치)
- 특성/스킬 설명 (사주 특성 → RPG 스킬로 변환)
- 캐릭터 이미지 (DALL-E 생성)

## 폴더 구조
```
DestinyCode/
├── client/
│   ├── index.html
│   ├── style.css
│   └── main.js
├── server/
│   ├── index.js
│   ├── routes/
│   │   └── character.js
│   └── services/
│       ├── gpt.js
│       └── dalle.js
├── .env
├── .gitignore
└── package.json
```

## 현재 상태
- 로컬에 `C:\DestinyCode` 폴더 생성됨
- 하위 폴더는 아직 미생성 (PowerShell mkdir 오류로 중단)
- 다음 할 일: 폴더 구조 생성 → package.json 세팅 → 기본 파일 작성

## 미결정 사항
- 디자인 시안 (팀장한테 요청 예정)
- GPT 프롬프트 설계 (사주 → RPG 변환 방식)