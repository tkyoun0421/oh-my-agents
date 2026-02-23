import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerUpdateTool(server: McpServer) {
  server.tool(
    "skills_update",
    "설치된 스킬을 최신 버전으로 업데이트합니다. 이 툴을 호출하기 전 사용자에게 업데이트 대상과 범위를 확인받으세요.",
    {
      skillId: z
        .string()
        .optional()
        .describe("특정 스킬 ID (없으면 전체 업데이트)"),
      scope: z.enum(["global", "project"]).default("global"),
      projectPath: z.string().optional(),
    },
    async ({ skillId, scope, projectPath }) => {
      let cmd = skillId ? `update ${skillId}` : "update";
      if (scope === "global") {
        cmd += " --global";
      }
      // MCP는 non-TTY 환경이므로 -y 필수
      cmd += " -y";
      const resolvedProjectPath =
        scope === "project" ? (projectPath ?? process.cwd()) : undefined;
      try {
        const { stdout, stderr } = await runSkillsCli(cmd, scope, resolvedProjectPath);
        return {
          content: [
            {
              type: "text",
              text: `✅ 업데이트 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            { type: "text", text: `❌ 업데이트 실패: ${err instanceof Error ? err.message : String(err)}` },
          ],
        };
      }
    }
  );
}
