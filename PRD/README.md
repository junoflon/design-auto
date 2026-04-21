# Design Auto — 실무 투입 수준 업그레이드 PRD

실무자(마케터·디자이너·운영자)가 재생성 루프 없이 "생성 → 다듬기 → 업로드"까지 갈 수 있는 수준으로 올리는 계획.

## 문서 읽는 순서

1. **[01_PRD.md](./01_PRD.md)** — 왜, 누가, 무엇을 (먼저 읽기)
2. **[02_DATA_MODEL.md](./02_DATA_MODEL.md)** — SQLite 스키마
3. **[03_PHASES.md](./03_PHASES.md)** — Phase 1/2/3 체크리스트
4. **[04_PROJECT_SPEC.md](./04_PROJECT_SPEC.md)** — 코딩 규칙 (AI에게 넘길 규칙)

## 핵심 결정

- **내부/팀 전용** → 결제·공개 판매 out of scope
- **우선순위**: 편집·품질 → 브랜드·워크플로우 → 운영·안정성
- **스택 고정**: Node/Express + SQLite + Vanilla HTML (contenteditable 편집기)
- **프레임워크 도입 금지** (바닐라 유지)

## 다음 단계

### A. Phase 1 바로 시작
Claude Code에 다음 프롬프트를 던져라:

> PRD/ 폴더의 4종 문서를 전부 읽고, Phase 1의 첫 항목인 "SQLite 도입 (better-sqlite3), Project/Asset/AssetVersion 3개 테이블"부터 구현해줘. `lib/db.js`에 마이그레이션 구조로 짜고, 기존 `server.js`를 깨지 않는 범위에서 추가만 해. 완료 후 `/api/health`에 DB 연결 상태도 같이 노출해줘.

### B. 우선순위 재조정
03_PHASES.md의 체크박스를 직접 수정해도 됨. AI에게 "Phase 1에서 X는 빼고 Y부터 해줘"로 지시 가능.

### C. 완성도
- 현재: **7/10** (리서치 기반 근거 포함, 스택 결정 근거 명시)
- 개선 포인트:
  1. 실무자 페르소나 인터뷰(실제 마케터 2~3명) 후 §5 DoD 시나리오 정교화
  2. Claude 프롬프트 품질 편차 정량 측정 기준(샘플 20건 블라인드 평가 등) 추가
  3. Railway 볼륨 마운트 실제 테스트 후 DB 파일 위치 확정
