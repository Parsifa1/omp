import type { ImageContent, TextContent } from "@oh-my-pi/pi-ai";
import type { ExtensionAPI, ToolResultEvent, ToolResultEventResult } from "@oh-my-pi/pi-coding-agent";

import { runCommentChecker, getCommentCheckerPath } from "./cli";

import * as fs from "fs";
import { tmpdir } from "os";
import { join } from "path";

const DEBUG = process.env.COMMENT_CHECKER_DEBUG === "1";
const DEBUG_FILE = join(tmpdir(), "comment-checker-debug.log");

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    const msg = `[${new Date().toISOString()}] [comment-checker:hook] ${
      args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ")
    }\n`;
    fs.appendFileSync(DEBUG_FILE, msg);
  }
}

export interface CommentCheckerConfig {
  custom_prompt?: string;
}

function getTextContent(content: Array<TextContent | ImageContent>): string {
  return content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

function appendToContent(
  content: Array<TextContent | ImageContent>,
  message: string,
): Array<TextContent | ImageContent> {
  const lastText = content.findLast((c): c is TextContent => c.type === "text");
  if (lastText && lastText.text) {
    return [...content.slice(0, -1), { type: "text" as const, text: `${lastText.text}\n\n${message}` }];
  }
  return [...content, { type: "text" as const, text: message }];
}

/** EditToolPerFileResult shape (subset needed for extraction) */
interface EditFileResult {
  path: string;
  diff?: string;
  op?: string;
}

/** EditToolDetails shape (subset needed for extraction) */
interface EditDetails {
  path?: string;
  diff?: string;
  op?: string;
  perFileResults?: EditFileResult[];
}

/** WriteToolInput shape (subset) */
interface WriteInput {
  path?: string;
  content?: string;
}

/** A single file's changed content, expressed as the slice the CLI's Edit mode diffs. */
interface TouchedFile {
  path: string;
  oldString: string;
  newString: string;
}

/**
 * Split a hashline edit diff into the removed/added line slices.
 * Diff rows are `${prefix}${lineNum}|${content}` (see generateDiffString):
 * `+` rows are the post-edit additions, `-` rows the pre-edit removals,
 * ` ` context rows are dropped. Feeding both slices to the CLI's Edit mode
 * lets it report only comments new to this change, not pre-existing ones.
 */
function splitDiffToOldNew(diff: string): { oldString: string; newString: string } {
  const oldLines: string[] = [];
  const newLines: string[] = [];
  for (const line of diff.split("\n")) {
    const match = /^([+\- ])\d+\|(.*)$/.exec(line);
    if (!match) continue;
    const [, prefix, content] = match;
    if (prefix === "+") newLines.push(content);
    else if (prefix === "-") oldLines.push(content);
  }
  return { oldString: oldLines.join("\n"), newString: newLines.join("\n") };
}

/**
 * Extract files touched by a write/edit operation as Edit-mode diff slices.
 * Write: full content lands in `newString` (no prior content to diff against).
 * Edit (hashline): pulls the unified `diff` from details — single-file from
 * `details.diff` (path from `details.path`, falling back to the `[PATH#TAG]`
 * header in the patch input), multi-file from `perFileResults`. Skips deletes
 * and empty diffs.
 */
function extractTouchedFiles(
  toolName: string,
  input: Record<string, unknown>,
  details: unknown,
): TouchedFile[] {
  const results: TouchedFile[] = [];

  if (toolName === "write") {
    const writeInput = input as WriteInput;
    const { path, content } = writeInput;
    if (typeof path === "string" && typeof content === "string") {
      results.push({ path, oldString: "", newString: content });
    }
    return results;
  }

  if (toolName === "edit") {
    const editDetails = details as EditDetails | undefined;
    if (!editDetails) return results;

    // Multi-file edit: each perFileResult carries its own path + diff.
    if (editDetails.perFileResults && editDetails.perFileResults.length > 0) {
      for (const fileResult of editDetails.perFileResults) {
        if (fileResult.op === "delete" || !fileResult.diff) continue;
        const { oldString, newString } = splitDiffToOldNew(fileResult.diff);
        results.push({ path: fileResult.path, oldString, newString });
      }
      return results;
    }

    // Single-file edit: details omits the path in hashline mode, so recover it
    // from the first `[PATH#TAG]` header in the patch input.
    if (editDetails.op === "delete" || !editDetails.diff) return results;
    const inputText = typeof input.input === "string" ? input.input : "";
    const headerMatch = /^\[(.+)#[0-9A-Fa-f]{4}\]$/m.exec(inputText);
    const path = editDetails.path ?? headerMatch?.[1];
    if (!path) return results;
    const { oldString, newString } = splitDiffToOldNew(editDetails.diff);
    results.push({ path, oldString, newString });
    return results;
  }

  return results;
}

export function createCommentCheckerHook(api: ExtensionAPI, config?: CommentCheckerConfig) {
  debugLog("createCommentCheckerHook called", { config });

  // Trigger background CLI initialization (download if needed)
  void getCommentCheckerPath();

  // Subscribe to tool_result (after execution)
  api.on("tool_result", async (event: ToolResultEvent): Promise<ToolResultEventResult | void> => {
    debugLog("tool_result:", { toolName: event.toolName, toolCallId: event.toolCallId });

    const toolLower = event.toolName.toLowerCase();

    // Only process write and edit tools
    if (toolLower !== "write" && toolLower !== "edit") {
      debugLog("skipping non-write/edit tool:", toolLower);
      return;
    }

    // Skip if tool execution failed (use structured isError, not heuristics)
    if (event.isError) {
      debugLog("skipping due to tool error");
      return;
    }

    // Extract files touched by this operation
    const files = extractTouchedFiles(toolLower, event.input, event.details);
    if (files.length === 0) {
      debugLog("no files to check (likely delete operation or missing details)");
      return;
    }

    debugLog(`checking ${files.length} file(s):`, files.map((f) => f.path));

    // Get CLI path (may trigger lazy download on first call)
    const cliPath = await getCommentCheckerPath();
    if (!cliPath) {
      debugLog("CLI not available, skipping comment check");
      return;
    }

    debugLog("using CLI:", cliPath);

    // Check each file for comments
    const warnings: string[] = [];
    for (const file of files) {
      try {
        const result = await runCommentChecker(
          {
            session_id: "default-session",
            // Both write and edit feed the CLI's Edit mode: old_string/new_string
            // are the pre/post slices of the change, so the CLI reports only
            // comments introduced by this operation. For write, oldString is
            // empty, so every comment in the new content counts as new.
            tool_name: "Edit",
            transcript_path: "",
            cwd: process.cwd(),
            hook_event_name: "PostToolUse",
            tool_input: {
              file_path: file.path,
              old_string: file.oldString,
              new_string: file.newString,
            },
          },
          cliPath,
          config?.custom_prompt,
        );

        if (result.hasComments && result.message) {
          debugLog(`comments detected in ${file.path}`);
          warnings.push(result.message);
        }
      } catch (err) {
        debugLog(`comment check failed for ${file.path}:`, err);
        // Continue checking other files even if one fails
      }
    }

    // Append warnings if any comments were detected
    if (warnings.length > 0) {
      const combinedWarning = warnings.join("\n\n---\n\n");
      debugLog("appending combined warning to tool result");
      return {
        content: appendToContent(event.content, combinedWarning),
      };
    }

    debugLog("no comments detected");
  });
}
