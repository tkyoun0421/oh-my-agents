import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
export async function readGlobalLock() {
    const lockPath = join(homedir(), ".agents", ".skill-lock.json");
    try {
        const content = await readFile(lockPath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return { version: 3, skills: {} };
    }
}
export async function readProjectLock(projectPath) {
    const lockPath = join(projectPath, "skills-lock.json");
    try {
        const content = await readFile(lockPath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return { version: 1, skills: {} };
    }
}
export async function listInstalledSkills(scope, projectPath) {
    const results = [];
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
