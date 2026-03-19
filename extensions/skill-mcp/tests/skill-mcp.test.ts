import { describe, expect, test } from "bun:test";

import skillMcpExtension from "../index";

type ToolRegistration = {
  name: string;
  description: string;
  hidden?: boolean;
  execute: (toolCallId: string, args: unknown, signal: AbortSignal | undefined, onUpdate: unknown, ctx: TestContext) => Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }>;
};

type TestContext = {
  cwd: string;
  modelRegistry: { authStorage?: unknown };
  sessionManager: { getSessionId(): string };
};

function createTypeboxStub() {
  return {
    String: (options?: Record<string, unknown>) => ({ kind: "string", ...options }),
    Optional: (schema: unknown) => ({ kind: "optional", schema }),
    Union: (schemas: unknown[], options?: Record<string, unknown>) => ({ kind: "union", schemas, ...options }),
    Record: (_key: unknown, value: unknown) => ({ kind: "record", value }),
    Any: () => ({ kind: "any" }),
    Object: (properties: Record<string, unknown>, options?: Record<string, unknown>) => ({ kind: "object", properties, ...options }),
  };
}

function createSkillsSettings(enabled = true) {
  return {
    enabled,
    getGroup(group: string) {
      if (group !== "skills") throw new Error(`Unexpected settings group: ${group}`);
      return { enabled };
    },
  };
}

function createApi(skills: Array<{ name: string; baseDir: string; filePath: string }>) {
  const tools = new Map<string, ToolRegistration>();
  const sessionHandlers = new Map<string, (event: unknown, ctx: TestContext) => void | Promise<void>>();
  const settings = createSkillsSettings();

  const api = {
    typebox: createTypeboxStub(),
    pi: {
      Settings: { instance: settings },
      discoverSkills: async () => ({ skills }),
      discoverAuthStorage: async () => ({ source: "discovered" }),
    },
    registerTool(tool: ToolRegistration) {
      tools.set(tool.name, tool);
    },
    on(event: string, handler: (event: unknown, ctx: TestContext) => void | Promise<void>) {
      sessionHandlers.set(event, handler);
    },
  };

  skillMcpExtension(api as never);

  return {
    api,
    tools,
    sessionHandlers,
  };
}

function createContext(cwd: string): TestContext {
  return {
    cwd,
    modelRegistry: {},
    sessionManager: {
      getSessionId: () => "session-1",
    },
  };
}

describe("skill_mcp extension", () => {
  test("registers only unified skill_mcp tool", () => {
    const { tools } = createApi([]);

    expect([...tools.keys()]).toEqual(["skill_mcp"]);
  });

  test("lists available MCP servers when called with empty args", async () => {
    const { tools } = createApi([
      { name: "agentation-on-demand", baseDir: "/tmp/agentation-on-demand", filePath: "/tmp/agentation-on-demand/SKILL.md" },
      { name: "firefox-devtools", baseDir: "/tmp/firefox-devtools", filePath: "/tmp/firefox-devtools/SKILL.md" },
    ]);
    const tool = tools.get("skill_mcp");

    expect(tool).toBeDefined();

    const result = await tool!.execute("tool-1", {}, undefined, undefined, createContext(process.cwd()));

    expect(result.isError).toBeFalse();
    expect(result.content[0]?.text).toContain('Available MCP servers in loaded skills:');
  });

  test("requires mcp_name when invoking a concrete operation", async () => {
    const { tools } = createApi([]);
    const tool = tools.get("skill_mcp");

    const result = await tool!.execute(
      "tool-1",
      { tool_name: "agentation_list_sessions" },
      undefined,
      undefined,
      createContext(process.cwd()),
    );

    expect(result.isError).toBeTrue();
    expect(result.content[0]?.text).toContain("mcp_name is required");
  });
});
