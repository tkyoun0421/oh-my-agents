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

  if (isTty || args.includes("setup") || args.includes("--help") || args.includes("-h")) {
    console.log("Welcome to oh-my-agents! 🚀");
    console.log("This is an MCP server for managing AI agent skills.");
    
    if (args.includes("setup")) {
      await setupProject(process.cwd());
      return;
    }

    console.log("\nUsage:");
    console.log("  npx oh-my-agents setup    - Configures this MCP server in your local project.");
    console.log("\nWhen run without arguments in a non-interactive environment, it starts as an MCP server.");
    
    // If it's a TTY and no args, maybe ask if they want to setup?
    if (isTty && args.length === 0) {
      console.log("\nDo you want to set up oh-my-agents in the current directory? (y/n)");
      // For simplicity in npx context, let's just suggest the command or do it.
      // But typically we don't want to be too aggressive without 'setup' flag.
      // However, the user's complaint is exactly that it "does nothing".
      // Let's at least show the help.
    }
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("oh-my-agents MCP server running (8 tools registered)");
}

main().catch(console.error);
