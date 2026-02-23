# Skill Package Manager MCP — 설계 문서

**날짜**: 2026-02-23  
**프로젝트**: oh-my-agents  
**상태**: 승인됨

---

## 개요

AI 에이전트(Antigravity, Claude Code, Cursor, Codex 등)가 사용하는 skills를 `skills.sh` 레지스트리에서 검색·설치·관리할 수 있는 MCP(Model Context Protocol) 서버.

npm과 유사한 패키지 매니저 경험을 AI 에이전트 스킬 생태계에 제공한다.

---

## 핵심 목표

1. `skills.sh` 레지스트리 기반 스킬 검색 및 상세 정보 조회
2. 전역(`~/.agents/skills/`) 및 프로젝트별 스킬 설치/관리
3. 멀티 에이전트 배포 로직은 `npx skills` CLI에 위임하여 개인 설정 보존
4. 프로젝트 분석 + 작업 의도 기반 스킬 추천

---

## 아키텍처

### 디렉토리 구조

```
oh-my-agents/
├── src/
│   ├── index.ts                   # MCP 서버 진입점
│   ├── tools/
│   │   ├── search.ts              # skills.sh API 검색
│   │   ├── info.ts                # 스킬 상세 정보
│   │   ├── install.ts             # npx skills add 위임
│   │   ├── list.ts                # 설치된 스킬 목록
│   │   ├── update.ts              # npx skills update 위임
│   │   ├── remove.ts              # npx skills remove 위임
│   │   ├── check.ts               # 업데이트 가능 여부 확인
│   │   └── recommend.ts           # 추천 엔진
│   └── lib/
│       ├── skillsApi.ts           # skills.sh REST API 클라이언트
│       ├── lockFile.ts            # .skill-lock.json 읽기
│       └── projectAnalyzer.ts    # 프로젝트 파일 분석
├── package.json
└── tsconfig.json
```

### 이중 전략 (Hybrid Approach)

| 작업                   | 방식                    | 이유                               |
| ---------------------- | ----------------------- | ---------------------------------- |
| 검색 / 정보 조회       | skills.sh API 직접 호출 | 구조화된 응답, 빠른 속도           |
| 설치 / 업데이트 / 삭제 | `npx skills` CLI 위임   | 멀티 에이전트 배포, 개인 설정 보존 |
| 목록 / 확인            | lock 파일 읽기          | 오프라인 동작 가능                 |
| 추천                   | API + 파일 분석 조합    | 컨텍스트 인식 추천                 |

### 데이터 흐름

```
AI 에이전트
  │
  ▼
MCP 툴 호출
  │
  ├─ search/info ──────→ skills.sh API (https://skills.sh/api/search)
  │
  ├─ install/update/remove ──→ npx skills CLI (멀티에이전트 배포)
  │
  ├─ list/check ──→ lock 파일 읽기 (~/.agents/.skill-lock.json)
  │
  └─ recommend ──→ 프로젝트 파일 분석 + skills.sh API 조합
```

---

## MCP 툴 명세

### 1. `skills_search`

- **방식**: skills.sh API
- **파라미터**: `{ query: string, limit?: number }`
- **반환**: 스킬 목록 (id, name, installs, source)
- **API**: `GET https://skills.sh/api/search?q={query}`

### 2. `skills_info`

- **방식**: skills.sh API
- **파라미터**: `{ skillId: string }` (예: `"obra/superpowers/brainstorming"`)
- **반환**: 스킬 상세 정보 (설명, 설치 수, 소스, README)

### 3. `skills_install`

- **방식**: `npx skills add <skillId>` CLI 위임
- **파라미터**: `{ skillId: string, scope: "global" | "project", projectPath?: string }`
- **동작**: scope에 따라 cwd 설정 후 CLI 실행
- **반환**: 설치 결과, 설치된 에이전트 목록

### 4. `skills_list`

- **방식**: lock 파일 읽기
- **파라미터**: `{ scope: "global" | "project" | "all", projectPath?: string }`
- **lock 파일 경로**:
  - 전역: `~/.agents/.skill-lock.json`
  - 프로젝트: `{projectPath}/skills-lock.json`
- **반환**: 설치된 스킬 목록 (source, installedAt, updatedAt)

### 5. `skills_update`

- **방식**: `npx skills update` CLI 위임
- **파라미터**: `{ skillId?: string, scope: "global" | "project", projectPath?: string }`
- **반환**: 업데이트 결과

### 6. `skills_remove`

- **방식**: `npx skills remove <skillId>` CLI 위임
- **파라미터**: `{ skillId: string, scope: "global" | "project", projectPath?: string }`
- **반환**: 삭제 결과

### 7. `skills_check`

- **방식**: lock 파일 + API 비교
- **파라미터**: `{ scope: "global" | "project" | "all", projectPath?: string }`
- **동작**: 설치된 스킬의 현재 해시 vs skills.sh 최신 해시 비교
- **반환**: 업데이트 가능한 스킬 목록

### 8. `skills_recommend` ⭐

- **방식**: 프로젝트 분석 + API 검색
- **파라미터**: `{ projectPath: string, intent?: string }`
- **동작**:
  1. `projectPath` 분석: package.json, 파일 확장자로 스택 감지
  2. `intent` 키워드 추출
  3. 감지된 스택 + 키워드로 skills.sh API 복수 검색
  4. 이미 설치된 스킬 제외
  5. 인기순 정렬 후 상위 5개 + 추천 이유 반환
- **반환**: 추천 스킬 목록 + 이유

---

## 프로젝트 분석 로직 (`projectAnalyzer.ts`)

감지 대상:

- **프레임워크**: `package.json`의 `dependencies` 파싱 (next → nextjs, react, vue, svelte 등)
- **언어**: 파일 확장자 스캔 (`.ts`, `.py`, `.go`, `.rs`, `.java` 등)
- **테스트 툴**: jest, vitest, pytest 등
- **스타일**: tailwind, sass 등

감지 결과 → skills.sh 검색 키워드 매핑:

```
next.js → ["next-best-practices", "nextjs"]
react   → ["react", "vercel-react-best-practices"]
python  → ["python-testing-patterns", "fastapi"]
tdd     → ["test-driven-development"]
```

---

## 에러 처리

| 상황                       | 처리                                 |
| -------------------------- | ------------------------------------ |
| `npx` 미설치               | "Node.js를 설치해주세요" 안내 메시지 |
| skills.sh API 실패         | timeout 3초, retry 1회 후 에러 반환  |
| lock 파일 없음             | 빈 목록으로 처리 (에러 아님)         |
| 이미 설치된 스킬 설치 시도 | 경고 + 현재 버전 정보 반환           |
| 프로젝트 경로 없음         | 전역 설치로 fallback                 |
| CLI 실행 실패              | stderr 내용 포함하여 에러 반환       |

---

## 기존 호환성

- lock 파일 형식: 기존 `~/.agents/.skill-lock.json` (version 3) / `skills-lock.json` (version 1) 형식 그대로 읽기
- 쓰기는 `npx skills` CLI가 담당하므로 포맷 충돌 없음

---

## 성공 기준

- [ ] `skills_search "brainstorming"` → skills.sh 검색 결과 반환
- [ ] `skills_install "obra/superpowers" global` → 전역 설치 완료
- [ ] `skills_list global` → 현재 설치된 스킬 목록 반환
- [ ] `skills_recommend { projectPath: "./my-next-app", intent: "TDD로 개발" }` → 관련 스킬 추천
- [ ] `skills_check` → 업데이트 가능한 스킬 감지
