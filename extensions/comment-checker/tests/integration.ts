#!/usr/bin/env bun

/**
 * Integration test: simulate real tool_result events and verify comment detection
 */

import { createCommentCheckerHook } from "../hook";
import type { ExtensionAPI, ToolResultEvent } from "@oh-my-pi/pi-coding-agent";

let capturedResult: { content?: unknown } | undefined;

const mockAPI = {
  on: (event: string, handler: (evt: ToolResultEvent) => Promise<unknown>) => {
    if (event === "tool_result") {
      (mockAPI as any)._toolResultHandler = handler;
    }
  },
} as unknown as ExtensionAPI;

createCommentCheckerHook(mockAPI);

const handler = (mockAPI as any)._toolResultHandler;
if (!handler) {
  console.error("[fail] No tool_result handler registered");
  process.exit(1);
}

console.log("Testing comment-checker integration...");
console.log("========================================\n");

console.log("Test 1: Write tool with comment in content");
const writeEvent: ToolResultEvent = {
  type: "tool_result",
  toolName: "write",
  toolCallId: "call-1",
  input: {
    path: "/tmp/test.py",
    content: "# this is a comment\ndef foo():\n    pass\n",
  },
  content: [{ type: "text", text: "Successfully wrote to /tmp/test.py" }],
  isError: false,
  details: undefined,
};

capturedResult = await handler(writeEvent);
if (capturedResult?.content) {
  console.log("[ok] Comment detected in write operation");
  const textContent = (capturedResult.content as any[]).find((c: any) => c.type === "text");
  if (textContent?.text?.includes("COMMENT/DOCSTRING DETECTED")) {
    console.log("[ok] Warning message appended correctly\n");
  } else {
    console.error("[fail] Warning message not found in result");
    process.exit(1);
  }
} else {
  console.error("[fail] No result returned for write with comment");
  process.exit(1);
}

console.log("Test 2: Edit tool (single-file) with comment");
// Real hashline single-file shape: details has NO path and NO newText, only a
// numbered `diff`. Path is recovered from the `[PATH#TAG]` header in input.input.
const editEvent: ToolResultEvent = {
  type: "tool_result",
  toolName: "edit",
  toolCallId: "call-2",
  input: { input: "[/tmp/test.ts#ABCD]\nINS.POST 1:\n+// added comment" },
  content: [{ type: "text", text: "[/tmp/test.ts#EFGH]\n..." }],
  isError: false,
  details: {
    diff: " 1|const x = 1;\n+2|// added comment\n 2|const y = 2;",
    firstChangedLine: 2,
    op: "update",
  },
};

capturedResult = await handler(editEvent);
if (capturedResult?.content) {
  console.log("[ok] Comment detected in edit operation");
  const textContent = (capturedResult.content as any[]).find((c: any) => c.type === "text");
  if (textContent?.text?.includes("COMMENT/DOCSTRING DETECTED")) {
    console.log("[ok] Warning message appended correctly\n");
  } else {
    console.error("[fail] Warning message not found in result");
    process.exit(1);
  }
} else {
  console.error("[fail] No result returned for edit with comment");
  process.exit(1);
}

console.log("Test 3: Edit tool changing only code, with a pre-existing comment in context");
// The file already has `// legacy note`; this edit only changes B's value.
// The old comment appears as a context row (` ` prefix) and must NOT be reported.
const cleanEditEvent: ToolResultEvent = {
  type: "tool_result",
  toolName: "edit",
  toolCallId: "call-3",
  input: { input: "[/tmp/test_clean.ts#ABCD]\nSWAP 2.=2:\n+const B = 99;" },
  content: [{ type: "text", text: "[/tmp/test_clean.ts#IJKL]\n..." }],
  isError: false,
  details: {
    diff: " 1|// legacy note\n-2|const B = 2;\n+2|const B = 99;",
    firstChangedLine: 2,
    op: "update",
  },
};

capturedResult = await handler(cleanEditEvent);
if (!capturedResult) {
  console.log("[ok] No warning for clean code (correct)\n");
} else {
  console.error("[fail] Unexpected result for clean code");
  process.exit(1);
}

console.log("Test 4: Multi-file edit with mixed comments");
// Real multi-file hashline shape: each perFileResult has path + numbered diff,
// no newText. file1 adds only code; file2 adds a `# TODO` comment.
const multiFileEvent: ToolResultEvent = {
  type: "tool_result",
  toolName: "edit",
  toolCallId: "call-4",
  input: { input: "[/tmp/file1.py#AAAA]\n...\n[/tmp/file2.py#BBBB]\n..." },
  content: [{ type: "text", text: "Edited 2 files..." }],
  isError: false,
  details: {
    diff: "...",
    perFileResults: [
      {
        path: "/tmp/file1.py",
        op: "update",
        diff: "+1|def foo():\n+2|    pass",
      },
      {
        path: "/tmp/file2.py",
        op: "update",
        diff: "+1|# TODO: implement\n+2|def bar():\n+3|    pass",
      },
    ],
  },
};

capturedResult = await handler(multiFileEvent);
if (capturedResult?.content) {
  console.log("[ok] Comment detected in multi-file edit");
  const textContent = (capturedResult.content as any[]).find((c: any) => c.type === "text");
  if (textContent?.text?.includes("COMMENT/DOCSTRING DETECTED")) {
    console.log("[ok] Warning message appended correctly\n");
  } else {
    console.error("[fail] Warning message not found in result");
    process.exit(1);
  }
} else {
  console.error("[fail] No result returned for multi-file edit with comment");
  process.exit(1);
}

console.log("========================================");
console.log("All integration tests passed!");
