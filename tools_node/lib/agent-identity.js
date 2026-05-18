'use strict';

const cp = require('node:child_process');
const path = require('node:path');
const projectConfig = require('./project-config');

const ROOT = projectConfig.ROOT;
const LOCAL_EMAIL_DOMAIN = '3klife.local';

const AGENT_NAME_PATTERNS = Object.freeze([
  /^vs-insiders-/i,
  /^vs-code-/i,
  /^claude-code-/i,
  /^claudecode[_-]/i,
  /^codex-/i,
  /^agent-/i,
  /^githubcopilot$/i,
  /^github-copilot/i,
  /^copilot/i,
  /^cursor$/i,
  /^aider$/i,
  /^openai(?:[-_ ].*)?$/i,
  /^gpt(?:[-_ ].*)?$/i,
  /^bot(?:[-_ ].*)?$/i,
]);

function normalizeAgentSlug(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function looksLikeAgentName(value) {
  const name = normalizeAgentSlug(value);
  if (!name) return false;
  if (name.includes('/') || name.includes('\\')) return false;
  if (AGENT_NAME_PATTERNS.some((pattern) => pattern.test(name))) return true;
  return /(^|[-_.])(agent|assistant|copilot|claude|codex|cursor|aider|gpt|bot)([-_.]|$)/i.test(name);
}

function runGitConfig(args, cwd = ROOT) {
  const proc = cp.spawnSync('git', ['config', ...args], {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (proc.error || proc.status !== 0) {
    return '';
  }
  return String(proc.stdout || '').trim();
}

function readGitUserName(cwd = ROOT) {
  return runGitConfig(['--get', 'user.name'], cwd);
}

function readGitUserEmail(cwd = ROOT) {
  return runGitConfig(['--get', 'user.email'], cwd);
}

function fallbackOriginIdentity() {
  const origin = String(process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE || '').trim();
  if (!origin) return '';
  const normalized = normalizeAgentSlug(origin.toLowerCase());
  if (!normalized) return '';
  if (/codex/.test(normalized)) {
    return 'codex-desktop';
  }
  return normalized;
}

// Detect Claude Code (claude-code CLI / Claude Desktop agent).
// Claude Code sets CLAUDECODE=1 in its execution environment.
// To include the model name, set: $env:CLAUDE_CODE_MODEL="sonnet4.6"
function claudeCodeIdentity() {
  if (process.env.CLAUDECODE !== '1') return '';
  const modelSuffix = normalizeAgentSlug(
    String(process.env.CLAUDE_CODE_MODEL || '').trim()
  );
  return modelSuffix ? `claude_code_${modelSuffix}` : 'claude_code';
}

function deriveAgentIdentity(options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : ROOT;
  const fromEnv = normalizeAgentSlug(process.env.AGENT_IDENTITY);
  if (fromEnv) {
    return {
      ok: true,
      agentName: fromEnv,
      source: 'env',
    };
  }

  const ccName = claudeCodeIdentity();
  if (ccName) {
    return {
      ok: true,
      agentName: ccName,
      source: 'claude-code-env',
    };
  }

  const originName = fallbackOriginIdentity();
  if (originName) {
    return {
      ok: true,
      agentName: originName,
      source: 'originator',
    };
  }

  const gitName = normalizeAgentSlug(readGitUserName(cwd));
  if (looksLikeAgentName(gitName)) {
    return {
      ok: true,
      agentName: gitName,
      source: 'git-config',
    };
  }

  return {
    ok: false,
    agentName: '',
    source: 'none',
  };
}

function expectedLocalEmail(agentName) {
  const slug = normalizeAgentSlug(agentName);
  if (!slug) return '';
  return `${slug}@${LOCAL_EMAIL_DOMAIN}`;
}

function writeGitIdentity(agentName, cwd = ROOT) {
  const slug = normalizeAgentSlug(agentName);
  if (!slug) {
    return {
      ok: false,
      error: 'empty-agent-name',
    };
  }
  const email = expectedLocalEmail(slug);
  const setName = cp.spawnSync('git', ['config', 'user.name', slug], {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (setName.error || setName.status !== 0) {
    return {
      ok: false,
      error: String(setName.error && (setName.error.message || setName.error) || setName.stderr || 'git config user.name failed').trim(),
    };
  }
  const setEmail = cp.spawnSync('git', ['config', 'user.email', email], {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (setEmail.error || setEmail.status !== 0) {
    return {
      ok: false,
      error: String(setEmail.error && (setEmail.error.message || setEmail.error) || setEmail.stderr || 'git config user.email failed').trim(),
    };
  }
  return {
    ok: true,
    userName: slug,
    userEmail: email,
  };
}

module.exports = {
  LOCAL_EMAIL_DOMAIN,
  deriveAgentIdentity,
  expectedLocalEmail,
  looksLikeAgentName,
  normalizeAgentSlug,
  readGitUserEmail,
  readGitUserName,
  writeGitIdentity,
};
