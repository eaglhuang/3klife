const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(PROJECT_ROOT, 'docs', 'agent-briefs', 'tasks');
const TASKS_REL_DIR = path.relative(PROJECT_ROOT, TASKS_DIR);
const TASKS_INDEX_PATH = path.join(PROJECT_ROOT, 'docs', 'agent-briefs', 'tasks_index.md');
const CHECKLIST_PATH = path.join(PROJECT_ROOT, 'docs', 'agent-briefs', 'CheckList.md');
const STATUS_ORDER = ['done', 'completed', 'in-progress', 'in-review', 'open', 'not-started'];
const { listTaskCardFiles } = require('./lib/task-card-paths');

function parseArgs(argv) {
  const options = {
    write: false,
    syncProgress: false,
    json: false,
    ids: null,
    indexOnly: false,
    checklistOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write') {
      options.write = true;
      continue;
    }
    if (arg === '--sync-progress') {
      options.syncProgress = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--index-only') {
      options.indexOnly = true;
      continue;
    }
    if (arg === '--checklist-only') {
      options.checklistOnly = true;
      continue;
    }
    if (arg === '--ids') {
      const raw = argv[index + 1];
      if (!raw) {
        throw new Error('--ids 需要逗號分隔的 task ids');
      }
      options.ids = new Set(raw.split(',').map((value) => value.trim()).filter(Boolean));
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    throw new Error(`未知參數：${arg}`);
  }

  if (options.indexOnly && options.checklistOnly) {
    throw new Error('--index-only 與 --checklist-only 不能同時使用');
  }

  return options;
}

function printHelp() {
  console.log([
    '用法: node tools_node/sync-task-briefs-from-cards.js [options]',
    '',
    '選項:',
    '  --write            將偵測到的 mismatch 寫回 tasks_index / CheckList',
    '  --sync-progress    同步 CheckList 的 完成度% 到 task card 內文的 完成度',
    '  --ids <a,b,c>      只處理指定 task ids',
    '  --index-only       只檢查/同步 tasks_index.md',
    '  --checklist-only   只檢查/同步 CheckList.md',
    '  --json             以 JSON 輸出結果',
  ].join('\n'));
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) continue;
    result[keyMatch[1]] = keyMatch[2].trim().replace(/^"|"$/g, '');
  }
  return result;
}

function parseTaskCard(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseFrontmatter(text);
  const progressMatch = text.match(/\|\s*完成度\s*\|\s*([^|]+?)\s*\|/);
  return {
    id: frontmatter.id || null,
    status: frontmatter.status || null,
    progress: progressMatch ? progressMatch[1].trim() : null,
  };
}

function loadTaskCards() {
  const cards = new Map();
  for (const filePath of listTaskCardFiles(PROJECT_ROOT, TASKS_REL_DIR).sort()) {
    const card = parseTaskCard(filePath);
    if (!card.id || !card.status) continue;
    cards.set(card.id, card);
  }
  return cards;
}

function shouldProcess(id, options) {
  return !options.ids || options.ids.has(id);
}

function replacePipeCell(line, cellIndex, nextValue) {
  const parts = line.split('|');
  if (parts.length <= cellIndex) return line;
  parts[cellIndex] = ` ${nextValue} `;
  return parts.join('|');
}

function buildSummaryLines(cards) {
  const counts = new Map();
  for (const card of cards.values()) {
    counts.set(card.status, (counts.get(card.status) || 0) + 1);
  }

  const lines = [`- Total: ${cards.size}`];
  for (const status of STATUS_ORDER) {
    if (counts.has(status)) {
      lines.push(`- ${status}: ${counts.get(status)}`);
      counts.delete(status);
    }
  }

  for (const status of [...counts.keys()].sort()) {
    lines.push(`- ${status}: ${counts.get(status)}`);
  }

  return lines;
}

function syncSummary(lines, cards) {
  const summaryHeaderIndex = lines.findIndex((line) => line.trim() === '## Summary');
  const tasksHeaderIndex = lines.findIndex((line, index) => index > summaryHeaderIndex && line.trim() === '## Tasks');
  if (summaryHeaderIndex < 0 || tasksHeaderIndex < 0) {
    throw new Error('找不到 tasks_index.md 的 Summary 區塊');
  }

  return [
    ...lines.slice(0, summaryHeaderIndex),
    '## Summary',
    '',
    ...buildSummaryLines(cards),
    '',
    ...lines.slice(tasksHeaderIndex),
  ];
}

function updateTasksIndex(text, cards, options) {
  const lines = text.split(/\r?\n/);
  const mismatches = [];
  let updatedRows = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('|')) continue;
    const idMatch = line.match(/\|\s*([A-Z]+-[0-9]+-[0-9]+)\s*\|/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (!shouldProcess(id, options)) continue;
    const card = cards.get(id);
    if (!card) continue;
    const cells = line.split('|').map((part) => part.trim());
    const currentStatus = cells[3] || '';
    if (currentStatus !== card.status) {
      mismatches.push({ line: index + 1, id, currentStatus, expectedStatus: card.status });
      if (options.write) {
        lines[index] = replacePipeCell(line, 3, card.status);
        updatedRows += 1;
      }
    }
  }

  const nextLines = options.write ? syncSummary(lines, cards) : lines;
  return {
    text: nextLines.join('\n'),
    mismatches,
    updatedRows,
    updatedSummary: options.write,
  };
}

function updateChecklist(text, cards, options) {
  const lines = text.split(/\r?\n/);
  const statusMismatches = [];
  const progressMismatches = [];
  let updatedStatusRows = 0;
  let updatedProgressRows = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('|')) continue;
    const idMatch = line.match(/\[([A-Z]+-[0-9]+-[0-9]+)\]/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (!shouldProcess(id, options)) continue;
    const card = cards.get(id);
    if (!card) continue;

    const cells = line.split('|').map((part) => part.trim());
    const currentStatus = cells[4] || '';
    const currentProgress = cells[5] || '';
    let nextLine = line;

    if (currentStatus !== card.status) {
      statusMismatches.push({ line: index + 1, id, currentStatus, expectedStatus: card.status });
      if (options.write) {
        nextLine = replacePipeCell(nextLine, 4, card.status);
        updatedStatusRows += 1;
      }
    }

    if (options.syncProgress && card.progress && currentProgress !== card.progress) {
      progressMismatches.push({ line: index + 1, id, currentProgress, expectedProgress: card.progress });
      if (options.write) {
        nextLine = replacePipeCell(nextLine, 5, card.progress);
        updatedProgressRows += 1;
      }
    }

    lines[index] = nextLine;
  }

  return {
    text: lines.join('\n'),
    statusMismatches,
    progressMismatches,
    updatedStatusRows,
    updatedProgressRows,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const cards = loadTaskCards();
  const result = {
    mode: options.write ? 'write' : 'check',
    syncProgress: options.syncProgress,
    ids: options.ids ? [...options.ids] : null,
    tasksIndex: null,
    checkList: null,
  };

  if (!options.checklistOnly) {
    const original = fs.readFileSync(TASKS_INDEX_PATH, 'utf8');
    const next = updateTasksIndex(original, cards, options);
    result.tasksIndex = {
      mismatches: next.mismatches,
      updatedRows: next.updatedRows,
      updatedSummary: next.updatedSummary,
    };
    if (options.write && next.text !== original) {
      fs.writeFileSync(TASKS_INDEX_PATH, next.text, 'utf8');
    }
  }

  if (!options.indexOnly) {
    const original = fs.readFileSync(CHECKLIST_PATH, 'utf8');
    const next = updateChecklist(original, cards, options);
    result.checkList = {
      statusMismatches: next.statusMismatches,
      progressMismatches: next.progressMismatches,
      updatedStatusRows: next.updatedStatusRows,
      updatedProgressRows: next.updatedProgressRows,
    };
    if (options.write && next.text !== original) {
      fs.writeFileSync(CHECKLIST_PATH, next.text, 'utf8');
    }
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[sync-task-briefs-from-cards] mode=${result.mode}${options.ids ? ` ids=${[...options.ids].join(',')}` : ''}`);
  if (result.tasksIndex) {
    console.log(`[sync-task-briefs-from-cards] tasks_index status mismatches=${result.tasksIndex.mismatches.length} updatedRows=${result.tasksIndex.updatedRows} updatedSummary=${result.tasksIndex.updatedSummary ? 'yes' : 'no'}`);
  }
  if (result.checkList) {
    console.log(`[sync-task-briefs-from-cards] CheckList status mismatches=${result.checkList.statusMismatches.length} updatedStatusRows=${result.checkList.updatedStatusRows}`);
    console.log(`[sync-task-briefs-from-cards] CheckList progress mismatches=${result.checkList.progressMismatches.length} updatedProgressRows=${result.checkList.updatedProgressRows}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`[sync-task-briefs-from-cards] ${error.message}`);
  process.exit(1);
}