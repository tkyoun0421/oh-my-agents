import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir, platform } from "os";

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

export async function setupProject(_projectPath: string) {
  console.log(`Setting up oh-my-agents globally...`);

  const serverConfig: McpServerConfig = {
    command: "npx",
    args: ["-y", "oh-my-agents"],
  };

  const home = homedir();
  const isWin = platform() === "win32";

  const targets = [
    {
      name: "Antigravity",
      path: join(home, ".gemini", "antigravity", "mcp_config.json"),
    },
    {
      name: "Claude Code",
      path: join(home, ".claude", "mcp_config.json"),
    },
    {
      name: "Cursor",
      path: join(home, ".cursor", "mcp.json"), // Cursor typically uses .cursor/mcp.json or UI based config
    },
    {
      name: "Claude Desktop",
      path: isWin
        ? join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json")
        : join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    },
  ];

  for (const target of targets) {
    try {
      // 디렉토리가 없으면 생성 (파일 경로에서 디렉토리만 추출)
      const dir = join(target.path, "..");
      await mkdir(dir, { recursive: true });

      let config: McpConfig = { mcpServers: {} };
      try {
        const existing = await readFile(target.path, "utf-8");
        config = JSON.parse(existing);
      } catch {
        // 파일 없음
      }

      config.mcpServers = config.mcpServers || {};
      config.mcpServers["oh-my-agents"] = serverConfig;

      await writeFile(target.path, JSON.stringify(config, null, 2));
      console.log(`✅ Added to ${target.name} config`);
    } catch (err: unknown) {
      // 에러 로그는 최소화 (특정 IDE가 설치 안 된 경우일 수 있음)
      if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
         console.warn(`⚠️ Could not update ${target.name} config:`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  console.log("\nSetup complete! oh-my-agents is now configured globally for your AI tools.");
}



