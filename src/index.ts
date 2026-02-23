#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSearchTool } from "./tools/search.js";
import { registerInfoTool } from "./tools/info.js";
import { registerInstallTool } from "./tools/install.js";
import { registerListTool } from "./tools/list.js";
import { registerUpdateTool } from "./tools/update.js";
import { registerRemoveTool } from "./tools/remove.js";
import { registerCheckTool } from "./tools/check.js";
import { registerRecommendTool } from "./tools/recommend.js";

import { setupProject } from "./lib/setup.js";

const server = new McpServer({
  name: "oh-my-agents",
  version: "1.0.5",
});

registerSearchTool(server);
registerInfoTool(server);
registerInstallTool(server);
registerListTool(server);
registerUpdateTool(server);
registerRemoveTool(server);
registerCheckTool(server);
registerRecommendTool(server);

async function main() {
  const isTty = process.stdin.isTTY;
  const args = process.argv.slice(2);

  // MCP 서버 모드 강제 실행 조건:
  // 1. TTY가 아님 (에이전트가 파이프로 실행 중)
  // 2. TTY이지만 인자가 없음 (이 경우 안내 메시지 출력 후 종료 방지) -> 여기서는 인자가 있을 때만 setup 실행
  
  if (isTty) {
    if (args.includes("setup")) {
      await setupProject(process.cwd());
      return;
    }
    
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
      console.log("Welcome to oh-my-agents! 🚀");
      console.log("This is an MCP server for managing AI agent skills.");
      console.log("\nUsage:");
      console.log("  npx oh-my-agents setup    - Configures this MCP server in your local project.");
      console.log("\nWhen run without arguments in a non-interactive environment, it starts as an MCP server.");
      return;
    }
  }

  // Non-TTY (MCP mode)
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("oh-my-agents MCP server running (8 tools registered)");
}

main().catch(console.error);
