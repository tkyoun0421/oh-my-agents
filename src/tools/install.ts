import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerInstallTool(server: McpServer) {
  server.tool(
    "skills_install",
    "skills.sh 레지스트리에서 스킬을 설치합니다. agents를 지정하지 않으면 모든 에이전트에 설치합니다.",
    {
      skillId: z
        .string()
        .describe("스킬 소스 (예: 'obra/superpowers', 'vercel-labs/skills')"),
      scope: z
        .enum(["global", "project"])
        .default("global")
        .describe("설치 범위 (기본: global)"),
      skill: z
        .string()
        .optional()
        .describe("특정 스킬 이름만 설치 (예: 'brainstorming'). 생략 시 전체 설치"),
      agents: z
        .string()
        .optional()
        .describe("설치할 에이전트 목록 (예: 'antigravity claude-code'). 생략 시 전체"),
      projectPath: z
        .string()
        .optional()
        .describe("프로젝트 경로 (scope=project인 경우)"),
    },
    async ({ skillId, scope, skill, agents, projectPath }) => {
      // 플래그 조합: -y로 확인 프롬프트 스킵, agent/skill 명시 가능
      const flags: string[] = ["-y"];
      if (scope === "global") flags.push("-g");
      if (skill) flags.push("--skill", skill);
      if (agents) {
        flags.push("--agent", agents);
      } else {
        // 에이전트 미지정 시 전체 설치
        flags.push("--agent", "*");
      }

      const cmd = `add ${skillId} ${flags.join(" ")}`;

      try {
        const { stdout, stderr } = await runSkillsCli(cmd, scope, projectPath);
        return {
          content: [
            {
              type: "text",
              text: `✅ 스킬 설치 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            { type: "text", text: `❌ 설치 실패: ${String(err)}` },
          ],
        };
      }
    }
  );
}
