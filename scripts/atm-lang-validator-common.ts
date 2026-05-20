const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function repoPath(...parts) {
  return path.join(REPO_ROOT, ...parts);
}

function readText(relativePath) {
  const fullPath = repoPath(relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function readLines(relativePath) {
  return readText(relativePath).split(/\r?\n/);
}

function splitMarkdownRow(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function findLine(lines, pattern) {
  if (typeof pattern === 'string') {
    return lines.findIndex((line) => line.trim() === pattern.trim());
  }
  return lines.findIndex((line) => pattern.test(line));
}

function collectTableRows(lines, headerMatcher, rowMatcher) {
  const headerIdx = findLine(lines, headerMatcher);
  if (headerIdx < 0) {
    return [];
  }

  const rows = [];
  for (let i = headerIdx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) {
      break;
    }
    if (rowMatcher && !rowMatcher.test(line)) {
      continue;
    }
    rows.push(splitMarkdownRow(line));
  }
  return rows;
}

function collectBulletLines(lines, sectionTitle, stopAtTitlePrefix) {
  const startIdx = findLine(lines, new RegExp(`^${escapeRegExp(sectionTitle)}$`));
  if (startIdx < 0) {
    return [];
  }

  const bullets = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith(stopAtTitlePrefix)) {
      break;
    }
    if (line.startsWith('- ')) {
      bullets.push(line);
    }
  }
  return bullets;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFrontmatter(markdownText) {
  const result = {};
  if (!markdownText.startsWith('---')) {
    return result;
  }

  const endIdx = markdownText.indexOf('\n---', 3);
  if (endIdx < 0) {
    return result;
  }

  const frontmatter = markdownText.slice(4, endIdx).split(/\r?\n/);
  let currentArrayKey = null;

  for (const rawLine of frontmatter) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) {
      continue;
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayItemMatch && currentArrayKey) {
      const item = stripQuotes(arrayItemMatch[1].trim());
      result[currentArrayKey] = result[currentArrayKey] || [];
      result[currentArrayKey].push(item);
      continue;
    }

    const keyValueMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyValueMatch) {
      if (line.trim() === '[]' && currentArrayKey) {
        result[currentArrayKey] = [];
      }
      continue;
    }

    const key = keyValueMatch[1];
    const value = keyValueMatch[2];
    currentArrayKey = null;

    if (value === '') {
      currentArrayKey = key;
      if (!Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = [];
      }
      continue;
    }

    if (value.trim() === '[]') {
      result[key] = [];
      continue;
    }

    result[key] = stripQuotes(value.trim());
  }

  return result;
}

function stripQuotes(text) {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function listTaskCardPaths() {
  const tasksDir = repoPath('docs', 'ai_atomic_framework', 'universal-language-framework', 'tasks');
  return fs
    .readdirSync(tasksDir)
    .filter((name) => /^ATM-LANG-\d{4}\.task\.md$/.test(name))
    .map((name) => path.join(tasksDir, name));
}

function parseMode(argv) {
  const modeArg = argv.find((item) => item.startsWith('--mode='));
  if (modeArg) {
    return modeArg.split('=')[1];
  }
  const modeIdx = argv.indexOf('--mode');
  if (modeIdx >= 0 && argv[modeIdx + 1]) {
    return argv[modeIdx + 1];
  }
  return 'validate';
}

module.exports = {
  collectBulletLines,
  collectTableRows,
  listTaskCardPaths,
  parseFrontmatter,
  parseMode,
  readLines,
  readText,
  repoPath,
  splitMarkdownRow,
};

