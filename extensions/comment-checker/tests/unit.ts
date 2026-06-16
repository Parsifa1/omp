#!/usr/bin/env bun

/**
 * Simple test script to verify comment-checker extension loads correctly
 */

import commentChecker from "../index";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const mockAPI = {
  on: (event: string) => {
    console.log(`[ok] Registered handler for event: ${event}`);
  },
  off: (event: string) => {
    console.log(`[ok] Unregistered handler for event: ${event}`);
  },
  emit: (event: string) => {
    console.log(`[ok] Emitted event: ${event}`);
  },
} as unknown as ExtensionAPI;

console.log("Testing comment-checker extension...");
console.log("=====================================\n");

try {
  console.log("Test 1: Loading extension without config");
  commentChecker(mockAPI);
  console.log("[ok] Extension loaded successfully\n");

  console.log("Test 2: Loading extension with custom config");
  commentChecker(mockAPI, {
    custom_prompt: "Please review comments carefully",
  });
  console.log("[ok] Extension loaded with config successfully\n");

  console.log("=====================================");
  console.log("All tests passed!");
} catch (error) {
  console.error("[fail] Test failed:", error);
  process.exit(1);
}
