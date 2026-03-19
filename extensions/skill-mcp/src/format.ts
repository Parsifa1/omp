import { BUILTIN_MCP_TOOL_HINTS } from "./constants";
import type { SkillMcpConfig, SkillWithMcpConfig } from "./types";

export function formatBuiltinMcpHint(mcpName: string): string | null {
  const nativeTools = BUILTIN_MCP_TOOL_HINTS[mcpName];
  if (!nativeTools) return null;
  return (
    `"${mcpName}" is a builtin MCP, not a skill MCP.\nUse the native tools directly:\n`
    + nativeTools.map(t => `  - ${t}`).join("\n")
  );
}

export function formatAvailableMcps(skills: SkillWithMcpConfig[]): string {
  const mcps: string[] = [];
  for (const skill of skills) {
    if (!skill.mcpConfig) continue;
    for (const serverName of Object.keys(skill.mcpConfig)) {
      mcps.push(`  - "${serverName}" from skill "${skill.name}"`);
    }
  }
  return mcps.length > 0 ? mcps.join("\n") : "  (none found)";
}

export function applyGrepFilter(output: string, pattern: string | undefined): string {
  if (!pattern) return output;
  try {
    const regex = new RegExp(pattern, "i");
    const filtered = output.split("\n").filter(line => regex.test(line));
    return filtered.length > 0 ? filtered.join("\n") : `[grep] No lines matched pattern: ${pattern}`;
  } catch {
    return output;
  }
}

export function formatToolParams(inputSchema: {
  properties?: Record<string, unknown>;
  required?: string[];
}): string {
  const props = inputSchema.properties;
  if (!props || Object.keys(props).length === 0) return "    (no parameters)";
  const required = new Set(inputSchema.required ?? []);
  return Object.entries(props)
    .map(([key, value]) => {
      const property = value as { type?: string; description?: string };
      const optionalMark = required.has(key) ? "" : "?";
      const type = property.type ?? "any";
      const description = property.description ? ` — ${property.description}` : "";
      return `    ${key}${optionalMark}: ${type}${description}`;
    })
    .join("\n");
}

export function toAvailableMcpList(skills: SkillWithMcpConfig[]): string {
  return `Available MCP servers in loaded skills:\n${formatAvailableMcps(skills)}`;
}

export function hasMcpConfig(config: SkillMcpConfig | undefined): config is SkillMcpConfig {
  return Boolean(config);
}
