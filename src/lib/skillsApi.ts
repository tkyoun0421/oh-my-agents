const BASE_URL = "https://skills.sh/api";

export interface SkillResult {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

export interface SearchResponse {
  query: string;
  skills: SkillResult[];
  count: number;
  duration_ms: number;
}

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function searchSkills(query: string, limit = 10): Promise<SkillResult[]> {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SearchResponse = await res.json();
      return data.skills.slice(0, limit);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`skills.sh API 호출 실패: ${String(lastError)}`);
}

export async function getSkillInfo(skillId: string): Promise<SkillResult | null> {
  // skillId format: "owner/repo/skillName" or "owner/repo"
  const parts = skillId.split("/");
  const query = parts[parts.length - 1]; // 마지막 부분으로 검색
  const results = await searchSkills(query, 20);
  return (
    results.find(
      (s) => s.id === skillId || s.source === `${parts[0]}/${parts[1]}`
    ) ?? null
  );
}
