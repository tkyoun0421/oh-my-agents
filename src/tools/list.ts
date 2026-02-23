import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSkillsCli } from "../lib/cli.js";

export function registerListTool(server: McpServer) {
  server.tool(
    "skills_list",
    "현재 설치된 AI 에이전트 스킬 목록을 조회합니다",
    {
      scope: z
        .enum(["global", "project", "all"])
        .default("all")
        .describe("조회 범위 (global: 전역, project: 현재 프로젝트, all: 전체)"),
      projectPath: z
        .string()
        .optional()
        .describe("프로젝트 경로 (scope가 project/all인 경우)"),
    },
    async ({ scope, projectPath }) => {
      const sections: string[] = [];

      // global 스킬 목록
      if (scope === "global" || scope === "all") {
        try {
          const { stdout } = await runSkillsCli("ls --global", "global");
          sections.push(`### 🌍 전역 스킬\n${stdout.trim() || "설치된 스킬 없음"}`);
        } catch (err: unknown) {
          sections.push(`### 🌍 전역 스킬\n❌ 조회 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 프로젝트 스킬 목록
      if (scope === "project" || scope === "all") {
        const cwd = projectPath ?? process.cwd();
        try {
          const { stdout } = await runSkillsCli("ls", "project", cwd);
          sections.push(`### 📁 프로젝트 스킬\n${stdout.trim() || "설치된 스킬 없음"}`);
        } catch (err: unknown) {
          sections.push(`### 📁 프로젝트 스킬\n❌ 조회 실패: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        content: [{ type: "text", text: sections.join("\n\n") }],
      };
    }
  );
}
