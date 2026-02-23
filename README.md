# oh-my-agents

AI 에이전트 스킬 패키지 매니저 MCP — [skills.sh](https://skills.sh) 레지스트리에서 스킬을 검색·설치·관리·추천합니다.

## 설치 및 설정

가장 쉬운 방법은 프로젝트 루트에서 아래 명령을 실행하는 것입니다:

```bash
npx oh-my-agents setup
```

이 명령은 현재 프로젝트의 `.mcp.json` 및 `.claudecode/config.json` 파일을 자동으로 탐지하여 `oh-my-agents` 서버 설정을 추가합니다.

설정이 완료되면 AI 에이전트(Antigravity, Claude Code 등)가 자동으로 도구를 인식합니다.

### 수동 설정

명령어 기반 설정이 작동하지 않는 경우, 아래 내용을 `.mcp.json`에 직접 추가하세요:

```json
{
  "mcpServers": {
    "oh-my-agents": {
      "command": "npx",
      "args": ["-y", "oh-my-agents"]
    }
  }
}
```

## 제공 툴 (8개)

| 툴                    | 설명                                          |
| --------------------- | --------------------------------------------- |
| `skills_search`       | skills.sh 레지스트리에서 스킬 검색            |
| `skills_info`         | 특정 스킬 상세 정보 조회                      |
| `skills_install`      | 스킬 설치 (전역/프로젝트, 멀티 에이전트 지원) |
| `skills_list`         | 설치된 스킬 목록 조회                         |
| `skills_update`       | 스킬 업데이트                                 |
| `skills_remove`       | 스킬 제거                                     |
| `skills_check`        | 업데이트 가능 여부 확인                       |
| `skills_recommend` ⭐ | 프로젝트 분석 + 의도 기반 스킬 추천           |

## 사용 예시

### 스킬 검색

```
skills_search query="brainstorming"
```

### 스킬 설치

```
skills_install skillId="obra/superpowers" scope="global"
```

### 스킬 추천

```
skills_recommend projectPath="./my-next-app" intent="TDD로 개발하고 싶어"
```

결과:

```
🎯 스킬 추천
분석 결과: 프레임워크: nextjs, react / 언어: typescript
작업 의도: TDD로 개발하고 싶어

1. test-driven-development (27,000 installs)
   추천 이유: `tdd` 관련
   설치: skills_install "obra/superpowers"

2. next-best-practices (8,000 installs)
   추천 이유: `nextjs` 관련
   ...
```

## 동작 방식

```
검색/정보 조회  →  skills.sh API 직접 호출
설치/수정/삭제  →  npx skills CLI 위임 (멀티 에이전트 배포 보존)
목록/상태 확인  →  ~/.agents/.skill-lock.json 읽기
스킬 추천      →  프로젝트 파일 분석 + API 검색 조합
```

## 개발

```bash
git clone https://github.com/tkyoun0421/oh-my-agents.git
cd oh-my-agents
npm install
npm run dev   # 개발 모드
npm run build # 빌드
```

## 라이선스

MIT
