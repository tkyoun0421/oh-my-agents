import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";
export function registerInstallTool(server) {
    server.tool("skills_install", "skills.sh 레지스트리에서 스킬을 설치합니다 (npx skills 사용, 멀티 에이전트 배포 지원)", {
        skillId: z
            .string()
            .describe("스킬 소스 (예: 'obra/superpowers', 'vercel-labs/skills')"),
        scope: z
            .enum(["global", "project"])
            .default("global")
            .describe("설치 범위"),
        projectPath: z
            .string()
            .optional()
            .describe("프로젝트 경로 (scope=project인 경우 필수)"),
    }, async ({ skillId, scope, projectPath }) => {
        try {
            const { stdout, stderr } = await runSkillsCli(`add ${skillId}`, scope, projectPath);
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ 스킬 설치 완료\n\n${stdout}${stderr ? `\n⚠️ ${stderr}` : ""}`,
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    { type: "text", text: `❌ 설치 실패: ${String(err)}` },
                ],
            };
        }
    });
}
