const fs = require("fs");
const path = require("path");

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else {
      if (name.endsWith(".workflow-summary.json")) {
        fileList.push(name);
      }
    }
  });
  return fileList;
}

async function run() {
  const rootDir = "c:/Users/User/3KLife/artifacts/skill-test-html-to-ucuf";
  if (!fs.existsSync(rootDir)) {
      console.log("Directory does not exist: " + rootDir);
      return;
  }
  const files = getFiles(rootDir);
  
  const results = [];

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const stats = {
        file: path.relative("c:/Users/User/3KLife", file),
        screenId: data.screenId,
        debugOnly: data.debugOnly,
        adjustedScore: data.cocosFinalGate?.adjustedScore,
        adjustedCoverage: data.browserCoverage?.adjustedCoverage,
        zoneOwnershipSummaryExists: !!(data.zoneOwnership && data.zoneOwnership.compactSummary),
        nextFixesCount: Array.isArray(data.nextFixes) ? data.nextFixes.length : 0
      };
      results.push(stats);
    } catch (e) {
      console.error(`Error parsing ${file}: ${e.message}`);
    }
  }

  console.log("--- Summary Data ---");
  results.forEach(r => {
    console.log(`File: ${r.file}`);
    console.log(`  ScreenId: ${r.screenId}, DebugOnly: ${r.debugOnly}`);
    console.log(`  Score: ${r.adjustedScore}, Coverage: ${r.adjustedCoverage}`);
    console.log(`  ZoneSummaryExists: ${r.zoneOwnershipSummaryExists}, NextFixes: ${r.nextFixesCount}`);
  });

  console.log("\n--- Top 10 by Adjusted Score ---");
  const top10 = results
    .filter(r => r.adjustedScore !== undefined)
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .slice(0, 10);

  top10.forEach((r, i) => {
    console.log(`${i + 1}. Score: ${r.adjustedScore} | File: ${r.file}`);
  });
}

run();
