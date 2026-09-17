/**
 * Adventure World - Unified Test Runner
 * Executes both Unit Tests and Real Browser E2E suite.
 */

import { execSync } from "child_process";

console.log("==========================================");
console.log("  ADVENTURE WORLD - FULL TEST RUNNER      ");
console.log("==========================================\n");

console.log("Step 1: Running unit tests...");
execSync("node tests/unit-tests.js", { stdio: "inherit" });

console.log("\nStep 2: Running real Chrome browser E2E tests...");
execSync("node tests/browser-e2e.js", { stdio: "inherit" });

console.log("\n==========================================");
console.log("  ALL TESTS COMPLETED SUCCESSFULLY!       ");
console.log("==========================================");
