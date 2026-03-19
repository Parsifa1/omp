import type { MCPServerConnection } from "./types";
import { formatToolParams } from "./format";

export async function formatServerCapabilities(
  connection: MCPServerConnection,
  skillName: string,
  serverName: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  const { listTools, listResources, listPrompts } = await import("@oh-my-pi/pi-coding-agent/mcp");

  const [tools, resources, prompts] = await Promise.all([
    listTools(connection, { signal }).catch(() => []),
    listResources(connection, { signal }).catch(() => []),
    listPrompts(connection, { signal }).catch(() => []),
  ]);

  const lines: string[] = [
    `MCP server "${serverName}" (from skill "${skillName}"):`,
    "",
  ];

  lines.push(`Tools (${tools.length}):`);
  if (tools.length === 0) {
    lines.push("  (none)");
  } else {
    for (const tool of tools) {
      lines.push(`  ${tool.name}${tool.description ? ` — ${tool.description}` : ""}`);
      lines.push(formatToolParams(tool.inputSchema));
    }
  }

  lines.push("", `Resources (${resources.length}):`);
  if (resources.length === 0) {
    lines.push("  (none)");
  } else {
    for (const resource of resources as Array<{ uri?: string; name?: string; description?: string }>) {
      const id = resource.uri ?? resource.name ?? "?";
      const description = resource.description ? ` — ${resource.description}` : "";
      lines.push(`  ${id}${description}`);
    }
  }

  lines.push("", `Prompts (${prompts.length}):`);
  if (prompts.length === 0) {
    lines.push("  (none)");
  } else {
    for (const prompt of prompts as Array<{ name: string; description?: string }>) {
      lines.push(`  ${prompt.name}${prompt.description ? ` — ${prompt.description}` : ""}`);
    }
  }

  lines.push(
    "",
    `Call a tool:     skill_mcp(mcp_name="${serverName}", tool_name="<name>", arguments={...})`,
    `Read a resource: skill_mcp(mcp_name="${serverName}", resource_name="<uri>")`,
    `Get a prompt:    skill_mcp(mcp_name="${serverName}", prompt_name="<name>")`,
  );

  return lines.join("\n");
}
