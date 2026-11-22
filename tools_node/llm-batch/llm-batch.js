#!/usr/bin/env node
'use strict';
/**
 * 可重用的 Anthropic Message Batches 批次工具。
 *
 * 用法：
 *   node tools_node/llm-batch/llm-batch.js <task.json> [--out result.jsonl] [--cap-usd 2] [--dry-run] [--poll-sec 30]
 *
 * 任務 JSON：
 *   {
 *     "name": "hall-chat-trial",
 *     "model": "claude-sonnet-5-5",
 *     "maxTokens": 1200,
 *     "effort": "medium",                     // 選填：output_config.effort
 *     "thinking": { "type": "disabled" },       // 選填：Sonnet 5.5 用 between_tools、Haiku 5.5 用 disabled
 *     "system": "系統提示",
 *     "promptTemplate": "請為 {{name}} 寫…",   // {{欄位}} 取自每列資料
 *     "schema": { ...JSON schema... },        // 選填：輸出結構（同時送給 API 並在本機驗證）
 *     "rows": [ { "id": "zhao-yun", "name": "趙雲" } ]
 *   }
 *
 * 金鑰只讀 SANGUO_ANTHROPIC_API_KEY，不印出、不寫檔。單批預估費用超過 --cap-usd（預設 2）就不送出。
 */
const fs = require('fs');
const path = require('path');

/** 每百萬 token 的美元單價（來源：claude-api skill 快取 2026-11-03）。批次 API 另乘 0.5。 */
const PRICES = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
};
const BATCH_DISCOUNT = 0.5;
const DEFAULT_CAP_USD = 2;
const DEFAULT_MODEL = 'claude-haiku-5-5';

function priceOf(model) {
  const p = PRICES[model];
  if (!p) throw new Error('未知模型單價：' + model);
  return p;
}

/** 由回應 usage 算實際費用（已套批次折扣）。 */
function usageCost(model, usage, batch = true) {
  const p = priceOf(model);
  const u = usage || {};
  const input = u.input_tokens || 0;
  const out = u.output_tokens || 0;
  const cw = u.cache_creation_input_tokens || 0;
  const cr = u.cache_read_input_tokens || 0;
  const usd = (input * p.input + out * p.output + cw * p.input * 1.25 + cr * p.cacheRead) / 1e6;
  return batch ? usd * BATCH_DISCOUNT : usd;
}

function renderPrompt(template, row) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in row)) throw new Error(`資料列 ${row.id} 缺欄位 ${k}`);
    const v = row[k];
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

/** 保守估算 token：CJK 約 1 字 1 token，其他約 4 字 1 token。 */
function estimateTokens(text) {
  let cjk = 0;
  for (const ch of text) if (ch.charCodeAt(0) > 0x2e80) cjk++;
  return cjk + Math.ceil((text.length - cjk) / 4);
}

/** API 的結構化輸出不支援 minItems(>1)/maxItems/長度限制，送出時剝掉，改在本機驗證。 */
function stripUnsupported(schema) {
  if (Array.isArray(schema)) return schema.map(stripUnsupported);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (['minItems', 'maxItems', 'minLength', 'maxLength'].includes(k)) continue;
    out[k] = stripUnsupported(v);
  }
  return out;
}

function buildRequests(task) {
  if (!task.model) throw new Error('任務缺 model');
  if (!task.promptTemplate) throw new Error('任務缺 promptTemplate');
  if (!Array.isArray(task.rows) || task.rows.length === 0) throw new Error('任務 rows 為空');
  const ids = new Set();
  return task.rows.map((row) => {
    if (!row.id || ids.has(row.id)) throw new Error('資料列 id 缺漏或重複：' + row.id);
    ids.add(row.id);
    const params = {
      model: task.model,
      max_tokens: task.maxTokens || 1500,
      messages: [{ role: 'user', content: renderPrompt(task.promptTemplate, row) }],
    };
    if (task.thinking) params.thinking = task.thinking;
    if (task.system) params.system = task.system;
    const oc = {};
    if (task.effort) oc.effort = task.effort;
    if (task.schema) oc.format = { type: 'json_schema', schema: stripUnsupported(task.schema) };
    if (Object.keys(oc).length) params.output_config = oc;
    return { custom_id: row.id, params };
  });
}

/** 送出前的費用上界：輸入全價估算 + 輸出以 max_tokens 的 estOutputRatio 計。 */
function estimateBatchCost(requests, estOutputRatio = 0.6) {
  let usd = 0;
  for (const r of requests) {
    const p = priceOf(r.params.model);
    const inTok = estimateTokens((r.params.system || '') + r.params.messages[0].content) + 50;
    const outTok = r.params.max_tokens * estOutputRatio;
    usd += (inTok * p.input + outTok * p.output) / 1e6;
  }
  return usd * BATCH_DISCOUNT;
}

/** 極簡 JSON schema 驗證（type / properties / required / items / enum / minLength / maxLength / minItems / maxItems）。回傳錯誤字串陣列。 */
function validateSchema(value, schema, at = '$') {
  const errs = [];
  if (!schema) return errs;
  const t = schema.type;
  const typeOk = (ty) => {
    if (ty === 'array') return Array.isArray(value);
    if (ty === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (ty === 'integer') return Number.isInteger(value);
    if (ty === 'null') return value === null;
    return typeof value === ty;
  };
  if (t && !(Array.isArray(t) ? t.some(typeOk) : typeOk(t))) {
    errs.push(`${at} 型別應為 ${t}`);
    return errs;
  }
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${at} 不在 enum 內`);
  if (typeof value === 'string') {
    if (schema.minLength != null && [...value].length < schema.minLength) errs.push(`${at} 太短`);
    if (schema.maxLength != null && [...value].length > schema.maxLength) errs.push(`${at} 太長`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push(`${at} 項數不足`);
    if (schema.maxItems != null && value.length > schema.maxItems) errs.push(`${at} 項數過多`);
    if (schema.items) value.forEach((v, i) => errs.push(...validateSchema(v, schema.items, `${at}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) errs.push(`${at}.${k} 缺少`);
    for (const [k, s] of Object.entries(schema.properties || {})) if (k in value) errs.push(...validateSchema(value[k], s, `${at}.${k}`));
  }
  return errs;
}

function extractText(message) {
  return (message.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

/** 把一筆批次結果轉成輸出列（含解析、驗證、費用）。 */
function processResult(entry, task) {
  const row = { id: entry.custom_id, ok: false, costUsd: 0 };
  const res = entry.result;
  row.status = res.type;
  if (res.type !== 'succeeded') {
    row.error = res.error ? (res.error.error ? res.error.error.message : res.error.message) || res.error.type : res.type;
    return row;
  }
  row.costUsd = usageCost(task.model, res.message.usage, true);
  row.usage = res.message.usage;
  row.stopReason = res.message.stop_reason;
  const text = extractText(res.message);
  if (task.schema) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { row.error = 'JSON 解析失敗'; row.raw = text; return row; }
    const errs = validateSchema(parsed, task.schema);
    row.data = parsed;
    if (errs.length) { row.error = '結構驗證失敗：' + errs.slice(0, 5).join('；'); return row; }
  } else {
    row.data = text;
  }
  row.ok = true;
  return row;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 送出 → 輪詢 → 收結果。client 可注入（測試用假資料）。 */
async function runBatch(task, client, opts = {}) {
  const cap = opts.capUsd != null ? opts.capUsd : DEFAULT_CAP_USD;
  const requests = buildRequests(task);
  const estimate = estimateBatchCost(requests);
  if (estimate > cap) throw new Error(`預估費用 $${estimate.toFixed(3)} 超過單批上限 $${cap}，不送出`);
  if (opts.dryRun) return { dryRun: true, estimateUsd: estimate, requests: requests.length, rows: [] };
  const batch = await client.messages.batches.create({ requests });
  let cur = batch;
  while (cur.processing_status !== 'ended') {
    await sleep(opts.pollMs != null ? opts.pollMs : 30000);
    cur = await client.messages.batches.retrieve(batch.id);
    if (opts.onPoll) opts.onPoll(cur);
  }
  const rows = [];
  for await (const entry of await client.messages.batches.results(batch.id)) rows.push(processResult(entry, task));
  rows.sort((a, b) => (a.id < b.id ? -1 : 1));
  const costUsd = rows.reduce((s, r) => s + r.costUsd, 0);
  return { batchId: batch.id, estimateUsd: estimate, costUsd, rows, okCount: rows.filter((r) => r.ok).length };
}

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

async function main() {
  const argv = process.argv.slice(2);
  const taskFile = argv.find((a) => !a.startsWith('--'));
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  if (!taskFile) throw new Error('用法：llm-batch.js <task.json> [--out f.jsonl] [--cap-usd 2] [--dry-run]');
  const task = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
  const out = opt('--out', path.join('artifacts', 'llm-batch', (task.name || 'task') + '.jsonl'));
  const key = process.env.SANGUO_ANTHROPIC_API_KEY;
  const dryRun = argv.includes('--dry-run');
  if (!key && !dryRun) throw new Error('環境變數 SANGUO_ANTHROPIC_API_KEY 未設定');
  const Anthropic = dryRun ? null : require('@anthropic-ai/sdk');
  const client = dryRun ? null : new (Anthropic.default || Anthropic)({ apiKey: key });
  const r = await runBatch(task, client, {
    capUsd: Number(opt('--cap-usd', DEFAULT_CAP_USD)),
    dryRun,
    pollMs: Number(opt('--poll-sec', 30)) * 1000,
    onPoll: (b) => console.log(`狀態 ${b.processing_status}，處理中 ${b.request_counts.processing}`),
  });
  if (r.dryRun) { console.log(`試算：${r.requests} 筆，預估 $${r.estimateUsd.toFixed(4)}`); return; }
  writeJsonl(out, r.rows);
  console.log(`批次 ${r.batchId}：成功 ${r.okCount}/${r.rows.length}，預估 $${r.estimateUsd.toFixed(4)}，實際 $${r.costUsd.toFixed(4)}，輸出 ${out}`);
  const logLine = { ts: new Date().toISOString(), name: task.name, model: task.model, batchId: r.batchId, rows: r.rows.length, ok: r.okCount, costUsd: r.costUsd };
  fs.appendFileSync(path.join('artifacts', 'llm-batch', 'batch-runs.jsonl'), JSON.stringify(logLine) + '\n');
}

if (require.main === module) {
  main().catch((e) => { console.error('llm-batch 失敗：', String(e && e.message ? e.message : e)); process.exit(1); });
}
module.exports = { stripUnsupported, DEFAULT_MODEL, PRICES, usageCost, renderPrompt, buildRequests, estimateBatchCost, validateSchema, processResult, runBatch, estimateTokens };
