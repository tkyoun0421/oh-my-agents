import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSkillInfo } from "../lib/skillsApi.js";

export function registerInfoTool(server: McpServer) {
  server.tool(
    "skills_info",
    "특정 스킬의 상세 정보를 조회합니다",
    {
      skillId: z
        .string()
        .describe("스킬 ID (예: 'obra/superpowers/brainstorming')"),
    },
    async ({ skillId }) => {
      const skill = await getSkillInfo(skillId);
      if (!skill) {
        return {
          content: [
            { type: "text", text: `'${skillId}' 스킬을 찾을 수 없습니다.` },
          ],
        };
      }
      const text = [
        `## ${skill.name}`,
        `- **ID**: \`${skill.id}\``,
        `- **소스**: ${skill.source}`,
        `- **설치 수**: ${skill.installs.toLocaleString()}`,
        `- **GitHub**: https://github.com/${skill.source}`,
        `- **skills.sh**: https://skills.sh/${skill.id}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    }
  );
}
