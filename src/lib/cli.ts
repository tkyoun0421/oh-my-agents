import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execAsync = promisify(exec);

export async function runSkillsCli(
  args: string,
  scope: "global" | "project",
  projectPath?: string
): Promise<{ stdout: string; stderr: string }> {
  let cwd: string;
  if (scope === "global") {
    cwd = homedir();
  } else {
    // project scope에서 projectPath가 없으면 명확한 오류를 발생시킴
    // (homedir()로 fallback하면 의도치 않은 위치에서 실행됨)
    if (!projectPath) {
      throw new Error(
        "프로젝트 범위 설치 시 projectPath가 필요합니다. 프로젝트 경로를 명시하거나 scope를 'global'로 설정하세요."
      );
    }
    cwd = projectPath;
  }
  try {
    return await execAsync(`npx skills ${args}`, { cwd });
  } catch (err: unknown) {
    const errStr = String(err);
    if (errStr.includes("ENOENT") || errStr.includes("not found")) {
      throw new Error(
        "npx를 찾을 수 없습니다. Node.js(https://nodejs.org)를 설치해주세요."
      );
    }
    // execAsync 실패 시 err.stderr에 실제 오류 내용이 있음
    // "Command failed: ..." 만 노출하지 않고 stderr를 포함해서 throw
    if (err && typeof err === "object" && "stderr" in err) {
      const stderr = (err as { stderr: string }).stderr?.trim();
      const stdout = "stdout" in err ? (err as { stdout: string }).stdout?.trim() : "";
      const detail = stderr || stdout || errStr;
      throw new Error(detail);
    }
    throw err;
  }
}
