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
      scope: z
        .enum(["global", "project"])
        .default("global")
        .describe("설치 범위: 'global'(전역, 기본) 또는 'project'(현재 프로젝트)"),
      skill: z
        .string()
        .optional()
        .describe(
          "설치할 특정 스킬 이름 (예: 'brainstorming'). '*'이면 전체. 생략 시 먼저 --list로 목록 조회 권장"
        ),
      agents: z
        .string()
        .optional()
        .describe(
          "설치할 에이전트 목록, 공백 구분 (예: 'antigravity claude-code'). '*'이면 전체. 생략 시 antigravity만"
        ),
      projectPath: z
        .string()
        .optional()
        .describe("프로젝트 경로 (scope=project인 경우)"),
    },
    async ({ skillId, scope, skill, agents, projectPath }) => {
      const flags: string[] = ["-y"];

      if (scope === "global") flags.push("-g");
      if (skill) flags.push("--skill", skill);

      // 에이전트 기본값: antigravity (글로벌 설치 시 가장 일반적)
      const targetAgents = agents ?? "antigravity";
      flags.push("--agent", targetAgents);

      const cmd = `add ${skillId} ${flags.join(" ")}`;

      try {
        const { stdout, stderr } = await runSkillsCli(cmd, scope, projectPath);
        const agentInfo = targetAgents === agents ? agents : "antigravity (기본값)";
        return {
          content: [
            {
              type: "text",
              text: [
                `✅ 스킬 설치 완료`,
                `📦 소스: ${skillId}`,
                `🤖 에이전트: ${agentInfo}`,
                `🌍 범위: ${scope}`,
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
