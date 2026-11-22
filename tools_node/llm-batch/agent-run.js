#!/usr/bin/env node
'use strict';
/**
 * 用 API 金鑰跑 Claude Agent SDK（不吃 Claude Code 訂閱額度）。
 *
 * 用法：
 *   node tools_node/llm-batch/agent-run.js --prompt-file task.md --cwd C:/path/worktree \
 *     [--model claude-haiku-5-5] [--max-usd 3] [--max-turns 30] [--log run.log] \
 *     [--tools Read,Glob,Grep,Edit,Write,Bash] [--project-settings]
 *
 * 權限：permissionMode 固定 acceptEdits，只有 --tools 列出的工具會自動放行，
 * 其他工具一律拒絕（不提供 bypassPermissions）。
 * 金鑰只讀 SANGUO_ANTHROPIC_API_KEY，只注入子程序環境，不印出、不寫 log。
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_MODEL = 'claude-haiku-5-5';
const DEFAULT_TOOLS = ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash'];

function parseArgs(argv) {
  const o = { model: DEFAULT_MODEL, maxUsd: 3, maxTurns: undefined, tools: DEFAULT_TOOLS, projectSettings: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--prompt-file') o.promptFile = next();
    else if (a === '--cwd') o.cwd = next();
    else if (a === '--model') o.model = next();
    else if (a === '--max-usd') o.maxUsd = Number(next());
    else if (a === '--max-turns') o.maxTurns = Number(next());
    else if (a === '--log') o.log = next();
    else if (a === '--tools') o.tools = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--project-settings') o.projectSettings = true;
    else throw new Error('未知參數：' + a);
  }
  if (!o.promptFile) throw new Error('缺 --prompt-file');
  if (!o.cwd) throw new Error('缺 --cwd');
  if (!(o.maxUsd > 0)) throw new Error('--max-usd 必須大於 0');
  return o;
}

/** 子程序環境：只在此程序內組出，不動系統環境變數。 */
function buildChildEnv(baseEnv) {
  const key = baseEnv.SANGUO_ANTHROPIC_API_KEY;
  if (!key) throw new Error('環境變數 SANGUO_ANTHROPIC_API_KEY 未設定');
  const env = { ...baseEnv, ANTHROPIC_API_KEY: key };
  // 確保走 API 計費，不走訂閱 / OAuth
  for (const k of ['ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_PROFILE']) delete env[k];
  return env;
}

function makeRedactor(secret) {
  return (s) => (secret ? String(s).split(secret).join('[REDACTED]') : String(s));
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const env = buildChildEnv(process.env);
  const redact = makeRedactor(env.ANTHROPIC_API_KEY);
  const prompt = fs.readFileSync(o.promptFile, 'utf8');
  const logStream = o.log ? fs.createWriteStream(o.log, { flags: 'a' }) : null;
  const log = (obj) => { if (logStream) logStream.write(redact(JSON.stringify(obj)) + '\n'); };

  const options = {
    cwd: o.cwd,
    model: o.model,
    maxBudgetUsd: o.maxUsd,
    env,
    permissionMode: 'acceptEdits',
    allowedTools: o.tools,
    settingSources: o.projectSettings ? ['project'] : [],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
  };
  if (o.maxTurns) options.maxTurns = o.maxTurns;

  const started = Date.now();
  let result = null;
  for await (const msg of query({ prompt, options })) {
    log(msg);
    if (msg.type === 'result') result = msg;
  }
  if (logStream) await new Promise((r) => logStream.end(r));

  const summary = {
    ts: new Date().toISOString(),
    model: o.model,
    cwd: o.cwd,
    promptFile: o.promptFile,
    subtype: result ? result.subtype : 'no_result',
    isError: result ? !!result.is_error : true,
    costUsd: result ? result.total_cost_usd : 0,
    turns: result ? result.num_turns : 0,
    maxUsd: o.maxUsd,
    durationMs: Date.now() - started,
  };
  const outDir = path.join(REPO_ROOT, 'artifacts', 'llm-batch');
  fs.mkdirSync(outDir, { recursive: true });
  fs.appendFileSync(path.join(outDir, 'agent-runs.jsonl'), redact(JSON.stringify(summary)) + '\n');

  console.log(`總花費(USD)：${summary.costUsd.toFixed(4)}（結束狀態：${summary.subtype}）`);
  console.log(`輪數：${summary.turns}`);
  console.log('最後回報：');
  console.log(redact(result && typeof result.result === 'string' ? result.result : '(無)'));
  process.exitCode = summary.isError ? 1 : 0;
}

if (require.main === module) {
  main().catch((e) => { console.error('agent-run 失敗：', String(e && e.message ? e.message : e)); process.exit(2); });
}
module.exports = { parseArgs, buildChildEnv, makeRedactor };
