import type { SkillMcpArgs, SkillMcpOperation } from "./types";

export function validateOperationParams(args: SkillMcpArgs): SkillMcpOperation {
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

  if (!args.mcp_name && operations.length === 1) {
    throw new Error("mcp_name is required when tool_name, resource_name, or prompt_name is provided.");
  }

  return operations[0] ?? null;
}

export function parseArguments(argsJson: string | Record<string, unknown> | undefined): Record<string, unknown> {
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
