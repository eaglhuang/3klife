const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, 'docs', 'ui-quality-todo.json');
const indexPath = path.join(ROOT, 'docs', 'agent-briefs', 'tasks_index.md');
const shardRoot = path.join(ROOT, 'docs', 'ui-quality-tasks');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}


function buildSummary(tasks) {
  const summary = {};
  for (const task of tasks) {
    const status = task && typeof task.status === 'string' ? task.status : 'unknown';
    summary[status] = (summary[status] || 0) + 1;
  }
  return summary;
}

function formatCell(value) {
  return value == null ? '' : String(value).replace(/\|/g, '\\|');
}

function buildIndexMarkdown(tasks, summary) {
  const total = tasks.length;
  const orderedSummaryKeys = ['completed', 'done', 'in-progress', 'open'];
  const extraSummaryKeys = Object.keys(summary)
    .filter((key) => !orderedSummaryKeys.includes(key))
    .sort();
  const summaryKeys = [...orderedSummaryKeys.filter((key) => key in summary), ...extraSummaryKeys];

  const rows = tasks.map((task) => {
    const link = `[${task.id}](./tasks/${task.id}.md)`;
    return `| ${formatCell(task.id)} | ${formatCell(task.owner)} | ${formatCell(task.status)} | ${formatCell(task.priority)} | ${formatCell(task.phase)} | ${formatCell(task.type)} | ${link} |`;
  });

  return [
    '---',
    'title: UI Quality Tasks Index',
    `generated: ${new Date().toISOString().slice(0, 10)}`,
    'manifest: ../ui-quality-todo.json',
    '---',
    '',
    '# Tasks Index / UI Quality',
    '',
    '> `docs/ui-quality-tasks/*.json` 是可編輯 shard 來源。',
    '> `docs/ui-quality-todo.json` 是 shard 索引（thin manifest）；本檔由 `node tools_node/build-ui-task-manifest.js` 重建。',
    '> New UI tasks must also follow `template family -> content contract -> skin fragment -> smoke route -> docs backwrite`.',
    '> See [UI-task-card-template.md](./UI-task-card-template.md).',
    '',
    '## Summary',
    '',
    `- Total: ${total}`,
    ...summaryKeys.map((key) => `- ${key}: ${summary[key]}`),
    '',
    '## Tasks',
    '',
    '| ID | Owner | Status | Priority | Phase | Type | Link |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    ''
  ].join('\n');
}

function main() {
  const shardFiles = walkJsonFiles(shardRoot);
  const shardTasks = [];
  const shardIndex = [];

  for (const shardFile of shardFiles) {
    const shard = readJson(shardFile);
    if (shard.kind !== 'ui-quality-task-shard' || !Array.isArray(shard.tasks)) {
      continue;
    }
    shardTasks.push(...shard.tasks);
    shardIndex.push({
      file: path.relative(ROOT, shardFile),
      version: shard.version || 1,
      taskCount: shard.tasks.length
    });
  }

  const summary = buildSummary(shardTasks);
  const thinManifest = {
    kind: 'ui-quality-task-manifest',
    version: 1,
    generated: new Date().toISOString(),
    _note: 'Thin index. Full task data is in docs/ui-quality-tasks/*.json shards.',
    _usage: 'Read specific shard: docs/ui-quality-tasks/<shard>.json',
    _rebuild: 'node tools_node/build-ui-task-manifest.js',
    shards: shardIndex,
    summary
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(thinManifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(indexPath, buildIndexMarkdown(shardTasks, summary), 'utf8');

  console.log(
    JSON.stringify(
      {
        shardFiles: shardFiles.length,
        totalTasks: shardTasks.length,
        summary
        ,
        manifestPath: 'docs/ui-quality-todo.json (thin index)'
      },
      null,
      2
    )
  );
}

main();
