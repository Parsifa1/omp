#!/usr/bin/env bun

/**
 * Test runner for comment-checker extension
 * Runs both unit and integration tests
 */

import { spawnSync } from "bun";

console.log("Running Comment Checker Tests\n");
console.log("=".repeat(60));

console.log("\nUnit Tests (Extension Loading)");
console.log("-".repeat(60));
const unitResult = spawnSync(["bun", "run", "unit.ts"], {
  cwd: import.meta.dir,
  stdout: "inherit",
  stderr: "inherit",
});

if (unitResult.exitCode !== 0) {
  console.error("\nUnit tests failed");
  process.exit(1);
}

console.log("\nIntegration Tests (Comment Detection)");
console.log("-".repeat(60));
const integrationResult = spawnSync(["bun", "run", "integration.ts"], {
  cwd: import.meta.dir,
  stdout: "inherit",
  stderr: "inherit",
});

if (integrationResult.exitCode !== 0) {
  console.error("\nIntegration tests failed");
  process.exit(1);
}

console.log("\n" + "=".repeat(60));
console.log("All tests passed!");
console.log("=".repeat(60));
