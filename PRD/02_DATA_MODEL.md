# 데이터 모델

## 개념 구조

```
User (팀원)
  └── Project (프로젝트 / 캠페인 단위)
        ├── BrandPreset (브랜드 프리셋 — 프로젝트에 여러 개 가능)
        └── Asset (결과물 — 카드뉴스/상세/패키지/썸네일 1건)
              ├── AssetVersion (편집 스냅샷, 1:N)
              └── Reference (입력으로 썼던 레퍼런스 이미지/URL)

UsageLog (요청·토큰·비용 로그, 독립 엔티티)
```

## 테이블

### User
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | UUID |
| name | TEXT | 표시명 |
| created_at | DATETIME | 가입일 |

> v1은 팀 단일 비밀번호 인증이라 User는 "작성자 표시" 용도로만 가볍게 사용.

### Project
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | UUID |
| name | TEXT | 프로젝트명 (예: "11월 블랙프라이데이") |
| description | TEXT | 메모 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### BrandPreset
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | UUID |
| project_id | TEXT(FK) | 소속 프로젝트 (NULL이면 글로벌) |
| name | TEXT | 프리셋명 |
| logo_path | TEXT | 업로드된 로고 파일 경로 |
| colors | JSON | ["#FF0000", "#000000", ...] 1~5개 |
| font_heading | TEXT | Google Fonts name 또는 system |
| font_body | TEXT | |
| tone_memo | TEXT | 톤앤보이스 자유 메모 |
| created_at | DATETIME | |

### Asset
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | UUID |
| project_id | TEXT(FK) | |
| preset_id | TEXT(FK, NULL) | 사용한 브랜드 프리셋 |
| type | TEXT | card-news / detail-page / package / thumbnail |
| title | TEXT | 사용자가 붙인 이름 |
| input_content | TEXT | 최초 입력 텍스트 |
| input_options | JSON | 프리셋/사이즈/스타일 등 |
| current_version_id | TEXT(FK) | 현재 표시 중인 버전 |
| favorite | BOOLEAN | 즐겨찾기 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### AssetVersion
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | UUID |
| asset_id | TEXT(FK) | |
| html | TEXT | 편집된 HTML (편집기 원본) |
| image_paths | JSON | 렌더된 PNG 파일 경로 배열 |
| prompt | TEXT | 이 버전 생성에 쓴 프롬프트 (디버깅용) |
| note | TEXT | "제목만 수정" 같은 변경 메모 |
| tokens_input | INTEGER | 사용한 Claude 입력 토큰 |
| tokens_output | INTEGER | |
| created_at | DATETIME | |

### Reference
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | |
| asset_id | TEXT(FK) | |
| kind | TEXT | image / url |
| path_or_url | TEXT | |
| extracted_style | JSON | Claude 비전으로 뽑은 스타일 요약 |
| created_at | DATETIME | |

### UsageLog
| 필드 | 타입 | 설명 |
|------|------|------|
| id | TEXT(PK) | |
| user_id | TEXT(FK) | |
| asset_id | TEXT(FK, NULL) | |
| endpoint | TEXT | /api/generate, /api/regenerate 등 |
| tokens_input | INTEGER | |
| tokens_output | INTEGER | |
| cost_usd | REAL | 토큰→달러 환산 |
| duration_ms | INTEGER | |
| success | BOOLEAN | |
| error | TEXT | 실패 시 메시지 |
| created_at | DATETIME | |

## 저장 선택

- **v1**: SQLite (`better-sqlite3`) — 단일 파일 DB, 백업은 파일 복사만으로 해결. 팀 규모(<10명)에 충분.
- **업로드 파일**: `uploads/logos/`, `uploads/references/` 디렉터리
- **렌더 이미지**: 현재 `output/{type}/` 구조 유지, 파일명에 asset_id + version_id 포함
- **Postgres 이전 시점**: 동시 사용자 >20 또는 배포 환경 분리 시 고려 (v1 out of scope)

## 인덱스

- `Asset(project_id, type, updated_at DESC)` — 프로젝트별 타입별 최신 목록
- `AssetVersion(asset_id, created_at DESC)` — 버전 히스토리
- `UsageLog(created_at DESC)` — 최근 로그
- `UsageLog(user_id, created_at)` — 사용자별 월 사용량 집계
