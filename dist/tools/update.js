import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";
export function registerUpdateTool(server) {
    server.tool("skills_update", "설치된 스킬을 최신 버전으로 업데이트합니다 (npx skills 사용)", {
        skillId: z
            .string()
            .optional()
            .describe("특정 스킬 ID (없으면 전체 업데이트)"),
        scope: z.enum(["global", "project"]).default("global"),
        projectPath: z.string().optional(),
    }, async ({ skillId, scope, projectPath }) => {
        const args = skillId ? `update ${skillId}` : "update";
        try {
            const { stdout, stderr } = await runSkillsCli(args, scope, projectPath);
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ 업데이트 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    { type: "text", text: `❌ 업데이트 실패: ${String(err)}` },
                ],
            };
        }
    });
}
