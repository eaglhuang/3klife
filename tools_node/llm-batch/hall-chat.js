#!/usr/bin/env node
'use strict';
/**
 * 大廳武將聊天台詞：建任務檔 / 品質檢查並合併回 hall-chat-lines.json。
 *   node tools_node/llm-batch/hall-chat.js build  <out-task.json> [--count 20] [--model claude-haiku-5-5] [--limit N] [--all]
 *     --all：改為 generals.json 中「hall-chat-lines.json 還沒有台詞」的全部武將（不用 TRIAL_IDS）。
 *   node tools_node/llm-batch/hall-chat.js merge  <result.jsonl> [--write]
 * 接點：assets/resources/data/hall-map/hall-chat-lines.json（HallChatLines.ts 讀取）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const GENERALS = path.join(ROOT, 'assets/resources/data/generals.json');
const LINES = path.join(ROOT, 'assets/resources/data/hall-map/hall-chat-lines.json');

/** 第一批 20 位：宿命名將與人氣武將（不含已有台詞的趙雲、張飛、關羽、呂布）。 */
const TRIAL_IDS = ['cao-cao', 'liu-bei', 'sun-quan', 'zhuge-liang', 'zhou-yu', 'sima-yi', 'dian-wei', 'xu-zhu', 'huang-zhong', 'ma-chao',
  'lu-xun', 'taishi-ci', 'zhang-liao', 'guo-jia', 'jia-xu', 'xiahou-dun', 'jiang-wei', 'diao-chan', 'sun-shang-xiang', 'zhen-ji'];

const FORBIDDEN = ['血', '屍', '慘', '悲', '淚', '哭', '喪', '亡', '屠', '斷頭', '慟', '自盡', '戰死', '陣亡', '殺', '砍', '腦袋', '死', '遺憾', '絕望'];
const SIMPLIFIED = '这个们为说话时来对会还没开关东问间头发过实现点样学见觉长门应当总邮较给让认识';
const MAX_LEN = 36;

const SYSTEM = [
  '你是三國題材手機遊戲「史境天下」的文案。這不是嚴謹歷史，而是輕鬆搞笑的世界：',
  '武將用現代口語講典故的笑話，語氣活潑好笑，絕對不寫悲劇、不寫血腥、不寫死亡。',
  '玩家是「主公」：一位戴著頭盔誤入歷史漩渦的未來少年，武將們都叫他「主公」。',
  '時事梗極少用（全部台詞最多一成，預設不用）。不要提到「遊戲」「玩家」「AI」。',
  '一律使用繁體中文，口語，每句不超過 26 個字，不要引號、不要括號旁白、不要表情符號。',
].join('\n');

const TEMPLATE = [
  '請替武將「{{name}}」寫大廳聊天台詞（玩家點他時隨機說一句）。',
  '武將資料：{{profile}}',
  '史實哏參考（可取一個點做笑點，不必照抄）：{{anecdote}}',
  '要求：',
  '0. 硬性規定：每一句都必須在 12 到 26 個中文字之間（含標點），超過 26 字一律作廢；base 剛好 3 句、friend 剛好 1 句，不得多也不得少。',
  '1. base 三句：剛認識就會說，各取不同面向（個性、典故笑點、對主公的態度），三句語氣要有差別。',
  '2. friend 一句：和主公熟了才會說的心裡話，要溫暖或有點反差萌，不悲傷。',
  '3. 要讓人感覺他是會自己思考、有脾氣有小心思的人，而不是罐頭台詞；高數值項目反映在說話方式上，但絕對不要直接講出數值或屬性名稱。5. friend 四位以上不要都用「其實我最怕」開頭，句型要各自不同。',
  '只輸出 JSON。',
].join('\n');

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['base', 'friend'],
  properties: {
    base: { type: 'array', items: { type: 'string', maxLength: MAX_LEN }, minItems: 3, maxItems: 3 },
    friend: { type: 'array', items: { type: 'string', maxLength: MAX_LEN }, minItems: 1, maxItems: 1 },
  },
};

function profileOf(g) {
  const st = { 武力: g.str, 智力: g.int, 統率: g.lea, 政治: g.pol, 魅力: g.cha, 運氣: g.luk };
  const sorted = Object.entries(st).sort((a, b) => b[1] - a[1]);
  const gender = g.gender === '女' ? '女' : '男';
  const fac = { wei: '魏', shu: '蜀', wu: '吳' }[g.faction] || '群雄';
  return `${fac}國${gender}性，${g.age}歲，稱號${g.title}；最高屬性${sorted[0][0]}${sorted[0][1]}、${sorted[1][0]}${sorted[1][1]}，最低${sorted[5][0]}${sorted[5][1]}`;
}

const THINKING = { 'claude-haiku-5-5': { type: 'disabled' }, 'claude-sonnet-5-5': { type: 'between_tools' } };

/** 尚無台詞（鍵不存在或為空陣列）的武將 id，依 generals.json 順序。 */
function pendingIds(gens, book) {
  const have = (book && book.generals) || {};
  return gens.map((g) => g.id).filter((id) => !(have[id] && have[id].length));
}

function build(outFile, model, limit, all) {
  const gens = JSON.parse(fs.readFileSync(GENERALS, 'utf8'));
  const base = all ? pendingIds(gens, JSON.parse(fs.readFileSync(LINES, 'utf8'))) : TRIAL_IDS;
  const rows = (limit ? base.slice(0, limit) : base).map((id) => {
    const g = gens.find((x) => x.id === id);
    if (!g) throw new Error('找不到武將 ' + id);
    return { id, name: g.name, profile: profileOf(g), anecdote: String(g.historicalAnecdote || '').replace(/\s+/g, ' ').slice(0, 260) };
  });
  const task = { name: 'hall-chat-trial-' + model.replace('claude-', ''), model, maxTokens: 700, effort: 'medium', thinking: THINKING[model], system: SYSTEM, promptTemplate: TEMPLATE, schema: SCHEMA, rows };
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(task, null, 2), 'utf8');
  console.log(`已建任務檔 ${outFile}（${rows.length} 位）`);
}

function checkLine(text) {
  const bad = [];
  if (!text || !text.trim()) return ['空白'];
  if ([...text].length > MAX_LEN) bad.push('過長');
  const f = FORBIDDEN.find((w) => text.includes(w));
  if (f) bad.push('禁詞:' + f);
  if ([...text].some((c) => SIMPLIFIED.includes(c))) bad.push('疑似簡體');
  if (!/[一-鿿]/.test(text)) bad.push('無中文');
  return bad;
}

function merge(jsonlFile, write) {
  const rows = fs.readFileSync(jsonlFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const book = JSON.parse(fs.readFileSync(LINES, 'utf8'));
  const seen = new Set();
  for (const gl of Object.values(book.generals)) for (const l of gl) seen.add(l.text);
  for (const l of book.generic) seen.add(l.text);
  const report = { merged: [], rejected: [] };
  const samples = [];
  for (const r of rows) {
    if (!r.ok) { report.rejected.push({ id: r.id, why: r.error }); continue; }
    if (book.generals[r.id]) { report.rejected.push({ id: r.id, why: '已有台詞，不覆蓋' }); continue; }
    const items = [...r.data.base.map((t) => ({ t, f: false })), ...r.data.friend.map((t) => ({ t, f: true }))];
    const lines = [];
    for (const it of items) {
      const t = it.t.trim();
      const bad = checkLine(t);
      if (seen.has(t)) bad.push('重複');
      if (bad.length) { report.rejected.push({ id: r.id, text: t, why: bad.join(',') }); continue; }
      seen.add(t);
      const line = { id: `l${lines.length + 1}`, text: t };
      if (it.f) line.minFriendship = 30;
      lines.push(line);
    }
    // 每位至少 3 句友誼 0 的專屬台詞，否則整位不收（避免違反 HALL_CHAT_MIN_LINES）
    if (lines.filter((l) => !l.minFriendship).length < 3) { report.rejected.push({ id: r.id, why: '合格基本台詞不足 3 句，整位不收' }); continue; }
    book.generals[r.id] = lines;
    report.merged.push(r.id);
    samples.push({ id: r.id, lines: lines.map((l) => (l.minFriendship ? `[友誼${l.minFriendship}] ` : '') + l.text) });
  }
  console.log(`合併 ${report.merged.length} 位，剔除 ${report.rejected.length} 項`);
  report.rejected.forEach((x) => console.log('  剔除', JSON.stringify(x)));
  if (write) {
    book.version = (book.version || 1) + 1;
    fs.writeFileSync(LINES, JSON.stringify(book, null, 2) + '\n', 'utf8');
    console.log('已寫入 ' + path.relative(ROOT, LINES) + ' version=' + book.version);
  }
  return { report, samples };
}

if (require.main === module) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  const opt = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
  if (cmd === 'build') build(file, opt('--model', 'claude-haiku-5-5'), Number(opt('--limit', 0)) || 0, rest.includes('--all'));
  else if (cmd === 'merge') { const { samples } = merge(file, rest.includes('--write')); console.log(JSON.stringify(samples.slice(0, 8), null, 1)); }
  else { console.error('用法：hall-chat.js build|merge <file>'); process.exit(1); }
}
module.exports = { checkLine, profileOf, pendingIds, SCHEMA };
