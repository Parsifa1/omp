import type { MCPServerConfig, MCPServerConnection } from "@oh-my-pi/pi-coding-agent/mcp";

export interface SkillMcpArgs {
  mcp_name?: string;
  tool_name?: string;
  resource_name?: string;
  prompt_name?: string;
  arguments?: string | Record<string, unknown>;
  grep?: string;
}

export type SkillMcpOperation =
  | { type: "tool" | "resource" | "prompt"; name: string }
  | null;

export type SkillMcpConfig = Record<string, MCPServerConfig>;

export interface SkillWithMcpConfig {
  name: string;
  mcpConfig?: SkillMcpConfig;
}

export interface SkillMcpConnectionKey {
  sessionId: string;
  skillName: string;
  serverName: string;
}

export type { MCPServerConfig, MCPServerConnection };
