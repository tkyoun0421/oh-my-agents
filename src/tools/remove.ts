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
          `remove ${skillId} -y`,
          scope,
          projectPath
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
          content: [
            { type: "text", text: `❌ 제거 실패: ${String(err)}` },
          ],
        };
      }
    }
  );
}
