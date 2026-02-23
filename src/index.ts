#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const { version } = require("../package.json") as { version: string };

import { registerSearchTool } from "./tools/search.js";
import { registerInfoTool } from "./tools/info.js";
import { registerListTool } from "./tools/list.js";
import { registerCheckTool } from "./tools/check.js";
import { registerRecommendTool } from "./tools/recommend.js";

import { setupProject } from "./lib/setup.js";

const server = new McpServer({
  name: "oh-my-agents",
  version,
});

registerSearchTool(server);
registerInfoTool(server);
registerListTool(server);
registerCheckTool(server);
registerRecommendTool(server);

async function main() {
  const args = process.argv.slice(2);
  const isTty = process.stdin.isTTY;

  // 1. 설정 명령 처리
  if (args.includes("setup")) {
    await setupProject(process.cwd());
    return;
  }

  // 2. 버전 명령 처리
  if (args.includes("--version") || args.includes("-v")) {
    console.log(version);
    return;
  }

  // 3. 도움말 명령 처리
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Welcome to oh-my-agents! 🚀");
    console.log("This is an MCP server for managing AI agent skills.");
    console.log("\nUsage:");
    console.log("  npx oh-my-agents setup      - Configures this MCP server in your local project.");
    console.log("  npx oh-my-agents --version  - Show version number.");
    console.log("\nMCP mode (default):");
    console.log("  Starts the MCP server and waits for JSON-RPC messages on stdin.");
    return;
  }

  // 4. 기본 동작: MCP 서버 시작
  // TTY인 경우 사용자에게 안내 메시지를 stderr에 출력 (JSON-RPC 방해 안 함)
  if (isTty) {
    console.error("Welcome to oh-my-agents! 🚀");
    console.error("Running in MCP server mode. (Tip: Use 'setup' command for auto-configuration)");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("oh-my-agents MCP server running (5 tools registered)");
}

main().catch(console.error);
