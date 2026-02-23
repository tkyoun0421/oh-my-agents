# oh-my-agents 코드 감사 (2026-02-23)

## 발견 및 수정 완료 목록

### 🔴 Critical (동작 오류) — 모두 수정됨

#### 1. `recommend.ts` — 잘못된 설치 커맨드 안내

- **문제**: `npx skills_install "${s.id}"` 사용
  - `skills_install`은 MCP 툴명이지 CLI 명령어가 아님
  - `s.id`(`owner/repo/skillName`)는 유효한 CLI source가 아님
- **수정**: `npx skills add "${s.source}" --skill "${s.skillId}" -y`
- **상태**: ✅ 수정 완료

#### 2. `update.ts` — global scope 시 `--global` 플래그 누락

- **문제**: scope가 `global`이어도 항상 project 범위만 업데이트됨
- **수정**: scope === "global"일 때 `--global` 플래그 동적 추가
- **상태**: ✅ 수정 완료

#### 3. `check.ts` — global scope 시 `--global` 플래그 누락

- **문제**: `cwd`만 다르게 전달되고 CLI 플래그 없음
- **수정**: `s === "global"` 조건으로 `check --global` 구성
- **상태**: ✅ 수정 완료

---

### 🟡 Warning (동작은 되지만 잘못됨) — 모두 수정됨

#### 4. `list.ts` — lock 파일 직접 읽기 (비신뢰성)

- **문제**: `~/.agents/.skill-lock.json` 파싱 방식은 Skills CLI 버전 변경에 취약
- **수정**: `npx skills ls [--global]` CLI 직접 호출 방식으로 완전 교체
- **상태**: ✅ 수정 완료

#### 5. `recommend.ts` — candidates 타입에 `skillId` 필드 누락

- **문제**: `s.skillId` 접근 시 TypeScript 타입 오류
- **수정**: `candidates` 배열 타입에 `skillId: string` 추가
- **상태**: ✅ 수정 완료

---

### 🔵 Minor (개선 사항) — 모두 수정됨

#### 6. `index.ts` — 버전 하드코딩 불일치

- **문제**: MCP 서버 `version: "1.0.7"` ↔ package.json `1.0.14` 불일치
- **수정**: `createRequire`로 런타임에 `../package.json`에서 동적으로 읽음
  - `dist/index.js` 기준으로 `../package.json` = 프로젝트 루트 (올바른 경로)
- **상태**: ✅ 수정 완료

#### 7. `setup.ts` — Claude Code 설정 경로 오류

- **문제**: `~/.claude.json`은 Claude Code MCP 설정 파일이 아님
- **수정**: `~/.claude/mcp_config.json`으로 수정
- **상태**: ✅ 수정 완료

---

## 수정 전후 변경 요약

| 파일                 | 변경 내용                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `tools/recommend.ts` | 설치 커맨드 `s.source + --skill s.skillId -y` / 타입 `skillId` 추가 |
| `tools/update.ts`    | global 시 `--global` 플래그 추가                                    |
| `tools/check.ts`     | global 시 `check --global` 구성                                     |
| `tools/list.ts`      | lock 파일 파싱 → `npx skills ls` CLI 호출로 전면 교체               |
| `index.ts`           | 버전 동적 로드 (`../package.json`)                                  |
| `lib/setup.ts`       | Claude Code 경로 `~/.claude.json` → `~/.claude/mcp_config.json`     |

## 빌드 결과

```
> oh-my-agents@1.0.14 build
> tsc
(오류 없음)
```

서버 시작 확인: `oh-my-agents MCP server running (8 tools registered)` ✅
