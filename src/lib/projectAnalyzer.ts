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

  // package.json 분석
  try {
    const pkgPath = join(projectPath, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [dep, keywords] of Object.entries(FRAMEWORK_MAP)) {
      if (deps[dep] ?? deps[`@${dep}/core`]) {
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
  const searchKeywords = [...new Set([...frameworks, ...languages, ...testTools])];

  return { frameworks, languages, testTools, searchKeywords };
}
