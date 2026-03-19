import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

import type { MCPServerConfig, SkillMcpConfig, SkillWithMcpConfig } from "./types";

export function extractSkillMcpConfig(content: string): SkillMcpConfig | undefined {
  try {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return undefined;
    const fm = Bun.YAML.parse(match[1].replaceAll("\t", "  ")) as Record<string, unknown> | null;
    if (!fm || typeof fm !== "object") return undefined;
    const mcp = fm.mcp;
    if (!mcp || typeof mcp !== "object" || Array.isArray(mcp)) return undefined;
    return mcp as SkillMcpConfig;
  } catch {
    return undefined;
  }
}

export async function readSkillMcpJson(skillBaseDir: string): Promise<SkillMcpConfig | undefined> {
  try {
    const content = await Bun.file(`${skillBaseDir}/mcp.json`).text();
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (parsed && "mcpServers" in parsed && parsed.mcpServers) {
      return parsed.mcpServers as SkillMcpConfig;
    }

    const hasCommandField = Object.values(parsed).some(
      value => value && typeof value === "object" && "command" in (value as Record<string, unknown>),
    );
    if (hasCommandField) return parsed as SkillMcpConfig;
  } catch {
  }
  return undefined;
}

export async function loadSkillMcpConfigs(
  pi: ExtensionAPI,
  cwd: string,
): Promise<SkillWithMcpConfig[]> {
  const settings = pi.pi.Settings.instance;
  const skillsSettings = settings.getGroup("skills");
  if (skillsSettings?.enabled === false) return [];

  const result = await pi.pi.discoverSkills(cwd, undefined, skillsSettings);
  return Promise.all(
    result.skills.map(async skill => {
      let mcpConfig = await readSkillMcpJson(skill.baseDir);
      if (!mcpConfig) {
        try {
          const content = await Bun.file(skill.filePath).text();
          mcpConfig = extractSkillMcpConfig(content);
        } catch {
        }
      }
      return { name: skill.name, mcpConfig };
    }),
  );
}

export function findMcpServer(
  mcpName: string,
  skills: SkillWithMcpConfig[],
): { skill: { name: string }; config: MCPServerConfig } | null {
  for (const skill of skills) {
    if (skill.mcpConfig && mcpName in skill.mcpConfig) {
      return { skill, config: skill.mcpConfig[mcpName] };
    }
  }
  return null;
}
