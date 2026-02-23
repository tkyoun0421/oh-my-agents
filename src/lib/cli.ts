import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execAsync = promisify(exec);

export async function runSkillsCli(
  args: string,
  scope: "global" | "project",
  projectPath?: string
): Promise<{ stdout: string; stderr: string }> {
  const cwd =
    scope === "global" ? homedir() : (projectPath ?? homedir());
  try {
    return await execAsync(`npx skills ${args}`, { cwd });
  } catch (err: unknown) {
    const errStr = String(err);
    if (errStr.includes("ENOENT") || errStr.includes("not found")) {
      throw new Error(
        "npx를 찾을 수 없습니다. Node.js(https://nodejs.org)를 설치해주세요."
      );
    }
    throw err;
  }
}
