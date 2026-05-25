#!/usr/bin/env node
// Renders the regenerable blocks inside governance-overview.md.
// Idempotent: only the content between block markers is replaced; narrative outside is preserved.
//
// Usage:
//   node render-governance-overview.mjs                        (default: --check)
//   node render-governance-overview.mjs --check
//   node render-governance-overview.mjs --write
//   node render-governance-overview.mjs --write --target <path>
//   node render-governance-overview.mjs --framework-root <path>
//
// Source resolution order:
//   1. --framework-root <path>
//   2. ATM_FRAMEWORK_ROOT env var
//   3. Walk up from the script directory looking for atomic-registry.json + .atm/charter/charter-invariants.json
//   4. Error
//
// Target file resolution:
//   - --target <path>, else sibling governance-overview.md next to this script.
//
// Exit codes:
//   0 = file is in sync (or was successfully written)
//   2 = drift detected (--check mode; file content does not match render)
//   1 = source data missing or other error

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultTarget = path.join(scriptDir, 'governance-overview.md');

const BLOCK_KEYS = ['registry', 'behaviors', 'invariants', 'recent-commits', 'cli-cheatsheet'];

function parseArgs(argv) {
  const args = { mode: 'check', target: defaultTarget, frameworkRoot: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') args.mode = 'check';
    else if (arg === '--write') args.mode = 'write';
    else if (arg === '--target') {
      args.target = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--framework-root') {
      args.frameworkRoot = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.mode = 'help';
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'render-governance-overview.mjs — regenerate machine-rendered blocks',
      '',
      'Usage:',
      '  node render-governance-overview.mjs [--check | --write] \\',
      '       [--target <path>] [--framework-root <path>]',
      '',
      'Modes:',
      '  --check (default)  Compute desired content and compare with file. Exit 2 on drift.',
      '  --write            Overwrite the regenerable blocks in place. Idempotent.',
      '',
      'Source data (atomic-registry, charter, behavior-taxonomy, git log) is read from',
      'the AI-Atomic-Framework checkout, located by:',
      '  1. --framework-root <path>',
      '  2. ATM_FRAMEWORK_ROOT env var',
      '  3. walking up from script directory looking for atomic-registry.json',
      '',
      'Blocks rendered (between <!-- atm:gen:KEY --> ... <!-- atm:gen:KEY:end --> markers):',
      ...BLOCK_KEYS.map((k) => `  - ${k}`),
      ''
    ].join('\n')
  );
}

function isFrameworkRoot(candidate) {
  // Framework-only signals: every adopter has atomic-registry.json and .atm/charter/,
  // but only the AI-Atomic-Framework checkout has the public English governance docs
  // and the packages/core source tree.
  return (
    existsSync(path.join(candidate, 'atomic-registry.json')) &&
    existsSync(path.join(candidate, '.atm', 'charter', 'charter-invariants.json')) &&
    existsSync(path.join(candidate, 'docs', 'governance', 'behavior-taxonomy.md')) &&
    existsSync(path.join(candidate, 'packages', 'core'))
  );
}

function resolveFrameworkRoot(args) {
  if (args.frameworkRoot) {
    if (!isFrameworkRoot(args.frameworkRoot)) {
      throw new Error(
        `--framework-root path does not look like an AI-Atomic-Framework checkout: ${args.frameworkRoot}\n` +
          `expected files: atomic-registry.json and .atm/charter/charter-invariants.json`
      );
    }
    return args.frameworkRoot;
  }
  const env = process.env.ATM_FRAMEWORK_ROOT;
  if (env) {
    const resolved = path.resolve(env);
    if (!isFrameworkRoot(resolved)) {
      throw new Error(
        `ATM_FRAMEWORK_ROOT path does not look like an AI-Atomic-Framework checkout: ${resolved}\n` +
          `expected files: atomic-registry.json and .atm/charter/charter-invariants.json`
      );
    }
    return resolved;
  }
  let dir = scriptDir;
  for (let i = 0; i < 8; i += 1) {
    if (isFrameworkRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `cannot locate AI-Atomic-Framework checkout.\n` +
      `pass --framework-root <path> or set ATM_FRAMEWORK_ROOT.`
  );
}

function readJsonFile(absPath) {
  if (!existsSync(absPath)) {
    throw new Error(`source file missing: ${absPath}`);
  }
  const raw = readFileSync(absPath, 'utf8');
  return JSON.parse(raw);
}

function readTextFile(absPath) {
  if (!existsSync(absPath)) {
    throw new Error(`source file missing: ${absPath}`);
  }
  return readFileSync(absPath, 'utf8');
}

function hashLockPrefix(hashLock) {
  if (!hashLock || typeof hashLock.digest !== 'string') return '—';
  const digest = hashLock.digest;
  const match = digest.match(/^(sha256:)([0-9a-f]+)$/i);
  if (!match) return digest;
  return `${match[1]}${match[2].slice(0, 12)}`;
}

function renderRegistry(frameworkRoot) {
  const registry = readJsonFile(path.join(frameworkRoot, 'atomic-registry.json'));
  const lines = [];
  lines.push('| atomId | logicalName | status | tier | specPath | hashLock (前 12 hex) |');
  lines.push('| ------ | ----------- | ------ | ---- | -------- | -------------------- |');
  const entries = Array.isArray(registry.entries) ? registry.entries : [];
  for (const entry of entries) {
    const atomId = entry.atomId ?? '—';
    const logicalName = entry.logicalName ?? '—';
    const status = entry.status ?? '—';
    const tier = entry?.governance?.tier ?? '—';
    const specPath = entry.specPath ?? '—';
    const hash = hashLockPrefix(entry.hashLock);
    lines.push(`| ${atomId} | ${logicalName} | ${status} | ${tier} | ${specPath} | ${hash} |`);
  }
  lines.push('');
  const generatedAt = registry.generatedAt ?? 'unknown';
  lines.push(`來源：\`atomic-registry.json\` (generatedAt: ${generatedAt})`);
  return lines.join('\n');
}

function renderBehaviors(frameworkRoot) {
  const taxonomyPath = path.join(frameworkRoot, 'docs', 'governance', 'behavior-taxonomy.md');
  const raw = readTextFile(taxonomyPath);
  const lines = raw.split(/\r?\n/);
  const trimmed = [];
  let skippedTitle = false;
  for (const line of lines) {
    if (!skippedTitle && /^#\s+/.test(line)) {
      skippedTitle = true;
      continue;
    }
    trimmed.push(line);
  }
  const body = trimmed.join('\n').trim();
  return `${body}\n\n來源：\`docs/governance/behavior-taxonomy.md\``;
}

function renderInvariants(frameworkRoot) {
  const invariantsPath = path.join(frameworkRoot, '.atm', 'charter', 'charter-invariants.json');
  const charterPath = path.join(frameworkRoot, '.atm', 'charter', 'atomic-charter.md');
  const invariants = readJsonFile(invariantsPath);
  if (!existsSync(charterPath)) {
    throw new Error(`charter file missing: ${charterPath}`);
  }
  const lines = [];
  lines.push(`**Charter 版本**：${invariants.charterVersion ?? 'unknown'}  `);
  lines.push(`**最後修訂**：${invariants.lastAmendedAt ?? 'unknown'}  `);
  lines.push(`**Schema**：\`${invariants.schemaId ?? 'unknown'}\` / ${invariants.schemaVersion ?? 'unknown'}  `);
  const list = Array.isArray(invariants.invariants) ? invariants.invariants : [];
  lines.push(`**Invariants 數**：${list.length}`);
  lines.push('');
  lines.push('| ID | Title | Enforcement | Breaking | Tags |');
  lines.push('|----|-------|-------------|----------|------|');
  for (const inv of list) {
    const tags = Array.isArray(inv.tags) ? inv.tags.join(', ') : '—';
    const breaking = inv.breakingChange ? 'yes' : 'no';
    lines.push(`| ${inv.id} | ${inv.title} | ${inv.enforcement} | ${breaking} | ${tags} |`);
  }
  lines.push('');
  for (const inv of list) {
    lines.push(`#### ${inv.id} — ${inv.title}`);
    lines.push('');
    lines.push(`> ${inv.rule}`);
    lines.push('');
    if (inv.rationale) {
      lines.push(`**Rationale**：${inv.rationale}`);
      lines.push('');
    }
  }
  lines.push(`來源：\`.atm/charter/charter-invariants.json\` / \`.atm/charter/atomic-charter.md\``);
  return lines.join('\n');
}

function renderRecentCommits(frameworkRoot) {
  const result = spawnSync('git', ['log', '--format=%h|%ad|%s', '--date=short', '-15'], {
    cwd: frameworkRoot,
    encoding: 'utf8',
    shell: false
  });
  if (result.error) {
    throw new Error(`git log failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`git log exited with ${result.status}: ${stderr}`);
  }
  const output = result.stdout || '';
  const lines = [];
  lines.push('**範圍**：最近 15 個 AI-Atomic-Framework commit（含非 governance）');
  lines.push('');
  lines.push('| Commit | 日期 | 訊息 |');
  lines.push('|--------|------|------|');
  for (const row of output.split(/\r?\n/)) {
    const trimmed = row.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('|');
    if (parts.length < 3) continue;
    const sha = parts[0];
    const date = parts[1];
    const message = parts.slice(2).join('|');
    lines.push(`| ${sha} | ${date} | ${escapeTableCell(message)} |`);
  }
  lines.push('');
  lines.push('來源：`git log --format="%h|%ad|%s" --date=short -15`（執行於 framework-root）');
  return lines.join('\n');
}

function renderCliCheatsheet(frameworkRoot) {
  const sections = [
    {
      title: '部署 / 維運',
      commands: [
        'node release/atm-onefile/atm.mjs internal-release sync --repo <path> --json',
        'node release/atm-onefile/atm.mjs internal-release sync --repo <path> --skip <name> --json',
        'node release/atm-onefile/atm.mjs internal-release sync --repo <path> --dry-run --json'
      ]
    },
    {
      title: 'ORIENT / NEXT',
      commands: [
        'node atm.mjs orient --cwd . --json',
        'node atm.mjs doctor --cwd . --json',
        'node atm.mjs next --json',
        'node atm.mjs next --prompt "<description>" --json',
        'node atm.mjs next --intent path/to/intent.json --json'
      ]
    },
    {
      title: 'LOCK',
      commands: [
        'node atm.mjs lock check --workItem <id> --json',
        'node atm.mjs lock acquire --workItem <id> --files <comma-separated> --reason "<text>" --json',
        'node atm.mjs lock release --workItem <id> --json'
      ]
    },
    {
      title: 'EVIDENCE',
      commands: [
        'node atm.mjs evidence add --task <id> --actor <actor> --kind test --summary "<text>" --artifacts <path> --json',
        'node atm.mjs evidence verify --task <id> --gate close --json',
        'node atm.mjs evidence verify --task <id> --gate commit --json',
        'node atm.mjs evidence verify --task <id> --gate pr --json'
      ]
    },
    {
      title: 'HANDOFF',
      commands: ['node atm.mjs handoff summarize --task <id> --json']
    },
    {
      title: 'CLOSURE',
      commands: [
        'node atm.mjs tasks close --task <id> --actor <actor> --status done --json',
        'node atm.mjs tasks audit --json'
      ]
    },
    {
      title: '原子操作',
      commands: [
        'node atm.mjs create --bucket CORE --title "<title>" --description "<text>" --json',
        'node atm.mjs registry list --json',
        'node atm.mjs spec --validate <path> --json'
      ]
    },
    {
      title: 'Framework mode',
      commands: ['node atm.mjs framework-mode status --json']
    }
  ];
  const cliCommandsDir = path.join(frameworkRoot, 'packages', 'cli', 'src', 'commands');
  const cliExists = existsSync(cliCommandsDir);
  const lines = [];
  for (const section of sections) {
    lines.push(`**${section.title}**`);
    lines.push('```bash');
    for (const cmd of section.commands) {
      lines.push(cmd);
    }
    lines.push('```');
    lines.push('');
  }
  const source = cliExists ? '`packages/cli/src/commands/`（於 framework-root）' : '（CLI 命令目錄不可見）';
  lines.push(`來源：${source}`);
  return lines.join('\n').trimEnd();
}

function escapeTableCell(text) {
  return text.replace(/\|/g, '\\|');
}

function buildBlockRegex(key) {
  const open = `<!-- atm:gen:${key} -->`;
  const close = `<!-- atm:gen:${key}:end -->`;
  const openEscaped = open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const closeEscaped = close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${openEscaped}[\\s\\S]*?${closeEscaped}`, 'm');
}

function applyBlocks(content, frameworkRoot) {
  const renderers = {
    registry: () => renderRegistry(frameworkRoot),
    behaviors: () => renderBehaviors(frameworkRoot),
    invariants: () => renderInvariants(frameworkRoot),
    'recent-commits': () => renderRecentCommits(frameworkRoot),
    'cli-cheatsheet': () => renderCliCheatsheet(frameworkRoot)
  };
  let next = content;
  for (const key of BLOCK_KEYS) {
    const open = `<!-- atm:gen:${key} -->`;
    const close = `<!-- atm:gen:${key}:end -->`;
    const re = buildBlockRegex(key);
    if (!re.test(next)) {
      throw new Error(`target file is missing block marker pair for "${key}" (expected ${open} ... ${close})`);
    }
    const rendered = renderers[key]();
    const replacement = `${open}\n${rendered}\n${close}`;
    next = next.replace(re, replacement);
  }
  return next;
}

function displayPath(absPath) {
  const rel = path.relative(process.cwd(), absPath);
  return rel && !rel.startsWith('..') ? rel : absPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'help') {
    printHelp();
    return 0;
  }
  let frameworkRoot;
  try {
    frameworkRoot = resolveFrameworkRoot(args);
  } catch (err) {
    process.stderr.write(`error: ${err?.message ?? err}\n`);
    return 1;
  }
  const target = args.target;
  if (!existsSync(target)) {
    process.stderr.write(`error: target file does not exist: ${target}\n`);
    return 1;
  }
  const before = readFileSync(target, 'utf8');
  let after;
  try {
    after = applyBlocks(before, frameworkRoot);
  } catch (err) {
    process.stderr.write(`error: ${err?.message ?? err}\n`);
    return 1;
  }
  if (args.mode === 'check') {
    if (before === after) {
      process.stdout.write(`OK ${displayPath(target)} is in sync (framework-root: ${frameworkRoot})\n`);
      return 0;
    }
    process.stderr.write(
      `drift: ${displayPath(target)} regenerable blocks do not match source.\n` +
        `run: node render-governance-overview.mjs --write\n`
    );
    return 2;
  }
  if (args.mode === 'write') {
    if (before === after) {
      process.stdout.write(`unchanged ${displayPath(target)} (already in sync)\n`);
      return 0;
    }
    writeFileSync(target, after, 'utf8');
    process.stdout.write(`wrote ${displayPath(target)} (framework-root: ${frameworkRoot})\n`);
    return 0;
  }
  process.stderr.write(`error: unknown mode ${args.mode}\n`);
  return 1;
}

process.exit(main());
