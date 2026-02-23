import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export interface InstalledSkill {
  name: string;
  source: string;
  sourceType: string;
  sourceUrl?: string;
  skillPath?: string;
  installedAt?: string;
  updatedAt?: string;
  computedHash?: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, InstalledSkill>;
}

export async function readGlobalLock(): Promise<SkillLockFile> {
  const lockPath = join(homedir(), ".agents", ".skill-lock.json");
  try {
    const content = await readFile(lockPath, "utf-8");
    return JSON.parse(content) as SkillLockFile;
  } catch {
    return { version: 3, skills: {} };
  }
}

export async function readProjectLock(projectPath: string): Promise<SkillLockFile> {
  const lockPath = join(projectPath, "skills-lock.json");
  try {
    const content = await readFile(lockPath, "utf-8");
    return JSON.parse(content) as SkillLockFile;
  } catch {
    return { version: 1, skills: {} };
  }
}

export async function listInstalledSkills(
  scope: "global" | "project" | "all",
  projectPath?: string
): Promise<{ scope: string; skills: InstalledSkill[] }[]> {
  const results: { scope: string; skills: InstalledSkill[] }[] = [];

  if (scope === "global" || scope === "all") {
    const lock = await readGlobalLock();
    results.push({
      scope: "global",
      skills: Object.entries(lock.skills).map(([skillName, info]) => ({
        ...info,
        name: skillName,
      })),
    });
  }

  if ((scope === "project" || scope === "all") && projectPath) {
    const lock = await readProjectLock(projectPath);
    results.push({
      scope: "project",
      skills: Object.entries(lock.skills).map(([skillName, info]) => ({
        ...info,
        name: skillName,
      })),
    });
  }

  return results;
}
