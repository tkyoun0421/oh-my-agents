import { registerRecommendTool } from "./src/tools/recommend.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "test", version: "1.0.0" });
registerRecommendTool(server);

// @ts-ignore - accessing private tools for testing
const recommendTool = server.tools["skills_recommend"];

async function test() {
  console.log("Testing tool output...");
  const result = await recommendTool.handler({ 
    projectPath: process.cwd(),
    intent: "데이터베이스 연동 및 테스트"
  });
  console.log("TOOL RESULT TEXT:");
  console.log(result.content[0].text);
}

test().catch(console.error);
