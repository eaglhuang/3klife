'use strict';

const fs = require('fs');
const path = require('path');

const MILESTONE_DOC_ID = 'doc_other_0093';
const MILESTONE_PATH_REL = 'docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md';
const MILESTONE_TITLE = 'ATM 框架穩定化里程碑';

const M1_DONE_IDS = [
  'ATM-2-0027',
  'ATM-2-0050',
  'ATM-2-0051',
  'ATM-2-0054',
];

const M1_REMAINING_IDS = [
  'ATM-2.5-0004',
  'ATM-2-0030',
  'ATM-2-0010',
];

const M2_IDS = [
  'ATM-3-0014',
  'ATM-4-0007',
];

function normalizeStatus(status) {
  const value = String(status || 'open').trim().toLowerCase();
  if (value === 'done' || value === 'closed' || value === 'completed') {
    return 'done';
  }
  if (value === 'in-progress' || value === 'in_progress' || value === 'in progress') {
    return 'in-progress';
  }
  if (value === 'blocked') {
    return 'blocked';
  }
  return value || 'open';
}

function relPath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function buildTaskMap(tasks) {
  const map = new Map();
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (task && task.id) {
      map.set(String(task.id), task);
    }
  }
  return map;
}

function getTaskStatus(taskMap, taskId) {
  const task = taskMap.get(taskId);
  return normalizeStatus(task && task.status);
}

function isTaskDone(taskMap, taskId) {
  return getTaskStatus(taskMap, taskId) === 'done';
}

function renderStatus(taskMap, taskId) {
  return getTaskStatus(taskMap, taskId);
}

function renderCheckbox(taskMap, taskId) {
  return isTaskDone(taskMap, taskId) ? '[x]' : '[ ]';
}

function renderStatusSuffix(taskMap, taskId) {
  return `（目前：${renderStatus(taskMap, taskId)}）`;
}

function joinIds(taskIds) {
  return taskIds.map((taskId) => `\`${taskId}\``).join('、');
}

function buildMilestoneMarkdown(state = {}) {
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const summary = state.summary && typeof state.summary === 'object'
    ? state.summary
    : {
      done: 0,
      in_progress: 0,
      open: 0,
      total: tasks.length,
    };
  const taskMap = buildTaskMap(tasks);
  const m1OpenIds = M1_REMAINING_IDS.filter((taskId) => !isTaskDone(taskMap, taskId));

  const lines = [];
  lines.push(`<!-- doc_id: ${MILESTONE_DOC_ID} -->`);
  lines.push(`# ${MILESTONE_TITLE}`);
  lines.push(`> 這份頁面以 \`docs/tasks/tasks-atm.json\` 與 \`docs/tasks/tasks-atm/tasks-atm-part-*.json\` 的薄索引為準，不再沿用舊的 milestone 草稿數字。當前基線是 \`done=${summary.done} / in_progress=${summary.in_progress} / open=${summary.open} / total=${summary.total}\`.`);
  lines.push('## 1. 當前狀態');
  lines.push(`- ${joinIds(M1_DONE_IDS)} 都已是 \`done\`，不再當作主缺口。`);
  if (m1OpenIds.length === 0) {
    lines.push('- M1 的三個收尾面向都已收斂，不再保留未完成主缺口。');
  } else {
    lines.push('- M1 目前只剩三個收尾面向：');
  }
  lines.push(`  - \`ATM-2.5-0004\`：\`ATM-2-0022 x ATM-2-0027\` rollback / status 相容性回歸 ${renderStatusSuffix(taskMap, 'ATM-2.5-0004')}`);
  lines.push(`  - \`ATM-2-0030\`：\`versions[] / semanticFingerprint\` backfill sweep 與 catalog/index 一致性 ${renderStatusSuffix(taskMap, 'ATM-2-0030')}`);
  lines.push(`  - \`ATM-2-0010\`：\`RuleGuardAdapter\` read-only deterministic gate ${renderStatusSuffix(taskMap, 'ATM-2-0010')}`);
  lines.push('- 不重開已完成卡，也不另外新開 follow-up 卡；所有殘項直接併入既有 open 卡。');
  lines.push('- M2 的主鏈仍是 `ATM-3-0014 -> ATM-4-0007`，但前提是 M1 gate 全綠。');
  lines.push('');
  lines.push('## 2. 里程碑原則');
  lines.push('- `M0`：薄索引與 shard 數字一致，文件可被機器驗證，不再漂移。');
  lines.push('- `M1`：把已知風險收尾到可驗證狀態，讓 rollback、semantic fingerprint、status machine、RuleGuard read-only 都有 deterministic gate。');
  lines.push('- `M2`：只在 M1 已經綠燈後，才往 evidence / pilot / adapter parity 的主鏈前進。');
  lines.push('- `M3+`：才討論更大的治理閉環、validator orchestrator 或新一輪結構化演化。');
  lines.push('');
  lines.push('## 3. 收斂路線');
  lines.push('```text');
  lines.push('ATM-2.5-0004 -> ATM-2-0030 -> ATM-2-0010');
  lines.push('```');
  lines.push('');
  lines.push(`- \`ATM-2.5-0004\` 先把 rollback / status compatibility regression 收掉，避免 \`ATM-2-0022\` 與 \`ATM-2-0027\` 交叉回歸 ${renderStatusSuffix(taskMap, 'ATM-2.5-0004')}.`);
  lines.push(`- \`ATM-2-0030\` 再做 \`versions[] / semanticFingerprint\` backfill sweep，確認 catalog / RegistryIndex / registry entry projection 一致 ${renderStatusSuffix(taskMap, 'ATM-2-0030')}.`);
  lines.push(`- \`ATM-2-0010\` 最後把 RuleGuardAdapter 的 read-only 邊界變成 deterministic gate，避免工具鏈偷偷走寫入路徑 ${renderStatusSuffix(taskMap, 'ATM-2-0010')}.`);
  lines.push(`- \`ATM-3-0014\` 與 \`ATM-4-0007\` 只有在上述三個 gate 都過了之後，才視為可繼續推進 ${renderStatusSuffix(taskMap, 'ATM-3-0014')} / ${renderStatusSuffix(taskMap, 'ATM-4-0007')}.`);
  lines.push('');
  lines.push('## 4. Checklist');
  lines.push('');
  lines.push('### M1. 一致性補洞');
  lines.push(`${renderCheckbox(taskMap, 'ATM-2-0027')} \`ATM-2-0027\` 已經完成 status machine 收斂，不再作為未完成主缺口。`);
  lines.push(`${renderCheckbox(taskMap, 'ATM-2-0050')} \`ATM-2-0050\` / \`ATM-2-0051\` 已完成 coverage gate 主體與 follow-up 抽出。`);
  lines.push(`${renderCheckbox(taskMap, 'ATM-2-0054')} \`ATM-2-0054\` 已完成 task intake / lock stability backwrite，薄索引與 brief 已對齊。`);
  lines.push(`${renderCheckbox(taskMap, 'ATM-2.5-0004')} \`ATM-2.5-0004\` 完成 \`ATM-2-0022 x ATM-2-0027\` rollback / status compatibility regression。 ${renderStatusSuffix(taskMap, 'ATM-2.5-0004')}`);
  lines.push(`${renderCheckbox(taskMap, 'ATM-2-0030')} \`ATM-2-0030\` 完成 \`versions[] / semanticFingerprint\` backfill sweep 與 catalog/index 一致性檢查。 ${renderStatusSuffix(taskMap, 'ATM-2-0030')}`);
  lines.push(`${renderCheckbox(taskMap, 'ATM-2-0010')} \`ATM-2-0010\` 完成 RuleGuardAdapter read-only deterministic gate。 ${renderStatusSuffix(taskMap, 'ATM-2-0010')}`);
  lines.push('');
  lines.push('### M2. 演化閉環證據鏈');
  lines.push(`${renderCheckbox(taskMap, 'ATM-3-0014')} \`ATM-3-0014\` 補齊 shadow adapter / usage-feedback evidence。 ${renderStatusSuffix(taskMap, 'ATM-3-0014')}`);
  lines.push(`${renderCheckbox(taskMap, 'ATM-4-0007')} \`ATM-4-0007\` 承接 evolution pilot dry-run 與證據鏈收尾。 ${renderStatusSuffix(taskMap, 'ATM-4-0007')}`);
  lines.push('');
  lines.push('### M3. 機器驗證層');
  lines.push(`${renderCheckbox(taskMap, 'ATM-3-0016')} \`ATM-3-0016\` validator orchestrator 與 AJV cache 的統一入口。${renderStatusSuffix(taskMap, 'ATM-3-0016')}`);
  lines.push('- [ ] 更廣的 deterministic / semantic 雙軌驗證。');
  lines.push('');
  lines.push('### M4. 負債清單');
  lines.push('- [ ] evidence retention contract 與 rotation policy。');
  lines.push('- [ ] registry sharding 與 `versions[]` sidecar 的 resolver / rollback / catalog 收斂。');
  lines.push('');
  lines.push('### M5. 3KLife Host');
  lines.push('- [ ] HarnessCard-lite control / agency / runtime 的一致敘述。');
  lines.push('- [ ] adapter parity harness 與 ATM adapter 的證據對齊。');
  lines.push('- [ ] injection + rollback e2e 的最小閉環。');
  lines.push('');
  lines.push('## 5. 任務對照');
  lines.push('');
  lines.push('| 任務 | 狀態 | 角色 |');
  lines.push('|---|---|---|');
  lines.push(`| Rollback Proof x Status Enum Compatibility Sweep | ${renderStatus(taskMap, 'ATM-2.5-0004')} | 收斂 \`ATM-2-0022\` 與 \`ATM-2-0027\` 的交叉回歸 |`);
  lines.push(`| Registry Version / Fingerprint Backfill Sweep | ${renderStatus(taskMap, 'ATM-2-0030')} | 補齊 \`versions[]\` 與 semantic fingerprint 歷史缺口 |`);
  lines.push(`| RuleGuardAdapter Read-Only Validator | ${renderStatus(taskMap, 'ATM-2-0010')} | 把 RuleGuardAdapter 不碰 lifecycle mutation 變成 deterministic gate |`);
  lines.push('');
  lines.push('## 6. 驗證命令');
  lines.push('');
  lines.push('```bash');
  lines.push('node tools_node/sync-atm-stabilization-milestone.js --check --strict');
  lines.push('node tools_node/validate-rule-guard-read-only.js --strict');
  lines.push('node tools_node/validate-registry-backfill-sweep.js --strict');
  lines.push('node tools_node/check-doc-shard-health.js');
  lines.push('node tools_node/validate-framework-atomization-coverage.js --manifest docs/ai_atomic_framework/framework-function-atomization-manifest.md --fixture tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json --strict');
  lines.push('npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md docs/tasks/tasks-atm/tasks-atm-part-8.json docs/tasks/tasks-atm/tasks-atm-part-44.json docs/tasks/tasks-atm/tasks-atm-part-53.json docs/tasks/tasks-atm/tasks-atm-part-60.json tools_node/sync-atm-stabilization-milestone.js tools_node/validate-rule-guard-read-only.js tools_node/validate-registry-backfill-sweep.js');
  lines.push('```');
  lines.push('');
  lines.push('## 7. 註記');
  lines.push('- milestone 只負責把薄索引真相整理成可讀、可驗證的路線圖，不取代 task shard / manifest / role map。');
  lines.push('- `ATM-2-0054` 已經 done，這份頁面只把它當成已對齊的治理背景，不再列為未完成 follow-up。');
  lines.push('- 若 task-store 數字再變動，請以最新薄索引為準回寫，不要沿用舊 baseline；理想情況下直接執行同步腳本。');
  lines.push('- 這份文件由 `docs/tasks/tasks-atm.json` 生成，summary、milestone、task card 共享同一份 task store。');

  return `${lines.join('\n')}\n`;
}

function buildMilestoneSnapshot(projectRoot, state) {
  const markdown = buildMilestoneMarkdown(state);
  const absolutePath = path.join(projectRoot, MILESTONE_PATH_REL);
  return {
    path: relPath(projectRoot, absolutePath),
    absolutePath,
    markdown,
    summary: state && state.summary ? state.summary : {
      done: 0,
      in_progress: 0,
      open: 0,
      total: Array.isArray(state && state.tasks) ? state.tasks.length : 0,
    },
  };
}

function syncAtmStabilizationMilestone(projectRoot, state, options = {}) {
  const snapshot = buildMilestoneSnapshot(projectRoot, state);
  const dryRun = Boolean(options.dryRun);
  let existing = '';
  let changed = false;

  if (fs.existsSync(snapshot.absolutePath)) {
    existing = fs.readFileSync(snapshot.absolutePath, 'utf8');
  }

  changed = existing !== snapshot.markdown;
  if (!dryRun && changed) {
    fs.mkdirSync(path.dirname(snapshot.absolutePath), { recursive: true });
    fs.writeFileSync(snapshot.absolutePath, snapshot.markdown, 'utf8');
  }

  return {
    ...snapshot,
    changed,
    existing,
  };
}

module.exports = {
  MILESTONE_DOC_ID,
  MILESTONE_PATH_REL,
  MILESTONE_TITLE,
  M1_DONE_IDS,
  M1_REMAINING_IDS,
  M2_IDS,
  normalizeStatus,
  buildTaskMap,
  buildMilestoneMarkdown,
  buildMilestoneSnapshot,
  syncAtmStabilizationMilestone,
};
