import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerRemoveTool(server: McpServer) {
  server.tool(
    "skills_remove",
    "설치된 스킬을 제거합니다. 반드시 이 툴을 호출하기 전 사용자에게 제거할 skillId와 범위를 명확히 확인받으세요.",
    {
      skillId: z.string().describe("제거할 스킬 ID"),
      scope: z.enum(["global", "project"]).default("global"),
      projectPath: z.string().optional(),
    },
    async ({ skillId, scope, projectPath }) => {
      try {
        let cmd = `remove ${skillId}`;
        if (scope === "global") {
          cmd += " --global";
        }
        // MCP는 non-TTY 환경이므로 -y 필수
        cmd += " -y";
        const resolvedProjectPath =
          scope === "project" ? (projectPath ?? process.cwd()) : undefined;
        const { stdout, stderr } = await runSkillsCli(
          cmd,
          scope,
          resolvedProjectPath
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ 스킬 제거 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            { type: "text", text: `❌ 제거 실패: ${err instanceof Error ? err.message : String(err)}` },
          ],
        };
      }
    }
  );
}
