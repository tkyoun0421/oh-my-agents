import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerInstallTool(server: McpServer) {
  server.tool(
    "skills_install",
    "skills.sh 레지스트리에서 스킬을 설치합니다. 반드시 이 툴을 호출하기 전에 사용자에게 설치할 skillId, scope, agents를 명확히 확인받으세요. skill과 agents를 명시적으로 지정하세요.",
    {
      skillId: z
        .string()
        .describe("스킬 패키지 소스. 반드시 'owner/repo' 형식이어야 합니다 (예: 'vercel-labs/agent-skills', 'obra/superpowers'). skills_search 툴로 먼저 정확한 ID를 확인하세요."),
      scope: z
        .enum(["global", "project"])
        .default("project")
        .describe("설치 범위 (global 또는 project)"),
      agents: z
        .array(z.string())
        .optional()
        .describe("설치할 에이전트 목록 (예: ['claude-code', 'cursor'])"),
      skills: z
        .array(z.string())
        .optional()
        .describe("설치할 개별 스킬 목록"),
      projectPath: z
        .string()
        .optional()
        .describe("프로젝트 경로 (scope가 project일 때 사용)"),
    },
    async ({ skillId, scope, agents, skills, projectPath }) => {
      let cmd = `add ${skillId}`;

      if (scope === "global") {
        cmd += " --global";
      }
      if (agents && agents.length > 0) {
        cmd += ` --agent ${agents.join(" ")}`;
      }
      if (skills && skills.length > 0) {
        cmd += ` --skill ${skills.join(" ")}`;
      }

      // MCP는 non-TTY 환경이므로 -y 필수 (interactive 프롬프트가 hang을 유발)
      // 사용자 확인은 AI 에이전트가 이 툴을 호출하기 전에 수행해야 함
      cmd += " -y";

      // scope가 project인데 projectPath가 없으면 현재 작업 디렉토리 사용
      const resolvedProjectPath =
        scope === "project" ? (projectPath ?? process.cwd()) : undefined;

      try {
        const { stdout, stderr } = await runSkillsCli(cmd, scope, resolvedProjectPath);
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ 스킬 설치 명령 실행 완료`,
                `📦 소스: ${skillId}`,
                `🌐 범위: ${scope}`,
                agents ? `🤖 에이전트: ${agents.join(", ")}` : "",
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
            {
              type: "text",
              text: `❌ 설치 실패: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
