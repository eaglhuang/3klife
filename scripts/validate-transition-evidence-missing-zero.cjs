const { spawnSync } = require("node:child_process");

const result = spawnSync(process.execPath, ["atm.mjs", "tasks", "audit", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: false,
  maxBuffer: 1024 * 1024 * 200,
});

const raw = `${result.stdout || ""}${result.stderr || ""}`;
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (error) {
  console.error("Failed to parse tasks audit JSON.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const findings = parsed?.evidence?.report?.findings || [];
const transitionEvidenceMissing = findings.filter(
  (finding) => finding.code === "ATM_TASK_AUDIT_TRANSITION_EVIDENCE_MISSING",
);

console.log(`TRANSITION_EVIDENCE_MISSING=${transitionEvidenceMissing.length}`);
console.log(`TOTAL_FINDINGS=${findings.length}`);

if (transitionEvidenceMissing.length > 0) {
  for (const finding of transitionEvidenceMissing) {
    console.error(`${finding.taskId}: ${finding.detail}`);
  }
  process.exit(1);
}
