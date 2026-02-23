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
          `### ${s === "global" ? "🌍 전역" : "📁 프로젝트"} 스킬 (${skills.length}개)`
        );
        if (skills.length === 0) {
          lines.push("설치된 스킬 없음");
        } else {
          for (const skill of skills) {
            lines.push(`- **${skill.name}** — ${skill.source}`);
          }
        }
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}
