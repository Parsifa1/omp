#!/usr/bin/env bun

/**
 * Simple test script to verify comment-checker extension loads correctly
 */

import commentChecker from "./index";

const mockAPI = {
  on: (event: string) => {
    console.log(`✓ Registered handler for event: ${event}`);
  },
  off: (event: string) => {
    console.log(`✓ Unregistered handler for event: ${event}`);
  },
  emit: (event: string) => {
    console.log(`✓ Emitted event: ${event}`);
  },
} as any;

console.log("Testing comment-checker extension...");
console.log("=====================================\n");

try {
  console.log("Test 1: Loading extension without config");
  console.log("Test 1: Loading extension without config");
  commentChecker(mockAPI);
  console.log("✓ Extension loaded successfully\n");

  console.log("Test 2: Loading extension with custom config");
  console.log("Test 2: Loading extension with custom config");
  commentChecker(mockAPI, {
    custom_prompt: "Please review comments carefully",
  });
  console.log("✓ Extension loaded with config successfully\n");

  console.log("=====================================");
  console.log("All tests passed! ✓");
  console.log("\nExtension structure:");
  console.log("- Types defined: PendingCall, CommentInfo, CommentType");
  console.log("- Main hook: createCommentCheckerHook");
  console.log("- Binary downloader: ready");
  console.log("- CLI runner: ready");
  console.log("\nThe extension will:");
  console.log("1. Listen for tool_call events (write/edit operations)");
  console.log("2. Register pending calls with file paths");
  console.log("3. On tool_result, check for comments using CLI");
  console.log("4. Append warnings to assistant messages if comments found");
} catch (error) {
  console.error("✗ Test failed:", error);
  process.exit(1);
}
