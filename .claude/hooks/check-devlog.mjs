#!/usr/bin/env node
// Stop hook: enforce the dev-log discipline.
// If files changed this turn but agent_docs/dev_log.md wasn't touched,
// block the stop and remind the agent to log before finishing.
//
// Registered via .claude/settings.json -> hooks.Stop.
// Node is required by Claude Code, so no extra dependency (no jq).

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const LOG = "agent_docs/dev_log.md";

// Parse the Stop-hook payload from stdin.
let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  // malformed payload — fail open (never block on our own bug)
}

// Loop guard: once we're already continuing because of this hook, allow the stop.
// Without this the session can loop. (Claude Code also caps consecutive blocks.)
if (input.stop_hook_active) process.exit(0);

// Inspect the working tree. If this isn't a git repo, don't interfere.
let porcelain = "";
try {
  porcelain = execSync("git status --porcelain", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  process.exit(0);
}

const files = porcelain
  .split("\n")
  .map((line) => line.slice(3).trim()) // strip the "XY " status prefix
  .filter(Boolean);

const logTouched = files.some((f) => f.endsWith("dev_log.md"));
const codeChanged = files.some((f) => !f.endsWith("dev_log.md"));

// Code changed but the log didn't -> block and tell the agent to log.
if (codeChanged && !logTouched) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        `Files changed this turn but ${LOG} was not updated. ` +
        `Per agent_docs/workflow.md (step 4), append a What / Why / How entry ` +
        `(newest on top) to ${LOG}, then finish.`,
    })
  );
}

process.exit(0);
