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
const server = new McpServer({
    name: "oh-my-agents",
    version: "1.0.0",
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
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("oh-my-agents MCP server running (8 tools registered)");
}
main().catch(console.error);
