import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";

import { parseArguments, validateOperationParams } from "./args";
import { formatServerCapabilities } from "./capabilities";
import { SKILL_MCP_DESCRIPTION, SKILL_MCP_TOOL_NAME } from "./constants";
import { applyGrepFilter, formatBuiltinMcpHint, toAvailableMcpList } from "./format";
import { findMcpServer, loadSkillMcpConfigs } from "./skill-config";
import type { MCPServerConfig, MCPServerConnection, SkillMcpArgs } from "./types";

function getTypeFactory(pi: ExtensionAPI): {
  Object: (...args: unknown[]) => unknown;
  Optional: (...args: unknown[]) => unknown;
  String: (...args: unknown[]) => unknown;
  Union: (...args: unknown[]) => unknown;
  Record: (...args: unknown[]) => unknown;
  Any: (...args: unknown[]) => unknown;
} {
  const typeboxModule = pi.typebox as unknown as {
    Type?: {
      Object: (...args: unknown[]) => unknown;
      Optional: (...args: unknown[]) => unknown;
      String: (...args: unknown[]) => unknown;
      Union: (...args: unknown[]) => unknown;
      Record: (...args: unknown[]) => unknown;
      Any: (...args: unknown[]) => unknown;
    };
    Object?: (...args: unknown[]) => unknown;
    Optional?: (...args: unknown[]) => unknown;
    String?: (...args: unknown[]) => unknown;
    Union?: (...args: unknown[]) => unknown;
    Record?: (...args: unknown[]) => unknown;
    Any?: (...args: unknown[]) => unknown;
  };
  if (typeboxModule.Type) return typeboxModule.Type;
  return {
    Object: typeboxModule.Object!,
    Optional: typeboxModule.Optional!,
    String: typeboxModule.String!,
    Union: typeboxModule.Union!,
    Record: typeboxModule.Record!,
    Any: typeboxModule.Any!,
  };
}

function connectionKey(sessionId: string, skillName: string, serverName: string): string {
  return `${sessionId}:${skillName}:${serverName}`;
}

export function registerSkillMcpTool(pi: ExtensionAPI): void {
  const Type = getTypeFactory(pi);
  const connections = new Map<string, Promise<MCPServerConnection>>();
  let cachedAuthStorage: Promise<AuthStorage> | null = null;
  let currentSessionId: string | undefined;

  async function getConnection(
    sessionId: string,
    skillName: string,
    serverName: string,
    config: MCPServerConfig,
    authStorage: AuthStorage,
    cwd: string,
  ): Promise<MCPServerConnection> {
    const key = connectionKey(sessionId, skillName, serverName);
    const existing = connections.get(key);
    if (existing) return existing;

    const promise = (async () => {
      const { MCPManager } = await import("@oh-my-pi/pi-coding-agent/mcp");
      const manager = new MCPManager(cwd);
      manager.setAuthStorage(authStorage);
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
      mcp_name: Type.Optional(Type.String({ description: "Name of the MCP server from skill config" })),
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
    parameters: toolParams as never,
    execute: async (_toolCallId, args, signal, _onUpdate, ctx) => {
      const skillMcpArgs = args as SkillMcpArgs;
      let operation;
      try {
        operation = validateOperationParams(skillMcpArgs);
      } catch (error) {
        return { content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }], isError: true };
      }

      const skills = await loadSkillMcpConfigs(pi, ctx.cwd);

      if (!skillMcpArgs.mcp_name) {
        return {
          content: [{ type: "text", text: applyGrepFilter(toAvailableMcpList(skills), skillMcpArgs.grep) }],
          isError: false,
        };
      }

      const found = findMcpServer(skillMcpArgs.mcp_name, skills);
      if (!found) {
        const hint = formatBuiltinMcpHint(skillMcpArgs.mcp_name);
        if (hint) return { content: [{ type: "text", text: hint }], isError: true };
        return {
          content: [{
            type: "text",
            text: `MCP server "${skillMcpArgs.mcp_name}" not found.\n\n${toAvailableMcpList(skills)}\n\nHint: Load the skill first, then call skill_mcp.`,
          }],
          isError: true,
        };
      }

      if (operation === null) {
        try {
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
          const capabilities = await formatServerCapabilities(connection, found.skill.name, skillMcpArgs.mcp_name, signal);
          return { content: [{ type: "text", text: applyGrepFilter(capabilities, skillMcpArgs.grep) }], isError: false };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error discovering capabilities: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      }

      let parsedArgs: Record<string, unknown>;
      try {
        parsedArgs = parseArguments(skillMcpArgs.arguments);
      } catch (error) {
        return { content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }], isError: true };
      }

      try {
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

        const { callTool, getPrompt, readResource } = await import("@oh-my-pi/pi-coding-agent/mcp");
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
              for (const [key, value] of Object.entries(parsedArgs)) {
                stringArgs[key] = String(value);
              }
              const result = await getPrompt(connection, operation.name, stringArgs, { signal });
              return JSON.stringify(result, null, 2);
            }
          }
        })();

        return { content: [{ type: "text", text: applyGrepFilter(output, skillMcpArgs.grep) }], isError: false };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error calling MCP: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  });

  const updateCachedAuthStorage = (ctx: { modelRegistry: { authStorage?: AuthStorage } }) => {
    if (ctx.modelRegistry.authStorage) {
      cachedAuthStorage = Promise.resolve(ctx.modelRegistry.authStorage);
    }
  };

  pi.on("session_start", (_event, ctx) => {
    currentSessionId = ctx.sessionManager.getSessionId();
    updateCachedAuthStorage(ctx);
  });

  pi.on("session_switch", (_event, ctx) => {
    currentSessionId = ctx.sessionManager.getSessionId();
    updateCachedAuthStorage(ctx);
  });

  pi.on("session_shutdown", async () => {
    if (!currentSessionId) return;
    const sessionPrefix = `${currentSessionId}:`;
    for (const key of connections.keys()) {
      if (!key.startsWith(sessionPrefix)) continue;
      const connectionPromise = connections.get(key);
      if (!connectionPromise) continue;
      try {
        const connection = await connectionPromise;
        const { disconnectServer } = await import("@oh-my-pi/pi-coding-agent/mcp");
        await disconnectServer(connection).catch(() => {});
      } catch {
      } finally {
        connections.delete(key);
      }
    }
  });
}
