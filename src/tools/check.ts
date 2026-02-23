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
        scope === "all"
          ? (["global", "project"] as const)
          : ([scope] as const);
      const lines: string[] = [];

      for (const s of scopes) {
        const resolvedProjectPath =
          s === "project" ? (projectPath ?? process.cwd()) : undefined;
        try {
          const cmd = s === "global" ? "check --global" : "check";
          const { stdout } = await runSkillsCli(cmd, s, resolvedProjectPath);
          lines.push(
            `### ${s === "global" ? "🌍 전역" : "📁 프로젝트"}\n${stdout || "모든 스킬이 최신 상태입니다."}`
          );
        } catch (err: unknown) {
          lines.push(`### ${s}\n❌ 확인 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      lines.push(`\n> 💡 업데이트하려면 터미널에서 \`npx skills update\`를 실행하세요.`);
      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    }
  );
}
