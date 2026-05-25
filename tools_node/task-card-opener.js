#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const {
  PROJECT_ROOT,
  getArg,
  hasFlag,
  readJson,
  resolvePath,
  writeJson,
  writeText,
} = require('./lib/ucuf-recipe-utils');
const {
  isTasksAtmIndexPath,
  upsertTaskInTasksAtmStore,
} = require('./lib/tasks-atm-shard-store');
const {
  MILESTONE_PATH_REL,
} = require('./lib/atm-stabilization-milestone');
const { deriveAgentIdentity } = require('./lib/agent-identity');
const { createTaskAdapter } = require('./adapters/atm-3klife/task-adapter');

const taskAdapter = createTaskAdapter({
  projectRoot: PROJECT_ROOT,
  profilePath: path.join(PROJECT_ROOT, 'tools_node', 'adapters', 'atm-3klife', 'task-profile.json'),
});

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function getDefaultAgentName() {
  const derived = deriveAgentIdentity({ cwd: PROJECT_ROOT });
  if (derived && derived.ok && derived.agentName) {
    return derived.agentName;
  }
  return 'GitHubCopilot';
}

function nowRfc3339() {
  const value = new Date();
  const pad = (input) => String(input).padStart(2, '0');
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hour = pad(value.getHours());
  const minute = pad(value.getMinutes());
  const second = pad(value.getSeconds());
  const offsetMinutes = -value.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHour = pad(Math.floor(absOffset / 60));
  const offsetMinute = pad(absOffset % 60);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`;
}

function normalizeStatus(status) {
  const value = String(status || 'open').trim().toLowerCase();
  if (value === 'in_progress' || value === 'in progress') {
    return 'in-progress';
  }
  if (value === 'done' || value === 'closed' || value === 'completed') {
    return 'done';
  }
  if (value === 'blocked') {
    return 'blocked';
  }
  return value || 'open';
}

function splitList(value) {
  return String(value || '')
    .split(/[|,\n;]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function decodeBlockText(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .trim();
}

function renderYamlScalar(value) {
  const normalized = value ?? '';
  if (typeof normalized === 'string' && /^[A-Za-z0-9_./:+-]+$/.test(normalized)) {
    return normalized;
  }
  return JSON.stringify(normalized);
}

function renderYamlArrayField(name, items) {
  if (!items.length) {
    return `${name}: []`;
  }

  return [
    `${name}:`,
    ...items.map((item) => `  - ${renderYamlScalar(item)}`),
  ].join('\n');
}

function renderValue(value) {
  return JSON.stringify(value ?? '');
}

function renderBulletList(items, fallback) {
  const lines = items.length > 0 ? items : [fallback];
  return lines.map((item) => `- ${item}`).join('\n');
}

function renderChecklist(items, fallback) {
  const lines = items.length > 0 ? items : [fallback];
  return lines.map((item) => `- [ ] ${item}`).join('\n');
}

function renderNumberedList(items, fallback) {
  const lines = items.length > 0 ? items : [fallback];
  return lines.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function renderCodeBlock(content, fallback, language) {
  const body = decodeBlockText(content) || fallback;
  return [`\`\`\`${language || ''}`.trim(), body, '```'].join('\n');
}

function hasAnyEvidence(evidence) {
  return Boolean(
    (evidence.artifact_paths && evidence.artifact_paths.length > 0) ||
    (evidence.validation_evidence && evidence.validation_evidence.length > 0) ||
    evidence.handoff_diff_status ||
    (evidence.trace_artifacts && evidence.trace_artifacts.length > 0) ||
    (evidence.metrics_summary && evidence.metrics_summary.length > 0)
  );
}

function inferBriefStyle(task, explicitStyle, mdKind) {
  if (mdKind !== 'agent-briefs') {
    return 'classic';
  }
  if (explicitStyle) {
    return explicitStyle;
  }
  if (/^HARN-/i.test(task.id)) {
    return 'harn-rich';
  }
  return 'classic';
}

function defaultBriefLabel(task) {
  if (task.sensor_triggered_by && /^compute-gate/i.test(task.sensor_triggered_by)) {
    return '韁繩感測器觸發';
  }
  if (/^HARN-/i.test(task.id)) {
    return 'Harness rollout 開卡';
  }
  return '任務開卡';
}

function formatDependsSummary(task) {
  if (task.brief.prereq) {
    return task.brief.prereq;
  }
  if (!task.depends.length) {
    return '無';
  }
  return task.depends.map((item) => `\`${item}\``).join('、');
}

function buildAgentBriefsFrontmatter(task) {
  const lines = ['---'];
  if (task.doc_id) {
    lines.push(`doc_id: ${renderYamlScalar(task.doc_id)}`);
  }
  lines.push(`id: ${renderYamlScalar(task.id)}`);
  lines.push(`priority: ${renderYamlScalar(task.priority)}`);
  lines.push(`phase: ${renderYamlScalar(task.phase)}`);
  lines.push(`created: ${renderYamlScalar(task.created)}`);
  lines.push(`created_by_agent: ${renderYamlScalar(task.created_by_agent)}`);
  lines.push(`owner: ${renderYamlScalar(task.owner)}`);
  lines.push(`status: ${renderYamlScalar(task.status)}`);
  if (task.started_at) {
    lines.push(`started_at: ${renderYamlScalar(task.started_at)}`);
  }
  if (task.started_by_agent) {
    lines.push(`started_by_agent: ${renderYamlScalar(task.started_by_agent)}`);
  }
  lines.push(`type: ${renderYamlScalar(task.type)}`);
  if (task.chain_id) {
    lines.push(`chain_id: ${renderYamlScalar(task.chain_id)}`);
  }
  if (task.chain_step) {
    lines.push(`chain_step: ${renderYamlScalar(task.chain_step)}`);
  }
  if (task.sensor_triggered_by) {
    lines.push(`sensor_triggered_by: ${renderYamlScalar(task.sensor_triggered_by)}`);
  }
  lines.push(renderYamlArrayField('depends', task.depends));
  lines.push(`notes: ${renderValue(task.notes)}`);
  lines.push('---', '');
  return lines.join('\n');
}

function renderRelatedLinks(items) {
  if (!items.length) {
    return '—';
  }

  return items.map((item) => `[${item}](${item}.md)`).join('、');
}

function inferMdKind(mdOutArg) {
  const outputPath = String(mdOutArg || '').replace(/\\/g, '/');
  if (/(^|\/)docs\/agent-briefs\/tasks\//.test(outputPath)) {
    return 'agent-briefs';
  }
  return 'generic';
}

function inferJsonKind(jsonOutArg) {
  const outputPath = String(jsonOutArg || '').replace(/\\/g, '/');
  if (/(^|\/)docs\/ui-quality-tasks\//.test(outputPath)) {
    return 'ui-quality-task-shard';
  }
  if (/(^|\/)docs\/tasks\//.test(outputPath) || /tasks-[^/]+\.json$/i.test(outputPath)) {
    return 'task-aggregate';
  }
  return 'plain-task';
}

function inferTaskIdPrefix(taskId) {
  const match = String(taskId || '').trim().match(/^(.*)-\d+$/);
  return match ? match[1] : '';
}

function canReuseExistingTaskId(inspection, currentAgentName, mdPath) {
  const normalizedAgentName = String(currentAgentName || '').trim();
  const hasTaskCard = inspection.taskCards.length > 0;
  const hasStoreEntry = inspection.taskStoreCount > 0;
  const hasForeignLock = inspection.locks.some((entry) => entry.agentName && entry.agentName !== normalizedAgentName);
  const ownsReservationOnly = inspection.locks.length > 0 && inspection.locks.every((entry) => entry.agentName === normalizedAgentName && entry.reservationOnly);
  const mdPathMatchesExistingTaskCard = Boolean(mdPath) && fs.existsSync(mdPath) && path.basename(mdPath, '.md') === inspection.taskId;

  if (hasForeignLock) {
    return false;
  }
  if (ownsReservationOnly && !hasTaskCard && !hasStoreEntry) {
    return true;
  }
  return mdPathMatchesExistingTaskCard;
}

function buildTask(options) {
  const created = options.created || todayIso();
  const status = normalizeStatus(options.status);
  const related = options.related.length > 0 ? options.related : [];
  const depends = options.depends.length > 0 ? options.depends : [];
  const acceptance = options.acceptance.length > 0 ? options.acceptance : [];
  const deliverables = options.deliverables.length > 0 ? options.deliverables : [];
  const startedAt = status === 'in-progress'
    ? (options.startedAt || nowRfc3339())
    : '';
  const startedByAgent = status === 'in-progress'
    ? (options.startedByAgent || options.createdByAgent || options.owner)
    : '';
  const notes = options.notes || `${created} | 狀態: ${status} | 驗證: pending | 變更: task-card-opener 產生${options.briefStyle === 'harn-rich' ? ' HARN rich brief' : '骨架'} | 阻塞: ${options.briefStyle === 'harn-rich' ? 'none' : '無'}`;

  return {
    doc_id: options.docId,
    id: options.id,
    title: options.title,
    owner: options.owner,
    priority: options.priority,
    status,
    type: options.type,
    phase: options.phase,
    created,
    created_by_agent: options.createdByAgent,
    started_at: startedAt,
    started_by_agent: startedByAgent,
    chain_id: options.chainId,
    chain_step: options.chainStep,
    sensor_triggered_by: options.sensorTriggeredBy,
    description: options.description,
    related,
    depends,
    acceptance,
    deliverables,
    notes,
    brief: {
      style: options.briefStyle,
      label: options.briefLabel,
      summary: options.briefSummary,
      position: options.briefPosition,
      prereq: options.briefPrereq,
    },
    contracts: {
      input: options.inputContract,
      output: options.outputContract,
      validation_cmd: options.validationCmd,
      rollback_hint: options.rollbackHint,
      execution_steps: options.executionSteps,
    },
    harness_evidence: {
      artifact_paths: options.artifactPaths,
      validation_evidence: options.validationEvidence,
      handoff_diff_status: options.handoffDiffStatus,
      trace_artifacts: options.traceArtifacts,
      metrics_summary: options.metricsSummary,
    },
  };
}

function buildAgentBriefsClassicMarkdown(task) {
  const notes = task.notes || '';
  const completion = task.status === 'done' ? '100%' : '0%';
  const relatedLinks = renderRelatedLinks(task.related);
  const acceptance = task.acceptance.length > 0
    ? task.acceptance.map((item) => `1. ${item}`).join('\n')
    : '1. 待補驗證條件';
  const deliverables = task.deliverables.length > 0
    ? task.deliverables.map((item) => `- ${item}`).join('\n')
    : '- 待補交付物';
  const relatedTasks = task.related.length > 0
    ? task.related.map((item) => `- [${item}](${item}.md)`).join('\n')
    : '- 無';

  const bodyLines = [
    `# [${task.id}] ${task.title}`,
    '',
    '## 基本資訊',
    '| 欄位 | 值 |',
    '|---|---|',
    `| 卡號 | ${task.id} |`,
    `| 優先級 | ${task.priority} |`,
    `| 開單時間 | ${task.created} |`,
    `| 負責 Agent | ${task.owner} |`,
    `| 狀態 | ${task.status} |`,
    `| 完成度 | ${completion} |`,
    '| 完成時間 | — |',
    `| 關聯卡號 | ${relatedLinks} |`,
    '',
    '## 開單原因',
    task.description || '待補：說明這張卡的來源與目標。',
    '',
    '## 完整描述',
    task.deliverables.length > 0
      ? task.deliverables.map((item) => `- ${item}`).join('\n')
      : '- 待補：列出實作或搬遷範圍。',
    '',
    '## 如何驗證',
    acceptance,
    '',
    '## 建議作法',
    '- 待補：依任務類型補上最小可執行步驟。',
    '',
    '## 相關聯任務卡',
    relatedTasks,
    '',
    '## 交付物',
    deliverables,
    '',
    '## 備註',
    notes ? `- ${notes}` : '- 無',
  ];

  return `${buildAgentBriefsFrontmatter(task)}${bodyLines.join('\n')}\n`;
}

function buildHarnessEvidenceSection(task) {
  const evidence = task.harness_evidence || {};
  if (!hasAnyEvidence(evidence)) {
    return [];
  }

  const lines = ['## HARNESS_EVIDENCE', ''];
  if (evidence.artifact_paths && evidence.artifact_paths.length > 0) {
    lines.push(`- artifact path：${evidence.artifact_paths.map((item) => `\`${item}\``).join('、')}`);
  }
  if (evidence.validation_evidence && evidence.validation_evidence.length > 0) {
    lines.push(`- validation evidence：${evidence.validation_evidence.join('、')}`);
  }
  if (evidence.handoff_diff_status) {
    lines.push(`- handoff diff status：${evidence.handoff_diff_status}`);
  }
  if (evidence.trace_artifacts && evidence.trace_artifacts.length > 0) {
    lines.push(`- trace summary / path：${evidence.trace_artifacts.map((item) => `\`${item}\``).join('、')}`);
  }
  if (evidence.metrics_summary && evidence.metrics_summary.length > 0) {
    lines.push(`- metrics summary：${evidence.metrics_summary.join('、')}`);
  }
  lines.push('');
  return lines;
}

function buildAgentBriefsHarnRichMarkdown(task) {
  const contracts = task.contracts || {};
  const outputItems = contracts.output.length > 0 ? contracts.output : task.deliverables;
  const introLabel = task.brief.label || defaultBriefLabel(task);
  const introSummary = task.brief.summary || task.title;
  const introPosition = task.brief.position || task.phase || '待補';
  const introPrereq = formatDependsSummary(task);

  const bodyLines = [
    `# [${task.id}] ${task.title}`,
    '',
    `> **${introLabel}** — ${introSummary}`,
    `> **定位**：${introPosition}`,
    `> **前置依賴**：${introPrereq}`,
    '',
    '## 問題描述',
    '',
    task.description || '待補：說明這張卡要修正或補齊的核心問題。',
    '',
    '## INPUT_CONTRACT',
    '',
    renderBulletList(contracts.input, '待補：列出前置條件與既有契約。'),
    '',
    '## OUTPUT_CONTRACT',
    '',
    renderChecklist(outputItems, '待補：列出交付成果與完成條件。'),
    '',
    ...buildHarnessEvidenceSection(task),
    '## VALIDATION_CMD',
    '',
    renderCodeBlock(contracts.validation_cmd, '# TODO: 補上可直接執行的驗證命令', 'bash'),
    '',
    '## ROLLBACK_HINT',
    '',
    renderCodeBlock(contracts.rollback_hint, '# TODO: 補上最小 rollback 指令', 'bash'),
    '',
    '## 執行步驟',
    '',
    renderNumberedList(contracts.execution_steps, '待補：列出最小可執行步驟。'),
    '',
    `*由 ${task.created_by_agent} 透過 task-card-opener 開立 | ${task.created}*`,
  ];

  return `${buildAgentBriefsFrontmatter(task)}${bodyLines.join('\n')}\n`;
}

function buildGenericMarkdown(task) {
  const acceptance = task.acceptance.length > 0
    ? task.acceptance.map((item) => `- ${item}`).join('\n')
    : '- 待補驗證條件';
  const deliverables = task.deliverables.length > 0
    ? task.deliverables.map((item) => `- ${item}`).join('\n')
    : '- 待補交付物';
  const related = task.related.length > 0
    ? task.related.map((item) => `- [${item}](${item}.md)`).join('\n')
    : '- 無';

  const frontmatterLines = [
    '---',
    `id: ${renderValue(task.id)}`,
    `title: ${renderValue(task.title)}`,
    `owner: ${renderValue(task.owner)}`,
    `priority: ${renderValue(task.priority)}`,
    `status: ${renderValue(task.status)}`,
    `type: ${renderValue(task.type)}`,
    `phase: ${renderValue(task.phase)}`,
    `created: ${renderValue(task.created)}`,
    `created_by_agent: ${renderValue(task.created_by_agent)}`,
    renderYamlArrayField('related_cards', task.related),
    renderYamlArrayField('depends', task.depends),
    `notes: ${renderValue(task.notes)}`,
    '---',
    '',
  ];

  const bodyLines = [
    `# ${task.id} ${task.title}`,
    '',
    '## 摘要',
    task.description ? `- ${task.description}` : '- 待補：說明此任務的核心目標。',
    '',
    '## 驗證條件',
    acceptance,
    '',
    '## 交付物',
    deliverables,
    '',
    '## 相關聯任務卡',
    related,
    '',
    '## 備註',
    `- ${task.notes}`,
  ];

  return `${frontmatterLines.join('\n')}\n${bodyLines.join('\n')}\n`;
}

function buildMarkdown(task, mdKind) {
  if (mdKind !== 'agent-briefs') {
    return buildGenericMarkdown(task);
  }

  const briefStyle = inferBriefStyle(task, task.brief.style, mdKind);
  return briefStyle === 'harn-rich'
    ? buildAgentBriefsHarnRichMarkdown(task)
    : buildAgentBriefsClassicMarkdown(task);
}

function loadJsonFileIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
}

function recalcSummary(tasks) {
  const summary = {
    done: 0,
    in_progress: 0,
    open: 0,
    total: tasks.length,
  };

  for (const task of tasks) {
    const status = normalizeStatus(task && task.status);
    if (status === 'done') {
      summary.done += 1;
    } else if (status === 'in-progress') {
      summary.in_progress += 1;
    } else {
      summary.open += 1;
    }
  }

  return summary;
}

function upsertTaskInAggregate(existing, task) {
  const aggregate = existing && typeof existing === 'object' ? { ...existing } : {};
  const tasks = Array.isArray(aggregate.tasks) ? [...aggregate.tasks] : [];
  const index = tasks.findIndex((item) => item && item.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }

  aggregate.tasks = tasks;
  aggregate.summary = recalcSummary(tasks);
  return aggregate;
}

function upsertTaskInUiShard(existing, task) {
  const shard = existing && typeof existing === 'object' ? { ...existing } : { kind: 'ui-quality-task-shard', version: 1 };
  const tasks = Array.isArray(shard.tasks) ? [...shard.tasks] : [];
  const index = tasks.findIndex((item) => item && item.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }

  shard.kind = 'ui-quality-task-shard';
  shard.version = 1;
  shard.tasks = tasks;
  return shard;
}

function printHelp(log = console.log) {
  log([
    '用法：',
    '  node tools_node/task-card-opener.js --id <TaskId> --title <Title> [options]',
    '  node tools_node/task-card-opener.js --recipe <file> [既有 recipe compiler 參數]',
    '',
    '必要參數（直接模式）：',
    '  --id              任務卡 ID（依名詞定義文件）',
    '  --next-id-prefix  以 {系統代號}-{子系統} 原子保留下一個可用卡號，例如 ATM-2',
    '  --title           任務標題',
    '',
    '常用選項：',
    '  --description     任務摘要 / 說明',
    '  --owner           預設取 AGENT_IDENTITY，若缺值會嘗試 repo-local git user.name，再回落 GitHubCopilot',
    '  --priority        預設 P1',
    '  --status          預設 open',
    '  --type            預設 implementation',
    '  --phase           預設 M0',
    '  --created         預設今日 YYYY-MM-DD',
    '  --created-by-agent 預設取 AGENT_IDENTITY，若缺值會嘗試 repo-local git user.name，再回落 GitHubCopilot',
    '  --related         以逗號、|、; 或換行分隔的相關卡號',
    '  --depends         以逗號、|、; 或換行分隔的依賴卡號',
    '  --acceptance      驗收條件清單',
    '  --deliverables    交付物清單',
    '  --notes           備註 / notes 欄內容',
    '  --allow-existing-id  允許覆寫 / 更新既有 task id（預設遇到已佔用 id 會直接失敗）',
    '  --doc-id          指定 frontmatter doc_id；通常與 --assign-doc-id 二選一',
    '  --assign-doc-id   write 模式下於 Markdown 寫入後呼叫 doc-id-registry 自動分配 doc_id',
    '  --md-out          Markdown 輸出路徑',
    '  --md-kind         generic / agent-briefs，未指定時依路徑推斷',
    '  --brief-style     classic / harn-rich；agent-briefs 未指定時，HARN-* 自動走 harn-rich',
    '  --brief-label     rich brief 首行標籤，例如 Harness rollout 開卡 / 韁繩感測器觸發',
    '  --brief-summary   rich brief 首行摘要說明',
    '  --brief-position  rich brief 的「定位」行內容',
    '  --brief-prereq    rich brief 的「前置依賴」行內容',
    '  --chain-id        agent-briefs frontmatter 的 chain_id',
    '  --chain-step      agent-briefs frontmatter 的 chain_step',
    '  --sensor-triggered-by  agent-briefs frontmatter 的 sensor_triggered_by',
    '  --started-at      status=in-progress 時可覆寫 started_at（預設自動填 RFC3339）',
    '  --started-by-agent status=in-progress 時可覆寫 started_by_agent',
    '  --input-contract  rich brief INPUT_CONTRACT 清單（逗號、|、;、換行分隔）',
    '  --output-contract rich brief OUTPUT_CONTRACT 清單（逗號、|、;、換行分隔）',
    '  --validation-cmd  rich brief VALIDATION_CMD 內容；支援 \\n 轉換成多行',
    '  --rollback-hint   rich brief ROLLBACK_HINT 內容；支援 \\n 轉換成多行',
    '  --execution-steps rich brief 執行步驟清單（逗號、|、;、換行分隔）',
    '  --artifact-paths  HARNESS_EVIDENCE 中的 artifact path 清單',
    '  --validation-evidence HARNESS_EVIDENCE 中的 validation evidence 清單',
    '  --handoff-diff-status HARNESS_EVIDENCE 中的 handoff diff 狀態',
    '  --trace-artifacts HARNESS_EVIDENCE 中的 trace artifact/path 清單',
    '  --metrics-summary HARNESS_EVIDENCE 中的 metrics summary 清單',
    '  --json-out        JSON 輸出路徑',
    '  --json-kind       task-aggregate / ui-quality-task-shard / plain-task',
    '  --write           寫入檔案；未指定時為 dry-run',
    '  --help            顯示說明',
    '',
    '任務卡 ID 命名：請依 docs/遊戲規格文件/系統規格書/名詞定義文件.md 的 {系統代號}-{子系統}-{流水號4位} 規則。',
    '',
    'recipe 相容模式：',
    '  - 若提供 --recipe，會直接委派給 tools_node/compile-recipe-to-task-card.js',
    '  - 這可讓 ui-vibe-pipeline 直接改用 task-card-opener，而不破壞既有 recipe 產線',
  ].join('\n'));
}

function printDryRunArtifact(label, content, log = console.log) {
  log(`--- ${label} ---`);
  log(content);
}

function runRecipeMode(args = [], execFileSyncImpl = cp.execFileSync) {
  execFileSyncImpl(process.execPath, [path.join(PROJECT_ROOT, 'tools_node', 'compile-recipe-to-task-card.js'), ...args], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
}

let pendingTaskIdReservation = null;

function rememberTaskIdReservation(reservation) {
  pendingTaskIdReservation = reservation && !reservation.dryRun
    ? {
      taskId: reservation.taskId,
      agentName: reservation.agentName,
      cleanupOnError: !reservation.reused,
    }
    : null;
}

function clearTaskIdReservation() {
  pendingTaskIdReservation = null;
}

function cleanupPendingTaskIdReservation() {
  if (!pendingTaskIdReservation) {
    return;
  }
  if (pendingTaskIdReservation.cleanupOnError) {
    taskAdapter.releaseReservedTaskId(pendingTaskIdReservation.taskId, pendingTaskIdReservation.agentName);
  }
  clearTaskIdReservation();
}

function relativeOutputFile(filePath) {
  if (!filePath) {
    return '';
  }
  return taskAdapter.relativeOutputFile(resolvePath(filePath));
}

function promoteReservationToLock(taskId, agentName, files) {
  taskAdapter.promoteReservationToLock(taskId, agentName, files.filter(Boolean));
  clearTaskIdReservation();
}

function finalizePendingTaskIdReservation(task, agentName, files) {
  if (!pendingTaskIdReservation) {
    return;
  }

  const normalizedStatus = normalizeStatus(task && task.status);
  if (normalizedStatus === 'in-progress') {
    promoteReservationToLock(task.id, agentName, files);
    return;
  }

  taskAdapter.releaseReservedTaskId(pendingTaskIdReservation.taskId, pendingTaskIdReservation.agentName);
  clearTaskIdReservation();
}

function parseTaskCardOpenerOptions(argv = process.argv) {
  const explicitId = getArg(argv, 'id') || getArg(argv, 'card-id');
  const nextIdPrefix = getArg(argv, 'next-id-prefix', '');
  const mdOutArg = getArg(argv, 'md-out', '');
  const jsonOutArg = getArg(argv, 'json-out', '');
  const normalizedId = explicitId || '';

  return {
    showHelp: hasFlag(argv, 'help'),
    recipePath: getArg(argv, 'recipe', ''),
    recipeArgs: Array.isArray(argv) ? argv.slice(2) : [],
    explicitId,
    nextIdPrefix,
    allowExistingId: hasFlag(argv, 'allow-existing-id'),
    id: normalizedId,
    title: getArg(argv, 'title'),
    docId: getArg(argv, 'doc-id', ''),
    assignDocId: hasFlag(argv, 'assign-doc-id'),
    dryRun: !hasFlag(argv, 'write'),
    mdOutArg,
    jsonOutArg,
    mdKind: getArg(argv, 'md-kind', inferMdKind(mdOutArg)),
    jsonKind: getArg(argv, 'json-kind', inferJsonKind(jsonOutArg)),
    owner: getArg(argv, 'owner', getDefaultAgentName()),
    priority: getArg(argv, 'priority', 'P1'),
    status: getArg(argv, 'status', 'open'),
    type: getArg(argv, 'type', 'implementation'),
    phase: getArg(argv, 'phase', 'M0'),
    created: getArg(argv, 'created', todayIso()),
    createdByAgent: getArg(argv, 'created-by-agent', getDefaultAgentName()),
    startedAt: getArg(argv, 'started-at', ''),
    startedByAgent: getArg(argv, 'started-by-agent', getDefaultAgentName()),
    chainId: getArg(argv, 'chain-id', ''),
    chainStep: getArg(argv, 'chain-step', ''),
    sensorTriggeredBy: getArg(argv, 'sensor-triggered-by', ''),
    description: getArg(argv, 'description', ''),
    related: splitList(getArg(argv, 'related', '')),
    depends: splitList(getArg(argv, 'depends', '')),
    acceptance: splitList(getArg(argv, 'acceptance', '')),
    deliverables: splitList(getArg(argv, 'deliverables', '')),
    notes: getArg(argv, 'notes', ''),
    briefStyle: inferBriefStyle({ id: normalizedId }, getArg(argv, 'brief-style', ''), getArg(argv, 'md-kind', inferMdKind(mdOutArg))),
    briefLabel: getArg(argv, 'brief-label', ''),
    briefSummary: getArg(argv, 'brief-summary', ''),
    briefPosition: getArg(argv, 'brief-position', ''),
    briefPrereq: getArg(argv, 'brief-prereq', ''),
    inputContract: splitList(getArg(argv, 'input-contract', '')),
    outputContract: splitList(getArg(argv, 'output-contract', '')),
    validationCmd: getArg(argv, 'validation-cmd', ''),
    rollbackHint: getArg(argv, 'rollback-hint', ''),
    executionSteps: splitList(getArg(argv, 'execution-steps', '')),
    artifactPaths: splitList(getArg(argv, 'artifact-paths', '')),
    validationEvidence: splitList(getArg(argv, 'validation-evidence', '')),
    handoffDiffStatus: getArg(argv, 'handoff-diff-status', ''),
    traceArtifacts: splitList(getArg(argv, 'trace-artifacts', '')),
    metricsSummary: splitList(getArg(argv, 'metrics-summary', '')),
  };
}

async function main(options = {}) {
  if (options.showHelp) {
    printHelp();
    return;
  }

  if (options.recipePath) {
    runRecipeMode(options.recipeArgs);
    return;
  }

  const explicitId = options.explicitId;
  const nextIdPrefix = options.nextIdPrefix;
  const allowExistingId = options.allowExistingId;
  let id = explicitId;
  const title = options.title;
  const docId = options.docId;
  const assignDocId = options.assignDocId;
  if ((explicitId && nextIdPrefix) || (!explicitId && !nextIdPrefix)) {
    printHelp();
    throw new Error('exactly one of --id / --next-id-prefix is required');
  }
  if (!title) {
    printHelp();
    throw new Error('title is required');
  }
  if (docId && assignDocId) {
    throw new Error('--doc-id 與 --assign-doc-id 不能同時使用');
  }

  const dryRun = typeof options.dryRun === 'boolean' ? options.dryRun : true;
  const mdOutArg = options.mdOutArg || '';
  const jsonOutArg = options.jsonOutArg || '';
  const mdKind = options.mdKind || inferMdKind(mdOutArg);
  const jsonKind = options.jsonKind || inferJsonKind(jsonOutArg);
  const briefStyle = options.briefStyle || inferBriefStyle({ id }, '', mdKind);
  const owner = options.owner || getDefaultAgentName();
  const mdPath = mdOutArg ? resolvePath(mdOutArg) : '';

  if (nextIdPrefix) {
    if (dryRun) {
      id = taskAdapter.previewNextTaskId(nextIdPrefix);
    } else {
      const reservation = taskAdapter.reserveNextTaskId(nextIdPrefix, owner);
      rememberTaskIdReservation(reservation);
      id = reservation.taskId;
    }
  } else if (!dryRun && !allowExistingId) {
    const preReservationInspection = taskAdapter.inspectTaskId(id);
    const hasOnlyOwnReservation = preReservationInspection.taskCards.length === 0
      && preReservationInspection.taskStoreCount === 0
      && preReservationInspection.locks.length > 0
      && preReservationInspection.locks.every((entry) => entry.agentName === owner && entry.reservationOnly);
    if (!preReservationInspection.occupied || hasOnlyOwnReservation) {
      const reservation = taskAdapter.reserveTaskId(id, owner);
      rememberTaskIdReservation(reservation);
    }
  }

  const inspection = taskAdapter.inspectTaskId(id);
  if (inspection.occupied && !allowExistingId && !canReuseExistingTaskId(inspection, owner, mdPath)) {
    const prefixHint = inferTaskIdPrefix(id) || nextIdPrefix;
    const suggestion = prefixHint ? ` 改用 --next-id-prefix ${prefixHint} 可原子保留下一個空號。` : '';
    throw new Error(`task id "${id}" 已被佔用：${taskAdapter.formatTaskIdInspection(inspection)}。${suggestion}`.trim());
  }

  const task = buildTask({
    docId,
    id,
    title,
    owner,
    priority: options.priority || 'P1',
    status: options.status || 'open',
    type: options.type || 'implementation',
    phase: options.phase || 'M0',
    created: options.created || todayIso(),
    createdByAgent: options.createdByAgent || getDefaultAgentName(),
    startedAt: options.startedAt || '',
    startedByAgent: options.startedByAgent || getDefaultAgentName(),
    chainId: options.chainId || '',
    chainStep: options.chainStep || '',
    sensorTriggeredBy: options.sensorTriggeredBy || '',
    description: options.description || '',
    related: Array.isArray(options.related) ? options.related : [],
    depends: Array.isArray(options.depends) ? options.depends : [],
    acceptance: Array.isArray(options.acceptance) ? options.acceptance : [],
    deliverables: Array.isArray(options.deliverables) ? options.deliverables : [],
    notes: options.notes || '',
    briefStyle,
    briefLabel: options.briefLabel || '',
    briefSummary: options.briefSummary || '',
    briefPosition: options.briefPosition || '',
    briefPrereq: options.briefPrereq || '',
    inputContract: Array.isArray(options.inputContract) ? options.inputContract : [],
    outputContract: Array.isArray(options.outputContract) ? options.outputContract : [],
    validationCmd: options.validationCmd || '',
    rollbackHint: options.rollbackHint || '',
    executionSteps: Array.isArray(options.executionSteps) ? options.executionSteps : [],
    artifactPaths: Array.isArray(options.artifactPaths) ? options.artifactPaths : [],
    validationEvidence: Array.isArray(options.validationEvidence) ? options.validationEvidence : [],
    handoffDiffStatus: options.handoffDiffStatus || '',
    traceArtifacts: Array.isArray(options.traceArtifacts) ? options.traceArtifacts : [],
    metricsSummary: Array.isArray(options.metricsSummary) ? options.metricsSummary : [],
  });

  if (!mdOutArg && !jsonOutArg && !dryRun) {
    throw new Error('未指定 --md-out 或 --json-out，無法在 write 模式輸出');
  }

  const mdContent = buildMarkdown(task, mdKind);
  let lockFilesOverride = null;
  if (mdOutArg) {
    const resolvedMdPath = resolvePath(mdOutArg);
    writeText(resolvedMdPath, mdContent, dryRun);
    if (!dryRun && assignDocId) {
      await taskAdapter.assignDocId(resolvedMdPath);
    }
  } else if (dryRun) {
    printDryRunArtifact('markdown', mdContent);
  } else {
    throw new Error('未指定 --md-out，無法在 write 模式輸出 Markdown');
  }

  if (jsonOutArg) {
    const jsonPath = resolvePath(jsonOutArg);
    let outputJson;

    if (jsonKind === 'task-aggregate' && isTasksAtmIndexPath(PROJECT_ROOT, jsonPath)) {
      const result = upsertTaskInTasksAtmStore(PROJECT_ROOT, task, {
        dryRun,
        syncMilestone: !dryRun,
      });
      outputJson = result.indexStub;
      lockFilesOverride = [
        relativeOutputFile(mdOutArg),
        result.upsertedTaskPartPath || '',
        ...(Array.isArray(result.changedFiles)
          ? result.changedFiles.filter((filePath) => (
            /^docs\/tasks\/tasks-atm\/tasks-atm-part-\d+\.json$/.test(filePath)
            || filePath === 'docs/tasks/tasks-atm/.shardrc.json'
            || filePath === MILESTONE_PATH_REL
          ))
          : []),
      ].filter(Boolean);
      if (dryRun) {
        printDryRunArtifact('json', `${JSON.stringify(outputJson, null, 2)}\n`);
      }
    } else if (jsonKind === 'ui-quality-task-shard') {
      const existing = loadJsonFileIfExists(jsonPath);
      outputJson = upsertTaskInUiShard(existing, task);
      writeJson(jsonPath, outputJson, dryRun);
    } else if (jsonKind === 'task-aggregate') {
      const existing = loadJsonFileIfExists(jsonPath);
      outputJson = upsertTaskInAggregate(existing, task);
      writeJson(jsonPath, outputJson, dryRun);
    } else {
      outputJson = task;
      writeJson(jsonPath, outputJson, dryRun);
    }
  } else if (dryRun) {
    printDryRunArtifact('json', `${JSON.stringify(task, null, 2)}\n`);
  }

  if (pendingTaskIdReservation && !dryRun) {
    const lockFiles = lockFilesOverride || [
      relativeOutputFile(mdOutArg),
      relativeOutputFile(jsonOutArg),
    ];
    if (assignDocId && mdKind === 'agent-briefs') {
      lockFiles.push('docs/doc-id-registry-shards/registry-task.json');
    }
    finalizePendingTaskIdReservation(task, owner, lockFiles);
  }

  const outputSummary = {
    id: task.id,
    mdKind,
    briefStyle: inferBriefStyle(task, task.brief.style, mdKind),
    jsonKind,
    mdOut: mdOutArg ? path.relative(PROJECT_ROOT, resolvePath(mdOutArg)) : '',
    jsonOut: jsonOutArg ? path.relative(PROJECT_ROOT, resolvePath(jsonOutArg)) : '',
    dryRun,
  };

  console.log(JSON.stringify(outputSummary, null, 2));
  return outputSummary;
}

async function runTaskCardOpenerWithOptions(options = {}) {
  return main(options);
}

async function runTaskCardOpener(argv = process.argv) {
  return runTaskCardOpenerWithOptions(parseTaskCardOpenerOptions(argv));
}

async function runCli(argv = process.argv) {
  try {
    await runTaskCardOpener(argv);
  } catch (error) {
    console.error(`[task-card-opener] ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  parseTaskCardOpenerOptions,
  runCli,
  runTaskCardOpener,
  runTaskCardOpenerWithOptions,
};
