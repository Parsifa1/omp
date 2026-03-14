import type { ImageContent, TextContent } from "@oh-my-pi/pi-ai";
import type { ExtensionAPI, ToolCallEvent, ToolResultEvent, ToolResultEventResult } from "@oh-my-pi/pi-coding-agent";
import type { PendingCall } from "./types";

import {
  getCommentCheckerCliPathPromise,
  initializeCommentCheckerCli,
  isCliPathUsable,
  processApplyPatchEditsWithCli,
  processWithCli,
} from "./cli-runner";
import { registerPendingCall, startPendingCallCleanup, takePendingCall } from "./pending-calls";

import * as fs from "fs";
import { tmpdir } from "os";
import { join } from "path";

const DEBUG = process.env.COMMENT_CHECKER_DEBUG === "1";
const DEBUG_FILE = join(tmpdir(), "comment-checker-debug.log");

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    const msg = `[${new Date().toISOString()}] [comment-checker:hook] ${
      args
        .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
        .join(" ")
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
    return [
      ...content.slice(0, -1),
      { type: "text" as const, text: `${lastText.text}\n\n${message}` },
    ];
  }
  return [...content, { type: "text" as const, text: message }];
}

export function createCommentCheckerHook(api: ExtensionAPI, config?: CommentCheckerConfig) {
  debugLog("createCommentCheckerHook called", { config });

  startPendingCallCleanup();
  initializeCommentCheckerCli(debugLog);

  // Subscribe to tool_call (before execution)
  api.on("tool_call", async (event: ToolCallEvent) => {
    debugLog("tool_call:", {
      toolName: event.toolName,
      toolCallId: event.toolCallId,
      input: event.input,
    });

    const toolLower = event.toolName.toLowerCase();
    if (toolLower !== "write" && toolLower !== "edit" && toolLower !== "multiedit") {
      debugLog("skipping non-write/edit tool:", toolLower);
      return;
    }

    // Type assertion for input - TypeScript can't narrow the union type automatically
    const input = event.input as Record<string, unknown>;
    const filePath = (input.filePath
      ?? input.file_path
      ?? input.path) as string | undefined;
    const content = input.content as string | undefined;
    const oldString = (input.oldString ?? input.old_string) as string | undefined;
    const newString = (input.newString ?? input.new_string) as string | undefined;
    const edits = input.edits as Array<{ old_string: string; new_string: string }> | undefined;

    debugLog("extracted filePath:", filePath);

    if (!filePath) {
      debugLog("no filePath found");
      return;
    }

    // Get sessionID from somewhere - for now use a placeholder
    const sessionID = "default-session";

    debugLog("registering pendingCall:", {
      callID: event.toolCallId,
      filePath,
      tool: toolLower,
    });
    registerPendingCall(event.toolCallId, {
      filePath,
      content,
      oldString,
      newString,
      edits,
      tool: toolLower as PendingCall["tool"],
      sessionID,
      timestamp: Date.now(),
    });
  });

  // Subscribe to tool_result (after execution)
  api.on("tool_result", async (event: ToolResultEvent): Promise<ToolResultEventResult | void> => {
    debugLog("tool_result:", { toolName: event.toolName, toolCallId: event.toolCallId });

    const toolLower = event.toolName.toLowerCase();

    // Skip if tool execution failed
    if (event.isError) {
      debugLog("skipping due to tool error");
      return;
    }

    const outputText = getTextContent(event.content as any);
    const outputLower = outputText.toLowerCase();
    const isToolFailure = outputLower.includes("error:")
      || outputLower.includes("failed to")
      || outputLower.includes("could not")
      || outputLower.startsWith("error");

    if (isToolFailure) {
      debugLog("skipping due to tool failure in output");
      return;
    }

    // Handle apply_patch specially if we detect it
    // Note: oh-my-pi might not have apply_patch, but keeping for compatibility
    if (toolLower === "apply_patch" && event.details) {
      try {
        const metadata = event.details as any;
        if (metadata.files && Array.isArray(metadata.files)) {
          const edits = metadata.files
            .filter((f: any) => f.type !== "delete")
            .map((f: any) => ({
              filePath: f.movePath ?? f.filePath,
              before: f.before,
              after: f.after,
            }));

          if (edits.length === 0) {
            debugLog("apply_patch had no editable files, skipping");
            return;
          }

          const cliPath = await getCommentCheckerCliPathPromise();
          if (!isCliPathUsable(cliPath)) {
            debugLog("CLI not available, skipping comment check");
            return;
          }

          debugLog("using CLI for apply_patch:", cliPath);
          const output = { output: outputText };
          await processApplyPatchEditsWithCli(
            "default-session",
            edits,
            output,
            cliPath,
            config?.custom_prompt,
            debugLog,
          );

          if (output.output !== outputText) {
            return {
              content: appendToContent(event.content as any, output.output.slice(outputText.length)),
            };
          }
        }
      } catch (err) {
        debugLog("apply_patch comment check failed:", err);
      }
      return;
    }

    const pendingCall = takePendingCall(event.toolCallId);
    if (!pendingCall) {
      debugLog("no pendingCall found for:", event.toolCallId);
      return;
    }

    debugLog("processing pendingCall:", pendingCall);

    try {
      const cliPath = await getCommentCheckerCliPathPromise();
      if (!isCliPathUsable(cliPath)) {
        debugLog("CLI not available, skipping comment check");
        return;
      }

      debugLog("using CLI:", cliPath);
      const output = { output: outputText };
      await processWithCli(
        { tool: event.toolName, sessionID: pendingCall.sessionID, callID: event.toolCallId },
        pendingCall,
        output,
        cliPath,
        config?.custom_prompt,
        debugLog,
      );

      if (output.output !== outputText) {
        // Comments were detected and message was appended
        return {
          content: appendToContent(event.content as any, output.output.slice(outputText.length)),
        };
      }
    } catch (err) {
      debugLog("tool_result processing failed:", err);
    }
  });
}
