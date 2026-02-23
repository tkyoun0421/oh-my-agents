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

export async function analyzeProject(projectPath: string): Promise<ProjectContext> {
  const frameworks: string[] = [];
  const languages: string[] = [];
  const testTools: string[] = [];
  const allDeps: string[] = [];

  // package.json 분석
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

    // 유명 라이브러리 직접 추가 (Prisma, Zod 등)
    if (deps["prisma"]) frameworks.push("prisma");
    if (deps["zod"]) frameworks.push("zod");
    if (deps["tailwindcss"]) frameworks.push("tailwind");
    if (deps["supabase"]) frameworks.push("supabase");

    for (const [tool, name] of Object.entries(TEST_TOOL_MAP)) {
      if (deps[tool]) testTools.push(name);
    }
  } catch {
    // package.json 없음, 무시
  }

  // 파일 확장자 스캔 (최상위 + src/ + app/ + lib/)
  try {
    const scanDirs = [projectPath, join(projectPath, "src"), join(projectPath, "app"), join(projectPath, "lib")];
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

  // 검색 키워드 조합 (프레임워크 + 언어 + 테스트툴 + 주요 의존성 일부)
  // 너무 많은 키워드는 검색을 느리게 하므로 Set으로 중복 제거 후 주요 키워드 추출
  const searchKeywords = [...new Set([...frameworks, ...languages, ...testTools])];
  
  // 의존성 중 유명한 것들 위주로 키워드 보강 (앞에서 frameworks에 안 들어간 것들 중 일부)
  const importantKeywords = ["prisma", "zod", "tailwind", "react-hook-form", "playwright", "supabase", "firebase", "graphql"];
  for (const kw of importantKeywords) {
    if (allDeps.some(d => d.includes(kw)) && !searchKeywords.includes(kw)) {
      searchKeywords.push(kw);
    }
  }

  return { frameworks, languages, testTools, searchKeywords };
}
