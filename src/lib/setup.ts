import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

export async function setupProject(projectPath: string) {
  console.log(`Setting up oh-my-agents in ${projectPath}...`);

  // 1. .mcp.json 설정 (Antigravity, Gemini 등 지원)
  const mcpConfigPath = join(projectPath, ".mcp.json");
  let mcpConfig: McpConfig = { mcpServers: {} };
  try {
    const existing = await readFile(mcpConfigPath, "utf-8");
    mcpConfig = JSON.parse(existing);
  } catch {
    // 파일 없음
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers || {};
  mcpConfig.mcpServers["oh-my-agents"] = {
    command: "npx",
    args: ["-y", "oh-my-agents"],
  };

  await writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  console.log("✅ Added to .mcp.json");

  // 2. .claudecode/config.json 설정 (Claude Code 지원)
  const claudeDirPath = join(projectPath, ".claudecode");
  const claudeConfigPath = join(claudeDirPath, "config.json");
  try {
    await mkdir(claudeDirPath, { recursive: true });
    let claudeConfig: McpConfig = { mcpServers: {} };
    try {
      const existing = await readFile(claudeConfigPath, "utf-8");
      claudeConfig = JSON.parse(existing);
    } catch {
      // 파일 없음
    }

    claudeConfig.mcpServers = claudeConfig.mcpServers || {};
    claudeConfig.mcpServers["oh-my-agents"] = {
      command: "npx",
      args: ["-y", "oh-my-agents"],
    };

    await writeFile(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
    console.log("✅ Added to .claudecode/config.json");
  } catch (err: unknown) {
    console.warn("⚠️ Failed to update .claudecode/config.json:", err instanceof Error ? err.message : String(err));
  }

  // 3. .agents/mcp.json 설정 (Antigravity 전용 최적화)
  const agentDirPath = join(projectPath, ".agents");
  const agentConfigPath = join(agentDirPath, "mcp.json");
  try {
    await mkdir(agentDirPath, { recursive: true });
    let agentConfig: McpConfig = { mcpServers: {} };
    try {
      const existing = await readFile(agentConfigPath, "utf-8");
      agentConfig = JSON.parse(existing);
    } catch {
      // 파일 없음
    }

    agentConfig.mcpServers = agentConfig.mcpServers || {};
    agentConfig.mcpServers["oh-my-agents"] = {
      command: "npx",
      // Antigravity 환경에서 가장 안정적인 npx 호출 방식
      args: ["-y", "oh-my-agents"],
    };

    await writeFile(agentConfigPath, JSON.stringify(agentConfig, null, 2));
    console.log("✅ Added to .agents/mcp.json (Antigravity optimized)");
  } catch (err: unknown) {
    console.warn("⚠️ Failed to update .agents/mcp.json:", err instanceof Error ? err.message : String(err));
  }

  console.log("\nSetup complete! You can now use oh-my-agents tools in your AI assistant.");
}
