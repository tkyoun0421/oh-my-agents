import { z } from "zod";
import { searchSkills } from "../lib/skillsApi.js";
export function registerSearchTool(server) {
    server.tool("skills_search", "skills.sh 레지스트리에서 AI 에이전트 스킬을 키워드로 검색합니다", {
        query: z.string().describe("검색 키워드 (예: 'brainstorming', 'react', 'tdd')"),
        limit: z.number().optional().default(10).describe("최대 결과 수 (기본: 10)"),
    }, async ({ query, limit }) => {
        const skills = await searchSkills(query, limit);
        if (skills.length === 0) {
            return {
                content: [
                    { type: "text", text: `'${query}'에 대한 검색 결과가 없습니다.` },
                ],
            };
        }
        const lines = skills.map((s, i) => `${i + 1}. **${s.name}** (${s.installs.toLocaleString()} installs)\n   ID: \`${s.id}\`\n   소스: ${s.source}`);
        return {
            content: [
                {
                    type: "text",
                    text: `## '${query}' 검색 결과 (${skills.length}개)\n\n${lines.join("\n\n")}`,
                },
            ],
        };
    });
}
