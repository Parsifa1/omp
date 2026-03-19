export const SKILL_MCP_TOOL_NAME = "skill_mcp";

export const SKILL_MCP_DESCRIPTION = `Invoke MCP server operations from skill-embedded MCPs.

- Omit all parameters to list MCP servers defined in loaded skills.
- Provide mcp_name only to discover that server's tools, resources, and prompts.
- Provide mcp_name plus exactly one of tool_name, resource_name, or prompt_name to perform an operation.`;

export const BUILTIN_MCP_TOOL_HINTS: Record<string, string[]> = {
  context7: ["mcp_context7_resolve_library_id", "mcp_context7_query_docs"],
  exa: ["exa_search", "exa_researcher_start", "exa_researcher_check"],
  "grep-app": ["mcp_grep_app_searchgithub"],
};
