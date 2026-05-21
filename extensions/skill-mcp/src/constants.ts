export const SKILL_MCP_TOOL_NAME = "skill_mcp";

export const SKILL_MCP_DESCRIPTION = `Use this tool ONLY for MCP servers declared inside loaded skills (skill-embedded MCPs).

- DO NOT use it for normal skills. To use a skill, read its SKILL.md instructions and follow them; do not pass the skill name as mcp_name.
- DO NOT use it for builtin/native tools or internal URIs like memory://, skill://, issue://, pr://, or local files; use the corresponding native tool directly.
- Omit all parameters to list MCP servers currently exposed by loaded skills.
- Provide mcp_name only to inspect that skill MCP server's tools, resources, and prompts.
- Provide mcp_name plus exactly one of tool_name, resource_name, or prompt_name to perform one operation on that skill MCP server.`;

export const BUILTIN_MCP_TOOL_HINTS: Record<string, string[]> = {
  context7: ["mcp_context7_resolve_library_id", "mcp_context7_query_docs"],
  exa: ["exa_search", "exa_researcher_start", "exa_researcher_check"],
  "grep-app": ["mcp_grep_app_searchgithub"],
};
