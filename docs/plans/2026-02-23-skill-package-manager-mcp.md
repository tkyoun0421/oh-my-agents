# Skill Package Manager MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** skills.sh 레지스트리를 활용해 AI 에이전트 스킬을 검색·설치·관리·추천하는 MCP 서버 구현

**Architecture:** skills.sh API로 검색/조회, `npx skills` CLI로 설치/수정/삭제(멀티 에이전트 배포 보존), lock 파일 읽기로 목록/상태 확인하는 하이브리드 방식. TypeScript + @modelcontextprotocol/sdk 사용.

**Tech Stack:** TypeScript, Node.js, @modelcontextprotocol/sdk, tsx (dev runner), skills.sh REST API (`https://skills.sh/api`), 기존 `.skill-lock.json` / `skills-lock.json` 호환

---

## Task 1: 프로젝트 초기 설정

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`

**Step 1: 기존 파일 확인**

```bash
ls -la
cat package.json 2>/dev/null || echo "없음"
```

Expected: 현재 프로젝트 구조 파악

**Step 2: package.json 생성**

`package.json`을 아래 내용으로 작성:

```json
{
  "name": "oh-my-agents",
  "version": "1.0.0",
  "description": "AI agent skills package manager MCP",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "oh-my-agents": "dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Step 3: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: 의존성 설치**

```bash
npm install
```

Expected: node_modules 생성, `@modelcontextprotocol/sdk` 설치됨

**Step 5: src/index.ts 뼈대 생성**

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "oh-my-agents",
  version: "1.0.0",
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("oh-my-agents MCP server running");
}

main().catch(console.error);
```

**Step 6: 빌드 확인**

```bash
npx tsx src/index.ts
```

Expected: `oh-my-agents MCP server running` 출력 후 대기

**Step 7: Commit**

```bash
git add package.json tsconfig.json src/index.ts
git commit -m "feat: initialize MCP server project structure"
```

---

## Task 2: skills.sh API 클라이언트 (`src/lib/skillsApi.ts`)

**Files:**

- Create: `src/lib/skillsApi.ts`

**Step 1: 타입 정의 및 API 클라이언트 작성**

`src/lib/skillsApi.ts` 생성:

```typescript
const BASE_URL = "https://skills.sh/api";

export interface SkillResult {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

export interface SearchResponse {
  query: string;
  skills: SkillResult[];
  count: number;
  duration_ms: number;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 3000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function searchSkills(
  query: string,
  limit = 10,
): Promise<SkillResult[]> {
  try {
    const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: SearchResponse = await res.json();
    return data.skills.slice(0, limit);
  } catch (err) {
    // retry once
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SearchResponse = await res.json();
      return data.skills.slice(0, limit);
    } catch {
      throw new Error(`skills.sh API 호출 실패: ${String(err)}`);
    }
  }
}

export async function getSkillInfo(
  skillId: string,
): Promise<SkillResult | null> {
  // skillId format: "owner/repo/skillName" or "owner/repo"
  const parts = skillId.split("/");
  const query = parts[parts.length - 1]; // 마지막 부분으로 검색
  const results = await searchSkills(query, 20);
  return (
    results.find(
      (s) => s.id === skillId || s.source === `${parts[0]}/${parts[1]}`,
    ) ?? null
  );
}
```

**Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 3: Commit**

```bash
git add src/lib/skillsApi.ts
git commit -m "feat: add skills.sh API client"
```

---

## Task 3: Lock 파일 읽기 (`src/lib/lockFile.ts`)

**Files:**

- Create: `src/lib/lockFile.ts`

**Step 1: lock 파일 파서 작성**

`src/lib/lockFile.ts` 생성:

```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export interface InstalledSkill {
  name: string;
  source: string;
  sourceType: string;
  sourceUrl?: string;
  skillPath?: string;
  installedAt?: string;
  updatedAt?: string;
  computedHash?: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, InstalledSkill>;
}

export async function readGlobalLock(): Promise<SkillLockFile> {
  const lockPath = join(homedir(), ".agents", ".skill-lock.json");
  try {
    const content = await readFile(lockPath, "utf-8");
    return JSON.parse(content) as SkillLockFile;
  } catch {
    return { version: 3, skills: {} };
  }
}

export async function readProjectLock(
  projectPath: string,
): Promise<SkillLockFile> {
  const lockPath = join(projectPath, "skills-lock.json");
  try {
    const content = await readFile(lockPath, "utf-8");
    return JSON.parse(content) as SkillLockFile;
  } catch {
    return { version: 1, skills: {} };
  }
}

export async function listInstalledSkills(
  scope: "global" | "project" | "all",
  projectPath?: string,
): Promise<{ scope: string; skills: InstalledSkill[] }[]> {
  const results: { scope: string; skills: InstalledSkill[] }[] = [];

  if (scope === "global" || scope === "all") {
    const lock = await readGlobalLock();
    results.push({
      scope: "global",
      skills: Object.entries(lock.skills).map(([name, info]) => ({
        name,
        ...info,
      })),
    });
  }

  if ((scope === "project" || scope === "all") && projectPath) {
    const lock = await readProjectLock(projectPath);
    results.push({
      scope: "project",
      skills: Object.entries(lock.skills).map(([name, info]) => ({
        name,
        ...info,
      })),
    });
  }

  return results;
}
```

**Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 3: Commit**

```bash
git add src/lib/lockFile.ts
git commit -m "feat: add lock file reader"
```

---

## Task 4: 프로젝트 분석기 (`src/lib/projectAnalyzer.ts`)

**Files:**

- Create: `src/lib/projectAnalyzer.ts`

**Step 1: 프로젝트 분석기 작성**

`src/lib/projectAnalyzer.ts` 생성:

```typescript
import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";

export interface ProjectContext {
  frameworks: string[];
  languages: string[];
  testTools: string[];
  searchKeywords: string[];
}

const FRAMEWORK_MAP: Record<string, string[]> = {
  next: ["nextjs", "react"],
  react: ["react"],
  vue: ["vue"],
  nuxt: ["nuxt", "vue"],
  svelte: ["svelte"],
  angular: ["angular"],
  fastapi: ["fastapi", "python"],
  django: ["django", "python"],
  express: ["nodejs", "express"],
  nestjs: ["nestjs", "nodejs"],
};

const TEST_TOOL_MAP: Record<string, string> = {
  jest: "jest",
  vitest: "vitest",
  pytest: "pytest",
  mocha: "mocha",
};

const EXTENSION_LANG_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "golang",
  ".rs": "rust",
  ".java": "java",
  ".rb": "ruby",
};

export async function analyzeProject(
  projectPath: string,
): Promise<ProjectContext> {
  const frameworks: string[] = [];
  const languages: string[] = [];
  const testTools: string[] = [];

  // package.json 분석
  try {
    const pkgPath = join(projectPath, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [dep, keywords] of Object.entries(FRAMEWORK_MAP)) {
      if (deps[dep] || deps[`@${dep}/core`]) {
        frameworks.push(...keywords);
      }
    }

    for (const [tool, name] of Object.entries(TEST_TOOL_MAP)) {
      if (deps[tool]) testTools.push(name);
    }
  } catch {
    // package.json 없음, 무시
  }

  // 파일 확장자 스캔 (최상위 + src/)
  try {
    const scanDirs = [projectPath, join(projectPath, "src")];
    const extCount: Record<string, number> = {};

    for (const dir of scanDirs) {
      try {
        const files = await readdir(dir);
        for (const file of files) {
          const ext = extname(file);
          if (ext) extCount[ext] = (extCount[ext] ?? 0) + 1;
        }
      } catch {
        // 디렉토리 없음, 무시
      }
    }

    const topExts = Object.entries(extCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ext]) => ext);

    for (const ext of topExts) {
      const lang = EXTENSION_LANG_MAP[ext];
      if (lang && !languages.includes(lang)) languages.push(lang);
    }
  } catch {
    // 무시
  }

  // 검색 키워드 조합
  const searchKeywords = [
    ...new Set([...frameworks, ...languages, ...testTools]),
  ];

  return { frameworks, languages, testTools, searchKeywords };
}
```

**Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 3: Commit**

```bash
git add src/lib/projectAnalyzer.ts
git commit -m "feat: add project analyzer for skill recommendation"
```

---

## Task 5: 핵심 MCP 툴 — search, info, list (`src/tools/`)

**Files:**

- Create: `src/tools/search.ts`
- Create: `src/tools/info.ts`
- Create: `src/tools/list.ts`

**Step 1: `src/tools/search.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSkills } from "../lib/skillsApi.js";

export function registerSearchTool(server: McpServer) {
  server.tool(
    "skills_search",
    "skills.sh 레지스트리에서 AI 에이전트 스킬을 키워드로 검색합니다",
    {
      query: z
        .string()
        .describe("검색 키워드 (예: 'brainstorming', 'react', 'tdd')"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("최대 결과 수 (기본: 10)"),
    },
    async ({ query, limit }) => {
      const skills = await searchSkills(query, limit);
      if (skills.length === 0) {
        return {
          content: [
            { type: "text", text: `'${query}'에 대한 검색 결과가 없습니다.` },
          ],
        };
      }
      const lines = skills.map(
        (s, i) =>
          `${i + 1}. **${s.name}** (${s.installs.toLocaleString()} installs)\n   ID: ${s.id}\n   소스: ${s.source}`,
      );
      return {
        content: [
          {
            type: "text",
            text: `## '${query}' 검색 결과 (${skills.length}개)\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
```

**Step 2: `src/tools/info.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSkillInfo } from "../lib/skillsApi.js";

export function registerInfoTool(server: McpServer) {
  server.tool(
    "skills_info",
    "특정 스킬의 상세 정보를 조회합니다",
    {
      skillId: z
        .string()
        .describe("스킬 ID (예: 'obra/superpowers/brainstorming')"),
    },
    async ({ skillId }) => {
      const skill = await getSkillInfo(skillId);
      if (!skill) {
        return {
          content: [
            { type: "text", text: `'${skillId}' 스킬을 찾을 수 없습니다.` },
          ],
        };
      }
      const text = [
        `## ${skill.name}`,
        `- **ID**: ${skill.id}`,
        `- **소스**: ${skill.source}`,
        `- **설치 수**: ${skill.installs.toLocaleString()}`,
        `- **GitHub**: https://github.com/${skill.source}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    },
  );
}
```

**Step 3: `src/tools/list.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listInstalledSkills } from "../lib/lockFile.js";

export function registerListTool(server: McpServer) {
  server.tool(
    "skills_list",
    "현재 설치된 AI 에이전트 스킬 목록을 조회합니다",
    {
      scope: z
        .enum(["global", "project", "all"])
        .default("all")
        .describe("조회 범위"),
      projectPath: z
        .string()
        .optional()
        .describe("프로젝트 경로 (scope가 project/all인 경우)"),
    },
    async ({ scope, projectPath }) => {
      const results = await listInstalledSkills(scope, projectPath);
      const lines: string[] = [];
      for (const { scope: s, skills } of results) {
        lines.push(
          `### ${s === "global" ? "🌍 전역" : "📁 프로젝트"} 스킬 (${skills.length}개)`,
        );
        if (skills.length === 0) {
          lines.push("설치된 스킬 없음");
        } else {
          for (const skill of skills) {
            lines.push(`- **${skill.name}** (${skill.source})`);
          }
        }
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
```

**Step 4: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 5: Commit**

```bash
git add src/tools/search.ts src/tools/info.ts src/tools/list.ts
git commit -m "feat: add search, info, list MCP tools"
```

---

## Task 6: CLI 위임 툴 — install, update, remove, check (`src/tools/`)

**Files:**

- Create: `src/tools/install.ts`
- Create: `src/tools/update.ts`
- Create: `src/tools/remove.ts`
- Create: `src/tools/check.ts`
- Create: `src/lib/cli.ts`

**Step 1: `src/lib/cli.ts` 작성 (공통 CLI 실행 유틸)**

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execAsync = promisify(exec);

export async function runSkillsCli(
  args: string,
  scope: "global" | "project",
  projectPath?: string,
): Promise<{ stdout: string; stderr: string }> {
  const cwd = scope === "global" ? homedir() : (projectPath ?? homedir());
  try {
    return await execAsync(`npx skills ${args}`, { cwd });
  } catch (err: unknown) {
    // npx를 찾을 수 없는 경우
    if (String(err).includes("ENOENT") || String(err).includes("not found")) {
      throw new Error(
        "npx를 찾을 수 없습니다. Node.js(https://nodejs.org)를 설치해주세요.",
      );
    }
    throw err;
  }
}
```

**Step 2: `src/tools/install.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerInstallTool(server: McpServer) {
  server.tool(
    "skills_install",
    "skills.sh 레지스트리에서 스킬을 설치합니다 (npx skills 사용)",
    {
      skillId: z
        .string()
        .describe("스킬 소스 (예: 'obra/superpowers', 'vercel-labs/skills')"),
      scope: z
        .enum(["global", "project"])
        .default("global")
        .describe("설치 범위"),
      projectPath: z
        .string()
        .optional()
        .describe("프로젝트 경로 (scope=project인 경우 필수)"),
    },
    async ({ skillId, scope, projectPath }) => {
      try {
        const { stdout, stderr } = await runSkillsCli(
          `add ${skillId}`,
          scope,
          projectPath,
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ 스킬 설치 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `❌ 설치 실패: ${String(err)}` }],
        };
      }
    },
  );
}
```

**Step 3: `src/tools/update.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerUpdateTool(server: McpServer) {
  server.tool(
    "skills_update",
    "설치된 스킬을 최신 버전으로 업데이트합니다 (npx skills 사용)",
    {
      skillId: z
        .string()
        .optional()
        .describe("특정 스킬 ID (없으면 전체 업데이트)"),
      scope: z.enum(["global", "project"]).default("global"),
      projectPath: z.string().optional(),
    },
    async ({ skillId, scope, projectPath }) => {
      const args = skillId ? `update ${skillId}` : "update";
      try {
        const { stdout, stderr } = await runSkillsCli(args, scope, projectPath);
        return {
          content: [
            {
              type: "text",
              text: `✅ 업데이트 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `❌ 업데이트 실패: ${String(err)}` }],
        };
      }
    },
  );
}
```

**Step 4: `src/tools/remove.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerRemoveTool(server: McpServer) {
  server.tool(
    "skills_remove",
    "설치된 스킬을 제거합니다 (npx skills 사용)",
    {
      skillId: z.string().describe("제거할 스킬 ID"),
      scope: z.enum(["global", "project"]).default("global"),
      projectPath: z.string().optional(),
    },
    async ({ skillId, scope, projectPath }) => {
      try {
        const { stdout, stderr } = await runSkillsCli(
          `remove ${skillId}`,
          scope,
          projectPath,
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ 스킬 제거 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `❌ 제거 실패: ${String(err)}` }],
        };
      }
    },
  );
}
```

**Step 5: `src/tools/check.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerCheckTool(server: McpServer) {
  server.tool(
    "skills_check",
    "설치된 스킬 중 업데이트 가능한 항목을 확인합니다",
    {
      scope: z.enum(["global", "project", "all"]).default("all"),
      projectPath: z.string().optional(),
    },
    async ({ scope, projectPath }) => {
      const scopes =
        scope === "all" ? (["global", "project"] as const) : [scope];
      const lines: string[] = [];

      for (const s of scopes) {
        if (s === "project" && !projectPath) continue;
        try {
          const { stdout } = await runSkillsCli("check", s, projectPath);
          lines.push(
            `### ${s === "global" ? "🌍 전역" : "📁 프로젝트"}\n${stdout || "모든 스킬이 최신 상태입니다."}`,
          );
        } catch (err) {
          lines.push(`### ${s}\n❌ 확인 실패: ${String(err)}`);
        }
      }
      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    },
  );
}
```

**Step 6: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 7: Commit**

```bash
git add src/lib/cli.ts src/tools/install.ts src/tools/update.ts src/tools/remove.ts src/tools/check.ts
git commit -m "feat: add install, update, remove, check MCP tools"
```

---

## Task 7: 스킬 추천 툴 (`src/tools/recommend.ts`)

**Files:**

- Create: `src/tools/recommend.ts`

**Step 1: `src/tools/recommend.ts` 작성**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSkills } from "../lib/skillsApi.js";
import { analyzeProject } from "../lib/projectAnalyzer.js";
import { listInstalledSkills } from "../lib/lockFile.js";

export function registerRecommendTool(server: McpServer) {
  server.tool(
    "skills_recommend",
    "프로젝트를 분석하고 작업 의도를 기반으로 유용한 스킬을 추천합니다",
    {
      projectPath: z.string().describe("분석할 프로젝트 경로"),
      intent: z
        .string()
        .optional()
        .describe(
          "현재 작업 의도 (예: 'TDD로 API 개발', '디자인 시스템 구축')",
        ),
    },
    async ({ projectPath, intent }) => {
      // 1. 프로젝트 분석
      const context = await analyzeProject(projectPath);

      // 2. 이미 설치된 스킬 목록 수집 (중복 제외용)
      const installed = await listInstalledSkills("all", projectPath);
      const installedNames = new Set(
        installed.flatMap(({ skills }) => skills.map((s) => s.name)),
      );

      // 3. 검색 키워드 구성 (프로젝트 스택 + 의도)
      const keywords = [...context.searchKeywords];
      if (intent) {
        const intentWords = intent.split(/\s+/).filter((w) => w.length > 2);
        keywords.push(...intentWords);
      }

      // 4. 키워드별 검색 후 합산
      const seen = new Set<string>();
      const candidates: Array<{
        id: string;
        name: string;
        installs: number;
        source: string;
        reason: string;
      }> = [];

      for (const keyword of keywords.slice(0, 5)) {
        const results = await searchSkills(keyword, 5);
        for (const skill of results) {
          if (!seen.has(skill.id) && !installedNames.has(skill.name)) {
            seen.add(skill.id);
            candidates.push({ ...skill, reason: keyword });
          }
        }
      }

      // 5. 인기순 정렬 후 상위 5개
      candidates.sort((a, b) => b.installs - a.installs);
      const top5 = candidates.slice(0, 5);

      if (top5.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "추천할 스킬을 찾지 못했습니다. 이미 모든 유관 스킬이 설치되어 있거나 프로젝트 분석 결과가 없습니다.",
            },
          ],
        };
      }

      const header = [
        `## 🎯 스킬 추천`,
        `**프로젝트 스택**: ${context.frameworks.join(", ") || "감지 안 됨"} / **언어**: ${context.languages.join(", ") || "감지 안 됨"}`,
        intent ? `**작업 의도**: ${intent}` : "",
        "",
      ]
        .filter(Boolean)
        .join("\n");

      const items = top5.map(
        (s, i) =>
          `${i + 1}. **${s.name}** (${s.installs.toLocaleString()} installs)\n   추천 이유: \`${s.reason}\` 관련\n   설치: \`skills_install "${s.source}"\``,
      );

      return {
        content: [{ type: "text", text: `${header}${items.join("\n\n")}` }],
      };
    },
  );
}
```

**Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 3: Commit**

```bash
git add src/tools/recommend.ts
git commit -m "feat: add skills_recommend tool with project analysis"
```

---

## Task 8: 모든 툴을 MCP 서버에 등록 (`src/index.ts` 완성)

**Files:**

- Modify: `src/index.ts`

**Step 1: `src/index.ts`를 최종 버전으로 교체**

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSearchTool } from "./tools/search.js";
import { registerInfoTool } from "./tools/info.js";
import { registerInstallTool } from "./tools/install.js";
import { registerListTool } from "./tools/list.js";
import { registerUpdateTool } from "./tools/update.js";
import { registerRemoveTool } from "./tools/remove.js";
import { registerCheckTool } from "./tools/check.js";
import { registerRecommendTool } from "./tools/recommend.js";

const server = new McpServer({
  name: "oh-my-agents",
  version: "1.0.0",
});

registerSearchTool(server);
registerInfoTool(server);
registerInstallTool(server);
registerListTool(server);
registerUpdateTool(server);
registerRemoveTool(server);
registerCheckTool(server);
registerRecommendTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("oh-my-agents MCP server running (8 tools registered)");
}

main().catch(console.error);
```

**Step 2: 전체 빌드 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

**Step 3: 서버 구동 테스트**

```bash
npx tsx src/index.ts
```

Expected: `oh-my-agents MCP server running (8 tools registered)` 출력

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: register all 8 MCP tools in server"
```

---

## Task 9: 빌드 및 MCP 설정 연결

**Files:**

- Modify: `package.json` (build script 확인)
- Create or Modify: `.mcp.json` (MCP 서버 등록)

**Step 1: 프로젝트 빌드**

```bash
npm run build
```

Expected: `dist/` 폴더 생성, `dist/index.js` 존재

**Step 2: 현재 .mcp.json 확인**

```bash
cat .mcp.json 2>/dev/null || echo "없음"
```

**Step 3: .mcp.json에 서버 등록**

`.mcp.json`을 아래 내용으로 업데이트 (기존 서버 유지하며 oh-my-agents 항목 수정):

```json
{
  "mcpServers": {
    "oh-my-agents": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "절대경로/oh-my-agents"
    }
  }
}
```

> ⚠️ `cwd`는 실제 프로젝트 절대경로로 교체할 것

**Step 4: 개발 모드로 동작 확인**

```bash
npx tsx src/index.ts
```

Expected: 서버 정상 실행

**Step 5: Commit**

```bash
git add dist/ .mcp.json package.json
git commit -m "feat: build MCP server and register in .mcp.json"
```

---

## Task 10: 동작 검증 체크리스트

AI 에이전트에서 다음 툴 호출이 정상 작동하는지 확인:

- [ ] `skills_search` → `query: "brainstorming"` → 결과 10개 반환
- [ ] `skills_info` → `skillId: "obra/superpowers/brainstorming"` → 상세 정보 반환
- [ ] `skills_list` → `scope: "global"` → 설치된 스킬 목록 반환
- [ ] `skills_install` → `skillId: "obra/superpowers", scope: "global"` → 설치 완료
- [ ] `skills_check` → `scope: "all"` → 업데이트 여부 확인
- [ ] `skills_recommend` → `projectPath: ".", intent: "TDD 개발"` → 관련 스킬 5개 추천
- [ ] npx 없을 때 `skills_install` → 안내 메시지 반환 (에러 아님)

```bash
git add .
git commit -m "docs: finalize implementation plan"
```
