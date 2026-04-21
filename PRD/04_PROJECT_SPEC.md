# 프로젝트 스펙 — AI 행동 규칙

이 문서는 Claude Code(또는 다른 AI 코딩 도구)가 이 저장소에서 작업할 때 지켜야 할 규칙.

## 1. 기술 스택 (고정)

| 계층 | 선택 | 이유 |
|------|------|------|
| 런타임 | Node.js (Express 5) | 기존 유지, 이미 작동 중 |
| 렌더링 | Playwright (chromium) | HTML→PNG 캡처, 교체 비용 큼 |
| AI | Anthropic Claude Sonnet 4 | 기존 유지 |
| 저장 | **SQLite (better-sqlite3)** | v1 신규 도입. 동기 API라 Express와 잘 맞음 |
| 프론트 | Vanilla HTML + 순수 JS | 기존 index.html 유지. 프레임워크 도입 금지 |
| 편집기 | **contenteditable + 커스텀 인스펙터** | 생성 출력이 이미 HTML. Konva 캔버스로 옮기면 재작성 부담 큼 |
| 배포 | Railway (Dockerfile) | 기존 유지 |
| 인증(Phase 3) | Basic Auth 미들웨어 | 팀용이라 충분 |

### 신규 의존성 추가 허용 목록
- `better-sqlite3` (Phase 1)
- `multer` (파일 업로드, Phase 1)
- `express-basic-auth` (Phase 3)

그 외 라이브러리 추가는 PR 설명에 근거 명시.

## 2. 디렉터리 구조 (확장안)

```
design auto/
├── server.js                 # 라우트 얇게 유지, 로직은 아래로
├── index.html                # 단일 페이지 UI
├── lib/
│   ├── db.js                 # SQLite 연결·마이그레이션
│   ├── claude.js             # Anthropic 호출 래퍼 (재시도·로그 포함)
│   ├── capture.js            # Playwright 캡처 로직
│   └── prompts/              # type별 프롬프트 빌더
├── routes/
│   ├── assets.js             # /api/assets CRUD
│   ├── versions.js           # /api/assets/:id/versions
│   ├── presets.js            # /api/presets
│   └── usage.js              # /api/usage (Phase 3)
├── public/
│   └── editor/               # 편집기 JS/CSS 분리
├── data/
│   └── design-auto.db        # SQLite 파일 (Railway 볼륨)
├── uploads/
│   ├── logos/
│   └── references/
└── output/                   # 렌더된 PNG
```

`server.js`가 400줄 넘어가면 **라우트 분리 먼저**. 로직을 계속 때려넣지 말 것.

## 3. 절대 하지 마 (Hard Rules)

1. **API 키를 프론트에 노출하지 마** — `ANTHROPIC_API_KEY`는 서버 환경변수 전용. `index.html`이 직접 Anthropic 부르는 코드 추가 금지.
2. **DB 스키마 변경 시 마이그레이션 파일 만들어** — `lib/db.js`의 `migrations/` 배열에 추가. 현재 DB를 덮어쓰지 마.
3. **생성 결과를 파일시스템에만 저장하지 마** — Phase 1 이후로는 모든 결과가 DB에 **메타 + 파일 경로**로 들어가야 한다.
4. **프론트 프레임워크 도입 금지** — React/Vue/Svelte 추가 금지. 필요하면 바닐라 JS + Web Components로 해결.
5. **Playwright 브라우저를 매 요청마다 띄우지 마** — 전역 인스턴스 1개를 공유 (현재 `server.js` 구조 확인 후 개선).
6. **비용 폭탄 가드**: 단일 요청에서 Claude 호출 >3회가 필요하면 설계 다시. 레퍼런스 비전 호출은 반드시 캐시(asset_id 기반).
7. **파일 업로드 용량 제한** — multer `limits: { fileSize: 10MB }` 필수.
8. **에러 메시지에 API 키/파일 경로 노출 금지** — 클라이언트에 `error.message` 그대로 내보내는 현재 코드 개선 필요.

## 4. 작업 루틴

### 새 기능 추가 시
1. `PRD/03_PHASES.md`의 체크박스 항목인지 확인. 아니면 사용자에게 확인.
2. DB 스키마 변경 필요 여부 판단 → 필요하면 마이그레이션 먼저.
3. 라우트 → 로직(lib/) → UI 순서로 구현.
4. 수동 테스트 시나리오 1개 실행 (PRD §5 DoD 참조).

### 버그 수정 시
1. 재현 조건 확인 → `UsageLog.error` 또는 `console.error` 스택 확인.
2. 근본 원인 고치기. `try/catch`로 묻지 마.

### 리팩토링 시
- `server.js` 400줄 초과 → 라우트 분리
- 중복 프롬프트 빌더 → `lib/prompts/` 통합
- 매직 넘버(dimensions 등) → `lib/constants.js`

## 5. 테스트 전략 (v1)

자동 테스트는 **out of scope**. 대신:
- `PRD/03_PHASES.md`의 각 Phase "완료 기준" 시나리오를 **수동 체크리스트**로 실행
- `/api/health` 엔드포인트 유지 (Railway 헬스체크)
- 배포 후 첫 요청이 성공하는지 로그 확인

자동 테스트는 Phase 3 이후 팀 규모 커지면 재고.

## 6. 보안 체크리스트

- [ ] Basic Auth 미들웨어 (Phase 3, 배포 URL 전체 보호)
- [ ] 업로드 파일 확장자 화이트리스트 (jpg/png/webp만)
- [ ] HTML 생성 결과를 그대로 `eval`/`innerHTML`하지 않기 — 편집기에서 sandbox iframe 권장
- [ ] SQL 인젝션 방지 — `better-sqlite3` prepared statement 강제
- [ ] CORS 재검토 — 현재 `cors()` 전체 허용. 배포 시 origin 화이트리스트로.

## 7. 성능 기준

| 지표 | 목표 | 측정 |
|------|------|------|
| 생성 요청 | P50 30초, P95 60초 | UsageLog.duration_ms |
| 편집 저장 | 1초 이내 | 수동 |
| 페이지 로드 | 2초 이내 | DevTools Network |
| DB 크기 | 6개월 내 500MB 이하 | 파일 크기 |

초과 시 원인 분석 → 이미지 경량화/썸네일 분리/불필요 버전 정리.

## 8. 참조

- `PRD/01_PRD.md` — 왜 만드는가
- `PRD/02_DATA_MODEL.md` — 데이터 구조
- `PRD/03_PHASES.md` — 어떤 순서로
- 기존 `skills/` — 카드뉴스/상세/패키지 프롬프트 자산 (재활용 대상)
