// skill-mcp extension for oh-my-pi
//
// Registers the skill_mcp tool that lets the agent call MCP servers
// embedded in skill configs (mcp.json or SKILL.md frontmatter).
// Dynamic imports from @oh-my-pi/pi-coding-agent/mcp are used for
// all value-level access to avoid triggering TypeScript's full source
// analysis of the package's internal dependency tree.

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { MCPServerConfig, MCPServerConnection } from "@oh-my-pi/pi-coding-agent/mcp";
import type { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SkillMcpArgs {
  mcp_name: string;
  tool_name?: string;
  resource_name?: string;
  prompt_name?: string;
  arguments?: string | Record<string, unknown>;
  grep?: string;
}

// null means "discover mode" — no operation was specified, list capabilities instead
type OperationType = { type: "tool" | "resource" | "prompt"; name: string } | null;
type SkillMcpConfig = Record<string, MCPServerConfig>;

// ─── Constants ───────────────────────────────────────────────────────────────

const SKILL_MCP_TOOL_NAME = "skill_mcp";
const SKILL_MCP_DESCRIPTION =
  "Invoke MCP server operations from skill-embedded MCPs. Requires mcp_name plus exactly one of: tool_name, resource_name, or prompt_name.\n\nOmit all three to DISCOVER what the server offers: lists available tools (with parameters), resources, and prompts.";

const BUILTIN_MCP_TOOL_HINTS: Record<string, string[]> = {
  context7: ["mcp_context7_resolve_library_id", "mcp_context7_query_docs"],
  exa: ["exa_search", "exa_researcher_start", "exa_researcher_check"],
  "grep-app": ["mcp_grep_app_searchgithub"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Cache dynamic import from MCP public subpath to avoid repeated imports.
type MCPModule = typeof import("@oh-my-pi/pi-coding-agent/mcp");
let mcpModulePromise: Promise<MCPModule> | null = null;

function getMcpModule(): Promise<MCPModule> {
  if (!mcpModulePromise) mcpModulePromise = import("@oh-my-pi/pi-coding-agent/mcp");
  return mcpModulePromise;
}

// Returns null when no operation params are provided (caller enters discover mode).
// Throws only when multiple operations are specified simultaneously.
function validateOperationParams(args: SkillMcpArgs): OperationType {
  const operations: Array<{ type: "tool" | "resource" | "prompt"; name: string }> = [];
  if (args.tool_name) operations.push({ type: "tool", name: args.tool_name });
  if (args.resource_name) operations.push({ type: "resource", name: args.resource_name });
  if (args.prompt_name) operations.push({ type: "prompt", name: args.prompt_name });

  if (operations.length > 1) {
    const provided = [
      args.tool_name && `tool_name="${args.tool_name}"`,
      args.resource_name && `resource_name="${args.resource_name}"`,
      args.prompt_name && `prompt_name="${args.prompt_name}"`,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(
      "Multiple operations specified. Exactly one must be provided.\n\n"
        + `Received: ${provided}\n\nUse separate calls for each operation.`,
    );
  }

  return operations[0] ?? null;
}

function formatBuiltinMcpHint(mcpName: string): string | null {
  const nativeTools = BUILTIN_MCP_TOOL_HINTS[mcpName];
  if (!nativeTools) return null;
  return (
    `"${mcpName}" is a builtin MCP, not a skill MCP.\nUse the native tools directly:\n`
    + nativeTools.map(t => `  - ${t}`).join("\n")
  );
}

function formatAvailableMcps(skills: Array<{ name: string; mcpConfig?: SkillMcpConfig }>): string {
  const mcps: string[] = [];
  for (const skill of skills) {
    if (skill.mcpConfig) {
      for (const serverName of Object.keys(skill.mcpConfig)) {
        mcps.push(`  - "${serverName}" from skill "${skill.name}"`);
      }
    }
  }
  return mcps.length > 0 ? mcps.join("\n") : "  (none found)";
}

function parseArguments(argsJson: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!argsJson) return {};
  if (typeof argsJson === "object") return argsJson;
  try {
    const jsonStr = argsJson.startsWith("'") && argsJson.endsWith("'") ? argsJson.slice(1, -1) : argsJson;
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed !== "object" || parsed === null) throw new Error("Must be a JSON object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Invalid arguments JSON: ${error instanceof Error ? error.message : error}\n\nReceived: ${argsJson}`,
    );
  }
}

function applyGrepFilter(output: string, pattern: string | undefined): string {
  if (!pattern) return output;
  try {
    const regex = new RegExp(pattern, "i");
    const filtered = output.split("\n").filter(l => regex.test(l));
    return filtered.length > 0 ? filtered.join("\n") : `[grep] No lines matched pattern: ${pattern}`;
  } catch {
    return output;
  }
}

// Parse "mcp" key from SKILL.md frontmatter (YAML parsed by Bun)
function extractSkillMcpConfig(content: string): SkillMcpConfig | undefined {
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

async function readSkillMcpJson(skillBaseDir: string): Promise<SkillMcpConfig | undefined> {
  try {
    const content = await Bun.file(`${skillBaseDir}/mcp.json`).text();
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (parsed && "mcpServers" in parsed && parsed.mcpServers) {
      return parsed.mcpServers as SkillMcpConfig;
    }
    // Legacy flat format: values have "command" field
    const hasCommandField = Object.values(parsed).some(
      v => v && typeof v === "object" && "command" in (v as Record<string, unknown>),
    );
    if (hasCommandField) return parsed as SkillMcpConfig;
  } catch {
    // file not found or parse error
  }
  return undefined;
}

function findMcpServer(
  mcpName: string,
  skills: Array<{ name: string; mcpConfig?: SkillMcpConfig }>,
): { skill: { name: string }; config: MCPServerConfig } | null {
  for (const skill of skills) {
    if (skill.mcpConfig && mcpName in skill.mcpConfig) {
      return { skill, config: skill.mcpConfig[mcpName] };
    }
  }
  return null;
}

// Format a JSONSchema property map into a readable parameter list
function formatToolParams(inputSchema: {
  properties?: Record<string, unknown>;
  required?: string[];
}): string {
  const props = inputSchema.properties;
  if (!props || Object.keys(props).length === 0) return "    (no parameters)";
  const required = new Set(inputSchema.required ?? []);
  return Object.entries(props)
    .map(([key, val]) => {
      const p = val as { type?: string; description?: string };
      const opt = required.has(key) ? "" : "?";
      const type = p.type ?? "any";
      const desc = p.description ? ` — ${p.description}` : "";
      return `    ${key}${opt}: ${type}${desc}`;
    })
    .join("\n");
}

// Discover and format all tools, resources and prompts offered by an MCP server
async function formatServerCapabilities(
  connection: MCPServerConnection,
  skillName: string,
  serverName: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  const { listTools, listResources, listPrompts } = await getMcpModule();

  const [tools, resources, prompts] = await Promise.all([
    listTools(connection, { signal }).catch(() => []),
    listResources(connection, { signal }).catch(() => []),
    listPrompts(connection, { signal }).catch(() => []),
  ]);

  const lines: string[] = [
    `MCP server "${serverName}" (from skill "${skillName}"):`,
    "",
  ];

  // Tools
  lines.push(`Tools (${tools.length}):`);
  if (tools.length === 0) {
    lines.push("  (none)");
  } else {
    for (const tool of tools) {
      lines.push(`  ${tool.name}${tool.description ? ` — ${tool.description}` : ""}`);
      lines.push(formatToolParams(tool.inputSchema));
    }
  }

  // Resources
  lines.push("", `Resources (${resources.length}):`);
  if (resources.length === 0) {
    lines.push("  (none)");
  } else {
    for (const r of resources as Array<{ uri?: string; name?: string; description?: string }>) {
      const id = r.uri ?? r.name ?? "?";
      const desc = r.description ? ` — ${r.description}` : "";
      lines.push(`  ${id}${desc}`);
    }
  }

  // Prompts
  lines.push("", `Prompts (${prompts.length}):`);
  if (prompts.length === 0) {
    lines.push("  (none)");
  } else {
    for (const p of prompts as Array<{ name: string; description?: string }>) {
      lines.push(`  ${p.name}${p.description ? ` — ${p.description}` : ""}`);
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

// ─── Extension ───────────────────────────────────────────────────────────────

export default function skillMcp(pi: ExtensionAPI): void {
  const { Type } = pi.typebox;

  // Connection cache: keyed by "sessionId:skillName:serverName"
  const connections = new Map<string, Promise<MCPServerConnection>>();
  let cachedAuthStorage: Promise<AuthStorage> | null = null;

  async function loadSkillMcpConfigs(cwd: string): Promise<Array<{ name: string; mcpConfig?: SkillMcpConfig }>> {
    const settings = pi.pi.Settings.instance;
    const skillsSettings = settings.getGroup("skills");
    if (skillsSettings?.enabled === false) return [];

    const result = await pi.pi.discoverSkills(cwd, undefined, skillsSettings);

    return Promise.all(
      result.skills.map(async skill => {
        const baseDir = skill.baseDir;
        let mcpConfig = await readSkillMcpJson(baseDir);
        if (!mcpConfig) {
          try {
            const content = await Bun.file(skill.filePath).text();
            mcpConfig = extractSkillMcpConfig(content);
          } catch {
            // ignore
          }
        }
        return { name: skill.name, mcpConfig };
      }),
    );
  }

  async function getConnection(
    sessionId: string,
    skillName: string,
    serverName: string,
    config: MCPServerConfig,
    authStorage: AuthStorage,
    cwd: string,
  ): Promise<MCPServerConnection> {
    const key = `${sessionId}:${skillName}:${serverName}`;
    const existing = connections.get(key);
    if (existing) return existing;

    const { MCPManager } = await getMcpModule();
    const manager = new MCPManager(cwd);
    manager.setAuthStorage(authStorage);

    const promise = (async () => {
      const resolved = await manager.prepareConfig(config);
      const result = await manager.connectServers(
        { [serverName]: resolved },
        { [serverName]: { provider: "skill", providerName: "Skill MCP", path: "skill", level: "user" } },
      );
      if (result.errors.get(serverName)) throw new Error(result.errors.get(serverName));
      return manager.waitForConnection(serverName);
    })();

    connections.set(key, promise);
    return promise;
  }

  const toolParams = Type.Object(
    {
      mcp_name: Type.String({ description: "Name of the MCP server from skill config" }),
      tool_name: Type.Optional(Type.String({ description: "MCP tool to call" })),
      resource_name: Type.Optional(Type.String({ description: "MCP resource URI to read" })),
      prompt_name: Type.Optional(Type.String({ description: "MCP prompt to get" })),
      arguments: Type.Optional(
        Type.Union([Type.String(), Type.Record(Type.String(), Type.Any())], {
          description: "JSON string or object of arguments",
        }),
      ),
      grep: Type.Optional(Type.String({ description: "Regex pattern to filter output lines" })),
    },
    { additionalProperties: false },
  );

  pi.registerTool({
    name: SKILL_MCP_TOOL_NAME,
    label: "Skill MCP",
    description: SKILL_MCP_DESCRIPTION,
    parameters: toolParams,
    execute: async (_toolCallId, args, signal, _onUpdate, ctx) => {
      const skillMcpArgs = args as SkillMcpArgs;
      let operation: OperationType;
      try {
        operation = validateOperationParams(skillMcpArgs);
      } catch (e) {
        return { content: [{ type: "text", text: String(e instanceof Error ? e.message : e) }], isError: true };
      }

      const skills = await loadSkillMcpConfigs(ctx.cwd);
      const found = findMcpServer(skillMcpArgs.mcp_name, skills);

      if (!found) {
        const hint = formatBuiltinMcpHint(skillMcpArgs.mcp_name);
        if (hint) return { content: [{ type: "text", text: hint }], isError: true };
        return {
          content: [
            {
              type: "text",
              text: `MCP server "${skillMcpArgs.mcp_name}" not found.\n\nAvailable MCP servers in loaded skills:\n`
                + formatAvailableMcps(skills)
                + "\n\nHint: Load the skill first, then call skill_mcp.",
            },
          ],
          isError: true,
        };
      }

      // Resolve auth storage (use ctx.modelRegistry, fall back to discoverAuthStorage)
      if (!cachedAuthStorage) {
        cachedAuthStorage = ctx.modelRegistry.authStorage
          ? Promise.resolve(ctx.modelRegistry.authStorage)
          : pi.pi.discoverAuthStorage();
      }
      const authStorage = await cachedAuthStorage;

      const sessionId = ctx.sessionManager.getSessionId();
      const connection = await getConnection(
        sessionId,
        found.skill.name,
        skillMcpArgs.mcp_name,
        found.config,
        authStorage,
        ctx.cwd,
      );

      // Discover mode: no operation specified → list server capabilities
      if (operation === null) {
        try {
          const caps = await formatServerCapabilities(connection, found.skill.name, skillMcpArgs.mcp_name, signal);
          return { content: [{ type: "text", text: applyGrepFilter(caps, skillMcpArgs.grep) }], isError: false };
        } catch (e) {
          return {
            content: [{
              type: "text",
              text: `Error discovering capabilities: ${e instanceof Error ? e.message : String(e)}`,
            }],
            isError: true,
          };
        }
      }

      const parsedArgs = parseArguments(skillMcpArgs.arguments);

      // Import MCP client functions from the public subpath — same instance
      // the host already loaded, Bun module cache ensures no duplication.
      const { callTool, readResource, getPrompt } = await getMcpModule();

      try {
        const output = await (async (): Promise<string> => {
          switch (operation.type) {
            case "tool": {
              const result = await callTool(connection, operation.name, parsedArgs, { signal });
              return JSON.stringify(result, null, 2);
            }
            case "resource": {
              const result = await readResource(connection, operation.name, { signal });
              return JSON.stringify(result, null, 2);
            }
            case "prompt": {
              const stringArgs: Record<string, string> = {};
              for (const [k, v] of Object.entries(parsedArgs)) {
                stringArgs[k] = String(v);
              }
              const result = await getPrompt(connection, operation.name, stringArgs, { signal });
              return JSON.stringify(result, null, 2);
            }
          }
        })();

        return { content: [{ type: "text", text: applyGrepFilter(output, skillMcpArgs.grep) }], isError: false };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error calling MCP: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "skill_mcp_list",
    label: "Skill MCP List",
    description: "List MCP servers defined in loaded skills.",
    parameters: Type.Object({}, { additionalProperties: false }),
    hidden: true,
    execute: async (_toolCallId, _params, _signal, _onUpdate, ctx) => {
      const skills = await loadSkillMcpConfigs(ctx.cwd);
      return {
        content: [{ type: "text", text: `Available MCP servers in loaded skills:\n${formatAvailableMcps(skills)}` }],
        isError: false,
      };
    },
  });

  // Track session for connection cleanup
  let currentSessionId: string | undefined;

  pi.on("session_start", (_event, ctx) => {
    currentSessionId = ctx.sessionManager.getSessionId();
    cachedAuthStorage = Promise.resolve(ctx.modelRegistry.authStorage);
  });

  pi.on("session_switch", (_event, ctx) => {
    currentSessionId = ctx.sessionManager.getSessionId();
    cachedAuthStorage = Promise.resolve(ctx.modelRegistry.authStorage);
  });

  pi.on("session_shutdown", async () => {
    if (!currentSessionId) return;
    // Disconnect servers for current session
    const sessionPrefix = `${currentSessionId}:`;
    for (const key of connections.keys()) {
      if (!key.startsWith(sessionPrefix)) continue;
      const serverName = key.split(":")[2];
      if (!serverName) continue;
      const connPromise = connections.get(key);
      if (!connPromise) continue;
      try {
        const conn = await connPromise;
        const { disconnectServer } = await getMcpModule();
        await disconnectServer(conn).catch(() => {});
      } catch {
        // best effort cleanup
      } finally {
        connections.delete(key);
      }
    }
  });
}
