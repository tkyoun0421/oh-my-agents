import { readFile, readdir } from "fs/promises";
import { join, extname } from "path";

export interface ProjectContext {
  frameworks: string[];
  languages: string[];
  testTools: string[];
  architecturePatterns: string[];
  detectedStack: string[];
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

export async function analyzeProject(projectPath: string): Promise<ProjectContext> {
  const frameworks: string[] = [];
  const languages: string[] = [];
  const testTools: string[] = [];
  const architecturePatterns: string[] = [];
  const detectedStack: string[] = [];
  const allDeps: string[] = [];

  // 1. package.json 분석 및 기술 스택(Stack) 확정
  try {
    const pkgPath = join(projectPath, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    allDeps.push(...Object.keys(deps));

    for (const [dep, keywords] of Object.entries(FRAMEWORK_MAP)) {
      if (deps[dep] ?? deps[`@${dep}/core`]) {
        frameworks.push(...keywords);
      }
    }

    // 유명 라이브러리 직접 추가 및 관련 스택(Complementary) 확장
    if (deps["prisma"]) {
      frameworks.push("prisma");
      detectedStack.push("database-orm");
    }
    if (deps["zod"]) {
      frameworks.push("zod");
      detectedStack.push("validation");
    }
    if (deps["next"]) {
      detectedStack.push("nextjs-ecosystem");
    }
    if (deps["tailwindcss"]) {
      frameworks.push("tailwind");
      detectedStack.push("styling-system");
    }
    if (deps["supabase"]) {
      frameworks.push("supabase");
      detectedStack.push("backend-as-a-service");
    }

    for (const [tool, name] of Object.entries(TEST_TOOL_MAP)) {
      if (deps[tool]) testTools.push(name);
    }
  } catch {
    // package.json 없음
  }

  // 2. 아키텍처 패턴 분석 (폴더 구조 기반 - 포인트 2번)
  try {
    const scanDirs = [projectPath, join(projectPath, "src"), join(projectPath, "app"), join(projectPath, "lib")];
    const allFolders = new Set<string>();

    for (const dir of scanDirs) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) allFolders.add(entry.name);
        }
      } catch { /* 무시 */ }
    }

    // 패턴 매칭
    if (allFolders.has("atoms") || allFolders.has("molecules")) {
      architecturePatterns.push("atomic-design");
    }
    if (allFolders.has("features")) {
      architecturePatterns.push("feature-sliced-design");
    }
    if (allFolders.has("domain") && allFolders.has("infrastructure")) {
      architecturePatterns.push("clean-architecture");
    }
    if (allFolders.has("components") && (allFolders.has("hooks") || allFolders.has("services"))) {
      architecturePatterns.push("modular-architecture");
    }
  } catch { /* 무시 */ }

  // 3. 파일 확장자 기반 언어 분석
  try {
    const scanPaths = [projectPath, join(projectPath, "src")];
    const extCount: Record<string, number> = {};

    for (const dir of scanPaths) {
      try {
        const files = await readdir(dir);
        for (const file of files) {
          const ext = extname(file);
          if (ext) extCount[ext] = (extCount[ext] ?? 0) + 1;
        }
      } catch { /* 무시 */ }
    }

    const topExts = Object.entries(extCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ext]) => ext);

    for (const ext of topExts) {
      const lang = EXTENSION_LANG_MAP[ext];
      if (lang && !languages.includes(lang)) languages.push(lang);
    }
  } catch { /* 무시 */ }

  // 4. 검색 키워드 조합 (포인트 4번: 상호 보완적 키워드 주입)
  const searchKeywords = [...new Set([...frameworks, ...languages, ...testTools, ...architecturePatterns])];
  
  // 스택 기반 상호 보완 키워드 (Complementary)
  if (detectedStack.includes("nextjs-ecosystem")) {
    searchKeywords.push("sentry", "lighthouse", "seo-optimization");
  }
  if (detectedStack.includes("database-orm") && frameworks.includes("prisma")) {
    searchKeywords.push("zod-prisma", "erd-generator");
  }
  if (detectedStack.includes("styling-system") && frameworks.includes("tailwind")) {
    searchKeywords.push("headless-ui", "framer-motion");
  }

  return { frameworks, languages, testTools, architecturePatterns, detectedStack, searchKeywords };
}
