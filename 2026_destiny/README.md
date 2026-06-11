# DestinyCode

사주(四柱)를 RPG 게임 캐릭터로 변환해주는 서비스.  
생년월일시를 입력하면 AI가 오행을 분석해 전통 무속 세계관 기반의 캐릭터 클래스·스탯·이미지를 생성합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Spring Boot 3.2, Java 17, Spring Security, JPA |
| 인증 | JWT (Access 30분 / Refresh 7일) + Refresh Token Rotation |
| DB | MySQL 8 |
| AI 분석 | Anthropic Claude (사주 텍스트 분석) |
| AI 이미지 | OpenAI DALL-E 3 (캐릭터 이미지, 비동기 생성) |
| 보안 | Bucket4j Rate Limiting |
| 문서 | Swagger / OpenAPI 3 |
| 프론트엔드 | React 18, Vite, React Router, Axios |

---

## 프로젝트 구조

```
destiny_example/
├── backend/                   # Spring Boot
│   ├── src/main/java/com/destinycode/
│   │   ├── ai/                # AnthropicService, OpenAiService
│   │   ├── common/            # ApiResponse, BusinessException, GlobalExceptionHandler
│   │   ├── config/            # SecurityConfig, SwaggerConfig, AsyncConfig, RateLimitFilter
│   │   ├── jwt/               # JwtUtil, JwtFilter
│   │   ├── saju/              # SajuInfo, SajuService, SajuController, dto
│   │   └── user/              # User, UserService, UserController, dto
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── .env                   # 환경변수 (git 제외)
│   └── build.gradle.kts
└── frontend/                  # React + Vite
    └── src/
        ├── api/               # axios 인터셉터
        ├── context/           # AuthContext
        └── pages/             # Login, Signup, Home
```

---

## 시작하기

### 사전 요구사항

- Java 17+
- Node.js 18+
- MySQL 8

### 1. MySQL DB 생성

```sql
CREATE DATABASE destinycode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 환경변수 설정

`backend/.env` 파일을 열어 값을 채웁니다.

```env
DB_USERNAME=root
DB_PASSWORD=your_password

JWT_SECRET=your-secret-key-32-chars-minimum

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

### 3. 백엔드 실행

```bash
cd backend
./gradlew bootRun
# → http://localhost:8080
```

IntelliJ 사용 시 `backend/` 폴더를 Gradle 프로젝트로 열고 `DestinyCodeApplication`을 실행합니다.  
`spring-dotenv`가 `.env`를 자동으로 읽으므로 별도 환경변수 설정 불필요합니다.

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API 문서

서버 실행 후 브라우저에서 확인합니다.

```
http://localhost:8080/swagger-ui.html
```

JWT 인증이 필요한 API는 로그인 후 발급된 `accessToken`을 Swagger 우측 상단 `Authorize`에 입력합니다.

---

## 주요 API

### 인증 (`/api/auth`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/refresh` | Access Token 갱신 (Refresh Token Rotation) |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 내 정보 조회 |
| DELETE | `/api/auth/me` | 회원 탈퇴 |

### 사주 (`/api/saju`) — 인증 필요

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/saju` | 사주 저장 + Claude 분석 + 이미지 생성 시작 |
| GET | `/api/saju/me` | 내 사주 및 캐릭터 조회 |
| GET | `/api/saju/me/image-status` | 이미지 생성 완료 여부 폴링 |

### 응답 형식

모든 API는 동일한 래퍼 구조로 응답합니다.

```json
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": "오류 메시지" }
```

---

## 사주 → 캐릭터 변환 로직

| 출생년도 끝자리 | 오행 | 남성 클래스 | 여성 클래스 |
|----------------|------|------------|------------|
| 0, 1 | 금 (Metal) | 명부의 저승사자 | 성스러운 삼신선녀 |
| 2, 3 | 수 (Water) | 대나무숲 청룡도사 | 심연의 용신무녀 |
| 4, 5 | 목 (Wood) | 청운의 옥피리 도사 | 버드나무 백호선녀 |
| 6, 7 | 화 (Fire) | 벼락 불꽃의 천우신장 | 붉은 봉황의 지옥 화무 |
| 8, 9 | 토 (Earth) | 바위 성벽의 태수장군 | 지리산 산신녀 |

Claude API가 오행·클래스 정보를 받아 풍부한 캐릭터 설명 텍스트를 생성합니다.  
DALL-E 3은 16-bit 픽셀아트 스타일 캐릭터 이미지를 비동기로 생성 후 DB에 저장합니다.

---

## 보안

- **Refresh Token Rotation** — 토큰 재사용 공격 감지 시 전체 세션 즉시 무효화
- **Rate Limiting** — 로그인·회원가입 IP당 분당 10회, 사주 생성 사용자당 분당 5회 제한
- **BCrypt** — 비밀번호 단방향 암호화
- **Stateless** — 세션 없이 JWT만으로 인증
