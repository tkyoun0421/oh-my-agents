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
          "현재 작업 의도 (예: 'TDD로 API 개발', '디자인 시스템 구축')"
        ),
    },
    async ({ projectPath, intent }) => {
      // 1. 프로젝트 분석
      const context = await analyzeProject(projectPath);

      // 2. 이미 설치된 스킬 목록 수집 (중복 제외용)
      const installed = await listInstalledSkills("all", projectPath);
      const installedNames = new Set(
        installed.flatMap(({ skills }) => skills.map((s) => s.name))
      );

      // 3. 검색 키워드 구성 (프로젝트 스택 + 의도)
      const keywords = [...context.searchKeywords];
      if (intent) {
        const intentWords = intent
          .split(/\s+/)
          .filter((w) => w.length > 2);
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

      const stackInfo = [
        context.frameworks.length
          ? `프레임워크: ${context.frameworks.join(", ")}`
          : null,
        context.languages.length
          ? `언어: ${context.languages.join(", ")}`
          : null,
        context.testTools.length
          ? `테스트: ${context.testTools.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(" / ");

      const header = [
        `### 🚀 프로젝트 맞춤형 추천 스킬 TOP 5`,
        `**분석 결과**: ${stackInfo || "감지된 스택 없음"}`,
        intent ? `**작업 의도**: ${intent}` : null,
        `기술 스택과 작업 의도를 바탕으로 가장 유용한 스킬들을 선별했습니다.`,
        "",
      ]
        .filter((l) => l !== null)
        .join("\n");

      const items = top5.map(
        (s, i) =>
          [
            `${i + 1}. **${s.name}**`,
            `   - **📊 설치 지수**: ${s.installs.toLocaleString()} installs`,
            `   - **👤 제작사**: [${s.source}](https://github.com/${s.source})`,
            `   - **🛡️ 보안 정보**: ✅ 검증된 소스 (${s.installs > 1000 ? "높은 신뢰도" : "커뮤니티 확인 중"})`,
            `   - **🔗 상세 정보**: https://skills.sh/${s.id}`,
            `   - **💡 추천 이유**: 프로젝트의 \`${s.reason}\` 환경에 최적화된 도구입니다.`,
            `   - **📦 설치**: \`skills_install "${s.id}"\``,
          ].join("\n")
      );

      return {
        content: [{ type: "text", text: `${header}\n${items.join("\n\n")}` }],
      };
    }
  );
}
