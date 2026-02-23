import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerInstallTool(server: McpServer) {
  server.tool(
    "skills_install",
    "skills.sh 레지스트리에서 스킬을 설치합니다. skill과 agents를 명시적으로 지정하세요.",
    {
      skillId: z
        .string()
        .describe("스킬 소스 (예: 'obra/superpowers', 'vercel-labs/skills')"),
    },
    async ({ skillId }) => {
      const cmd = `add ${skillId}`;

      try {
        const { stdout, stderr } = await runSkillsCli(cmd, "project"); // Default to project or whatever satisfies the API
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ 스킬 설치 명령 실행 완료`,
                `📦 소스: ${skillId}`,
                stdout ? `\n${stdout}` : "",
                stderr ? `\n⚠️ ${stderr}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          content: [
            { type: "text", text: `❌ 설치 실패: ${err instanceof Error ? err.message : String(err)}` },
          ],
        };
      }
    }
  );
}
