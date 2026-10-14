/**
 * ingest-generals-ai.js
 *
 * 從 master/generals-base.json 讀取武將資訊，
 * 為 master/generals-lore.json 尚無 lore 的武將生成 historicalAnecdote、bloodlineRumor、storyStripCells，
 * 輸出至 temp_workspace/raw-ai.json，供 merge-generals-master.js 合入。
 *
 * 用法：
 *   node tools_node/ingest-generals-ai.js [--limit <n>] [--dry-run] [--force]
 *
 * 選項：
 *   --limit <n>  最多處理 n 位武將（預設全部）
 *   --dry-run    印出生成結果但不寫入檔案
 *   --force      重新生成所有武將（含已有 lore 者）
 *
 * 注意：
 *   此工具使用內建範本生成（未接真實 AI API）。已有 lore 的武將不會被重新生成；
 *   storyStripCells 的 slot 名稱與 runtime 的 GeneralDetailStorySlot 一致。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MASTER_DIR = path.join(ROOT, 'assets', 'resources', 'data', 'master');
const GENERALS_BASE = path.join(MASTER_DIR, 'generals-base.json');
const TEMP_WS = path.join(ROOT, 'temp_workspace');
const GENERALS_LORE = path.join(MASTER_DIR, 'generals-lore.json');
const OUTPUT = path.join(TEMP_WS, 'raw-ai.json');

// --- CLI 解析 ---
const STORY_SLOTS = ['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'];

/**
 * 解析 --limit <n>；缺值或非正整數時不限制（Infinity），避免 NaN 讓 slice 變成空陣列。
 */
function parseLimit(argv) {
  const idx = argv.indexOf('--limit');
  if (idx < 0) return Infinity;
  const n = parseInt(argv[idx + 1], 10);
  return Number.isInteger(n) && n > 0 ? n : Infinity;
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const limit = parseLimit(args);

// --- 本地模板生成 ---
const ROLE_TEMPLATES = {
  Combat: [
    '以勇猛著稱，每逢大戰必身先士卒，令敵軍聞風喪膽。',
    '臂力過人，善用長兵，數番衝陣無人可擋。',
    '以一騎當千聞名，武藝冠絕三軍。',
  ],
  Commander: [
    '深諳兵法，統帥三軍，指揮若定。',
    '以仁義治軍，深得將士信賴，名震一方。',
    '運籌帷幄，決勝於千里之外。',
  ],
  Support: [
    '足智多謀，善以奇計制敵，令對手防不勝防。',
    '精通天文地理，每每以巧計化解危局。',
    '博覽兵書，才識卓絕，為主公倚重。',
  ],
};

const BLOODLINE_TEMPLATES = [
  '相傳其先祖曾為漢室股肱之臣，血脈中流淌著忠義之氣。',
  '族譜顯示其家族世代習武，武藝之道代代相傳。',
  '坊間流傳其有神將血脈，天生神力非凡。',
  '家族系譜中有多位名將，武勇之名淵遠流長。',
  '據說其出生時天現異象，後人認為乃命中注定的豪傑。',
];

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateAnecdote(general, rng) {
  const templates = ROLE_TEMPLATES[general.role] || ROLE_TEMPLATES.Combat;
  return `${general.name}，${pickRandom(templates, rng)}`;
}

function generateBloodlineRumor(general, rng) {
  return `${general.name}血脈：${pickRandom(BLOODLINE_TEMPLATES, rng)}`;
}

function generateStoryStrip(general) {
  const texts = [
    `${general.name}年少時便展現過人才華，鄉里無不稱奇。`,
    `初入仕途，以一件奇事引起上位者注意，從此踏上征途。`,
    `在一場關鍵之戰中，以智勇雙全之姿力挽狂瀾，奠定名聲。`,
    `盛年之際，聲名遠播，四方豪傑紛紛前來投效。`,
    `晚年回望一生，深感亂世之悲，留下「寧教天下人負我」之嘆。`,
    `身後，人們以詩文紀念其偉業，功績永銘史冊。`,
  ];
  return STORY_SLOTS.map((slot, i) => ({ slot, text: texts[i] }));
}

/**
 * 依武將資訊生成一筆 lore（純函式；隨機來源可注入以便測試）。
 */
function buildLore(general, rng = Math.random) {
  return {
    id: general.id,
    historicalAnecdote: generateAnecdote(general, rng),
    bloodlineRumor: generateBloodlineRumor(general, rng),
    storyStripCells: generateStoryStrip(general),
    _source: 'ai-template',
  };
}

/**
 * 驗證一筆 lore 是否符合 runtime 格式；不符時丟出錯誤，由主流程只 WARN 並跳過。
 */
function validateLore(lore) {
  if (!lore.historicalAnecdote || !lore.bloodlineRumor) {
    throw new Error('缺少 historicalAnecdote 或 bloodlineRumor');
  }
  const cells = lore.storyStripCells;
  if (!Array.isArray(cells) || cells.length !== STORY_SLOTS.length) {
    throw new Error(`storyStripCells 需為 ${STORY_SLOTS.length} 格`);
  }
  cells.forEach((cell, i) => {
    if (cell.slot !== STORY_SLOTS[i] || !cell.text) {
      throw new Error(`storyStripCells[${i}] slot 或 text 不符`);
    }
  });
}

/**
 * 從 generals-lore.json 讀取已有 lore 的武將 id。
 */
function loadLoreIds() {
  if (!fs.existsSync(GENERALS_LORE)) return new Set();
  const loreObj = JSON.parse(fs.readFileSync(GENERALS_LORE, 'utf-8'));
  return new Set((Array.isArray(loreObj.data) ? loreObj.data : []).map(x => x.id));
}

function needsStory(general, loreIds) {
  if (isForce) return true;
  return !loreIds.has(general.id);
}

// --- 主流程 ---
async function main() {
  console.log('=== ingest-generals-ai.js ===');
  if (isDryRun) console.log('[INFO]  --dry-run 模式，不寫入檔案。');

  // 讀取 generals-base.json
  if (!fs.existsSync(GENERALS_BASE)) {
    console.error(`[ERROR] 找不到 ${GENERALS_BASE}，請先執行 DC-1-0001 建立 master/ 目錄。`);
    process.exit(1);
  }

  const baseObj = JSON.parse(fs.readFileSync(GENERALS_BASE, 'utf-8'));
  const generals = Array.isArray(baseObj.data) ? baseObj.data : [];

  if (generals.length === 0) {
    console.log('[INFO]  generals-base.json 無資料，略過生成。');
    if (!isDryRun) {
      const output = { version: '1.0.0', source: 'ai-template', generatedAt: new Date().toISOString(), count: 0, data: [] };
      fs.mkdirSync(TEMP_WS, { recursive: true });
      fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
      console.log(`[OK]    寫入 ${OUTPUT}（空集合）`);
    }
    return;
  }

  const loreIds = loadLoreIds();
  const toProcess = generals.filter(g => needsStory(g, loreIds)).slice(0, limit);
  console.log(`[INFO]  共 ${generals.length} 筆，需要生成 ${toProcess.length} 筆。\n`);

  const results = [];
  let ok = 0;
  let skipped = 0;

  for (const g of toProcess) {
    try {
      const lore = { ...buildLore(g), _generatedAt: new Date().toISOString() };
      validateLore(lore);
      results.push(lore);
      ok++;
      console.log(`[OK]    ${g.name}（${g.id}）生成完成。`);
    } catch (err) {
      console.warn(`[WARN]  ${g.name}（${g.id}）生成失敗，跳過：${err.message}`);
      skipped++;
    }
  }

  console.log(`\n[INFO]  完成：成功 ${ok} 筆、跳過 ${skipped} 筆。`);

  if (isDryRun) {
    console.log('\n[DRY-RUN] 範例資料（前 2 筆）:');
    results.slice(0, 2).forEach(r => console.log(JSON.stringify(r, null, 2)));
    console.log('\n[INFO]  --dry-run 結束，未寫入任何檔案。');
    return;
  }

  fs.mkdirSync(TEMP_WS, { recursive: true });
  const output = {
    version: '1.0.0',
    source: 'ai-template',
    generatedAt: new Date().toISOString(),
    count: results.length,
    data: results,
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`[OK]    寫入 ${OUTPUT}`);
}

module.exports = { STORY_SLOTS, parseLimit, buildLore, validateLore, needsStory };

if (require.main === module) {
  main().catch(err => {
    console.error('[ERROR]', err.message);
    process.exit(1);
  });
}
