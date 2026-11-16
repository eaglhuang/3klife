// 把戰場 Q 版角色（武將、小兵）匯入遊戲。來源裡有什麼角色就匯入什麼，不在程式裡寫死名單（PROG-2-9362）。
// 用法：node tools_node/battle-chibi/import-battle-chibi.js [--write] [--target <另一個工作樹的根目錄>] [--inbox <本機投遞目錄>] [--only <名稱,名稱>]
// 來源有兩種，可同時用：
//   1. spine-trial 的 origin/battle-chibi-spec 分支：characters/<名稱>/out/<名稱>.json 與 out/atlas/<名稱>.atlas、圖集頁 PNG。
//   2. --inbox 指定的本機目錄：<目錄>/<名稱>/<名稱>.json、<名稱>.atlas、圖集頁 PNG。新兵種或新武將丟進去就能匯入；同名時以投遞目錄為準。
// 處理規則（例外寫在同資料夾的 import-config.json）：
//   - 名稱以 soldier_ 開頭：整份匯入到 spine/soldiers/<名稱>/。
//   - 其餘視為武將：遊戲內已有骨架且結構一致時，只併入共用戰場動作（保留遊戲內既有動作）；遊戲內沒有骨架時整份匯入。
// --target：把結果寫到指定工作樹（例如發版用的乾淨工作樹）。那邊若沒有武將骨架，會先從本腳本所在的儲存庫整個資料夾複製過去再併入動作。
// 換色（紅槍兵／藍弓兵等）另跑 recolor_soldier.py，指令見 docs/battle-chibi-integration.md。素材為私有，不進版控。
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { planImport, atlasPages, soldierArtOf } = require('./import-plan');
const argOf = flag => { const at = process.argv.indexOf(flag); return at >= 0 ? (process.argv[at + 1] || '') : null; };
const HOME = path.resolve(__dirname, '../../assets/resources/spine');
const targetRoot = argOf('--target');
if (targetRoot !== null && (!targetRoot || targetRoot.startsWith('--') || !fs.existsSync(path.join(targetRoot, 'assets')))) {
  console.error('--target 後面要接工作樹根目錄（底下要有 assets 資料夾）：', targetRoot); process.exit(1);
}
const inbox = argOf('--inbox');
if (inbox !== null && (!inbox || inbox.startsWith('--') || !fs.existsSync(inbox))) {
  console.error('--inbox 後面要接存在的目錄：', inbox); process.exit(1);
}
const only = argOf('--only') ? new Set(argOf('--only').split(',').map(s => s.trim()).filter(Boolean)) : null;
const GAME = targetRoot ? path.resolve(targetRoot, 'assets/resources/spine') : HOME;
const TRIAL = process.env.SPINE_TRIAL_DIR || path.resolve(__dirname, '../../../spine-trial'), REF = 'origin/battle-chibi-spec';
const WRITE = process.argv.includes('--write');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'import-config.json'), 'utf8'));
const ACTIONS = CONFIG.actions || [];
const git = (args, enc) => cp.execFileSync('git', ['-C', TRIAL, ...args], { maxBuffer: 1 << 28, encoding: enc, stdio: ['ignore', 'pipe', 'ignore'] });
const names = a => (a || []).map(x => x.name).sort().join('|');

/** 每個來源提供三種讀法：骨架 JSON 文字、圖集文字、圖集頁位元組。 */
function gitSource(name) {
  const base = `characters/${name}/out`;
  return { label: 'spine-trial', json: () => git(['show', `${REF}:${base}/${name}.json`], 'utf8'),
    atlas: () => git(['show', `${REF}:${base}/atlas/${name}.atlas`], 'utf8'), page: file => git(['show', `${REF}:${base}/atlas/${file}`]) };
}
function inboxSource(name) {
  const dir = path.join(inbox, name);
  return { label: '投遞目錄', json: () => fs.readFileSync(path.join(dir, name + '.json'), 'utf8'),
    atlas: () => fs.readFileSync(path.join(dir, name + '.atlas'), 'utf8'), page: file => fs.readFileSync(path.join(dir, file)) };
}
const sources = new Map();
try {
  for (const line of git(['ls-tree', '--name-only', REF, 'characters/'], 'utf8').split(/\r?\n/)) {
    const name = line.replace(/^characters\//, '').trim();
    if (name) sources.set(name, gitSource(name));
  }
} catch (error) { console.log('讀不到 spine-trial 的', REF, '（', TRIAL, '），只處理投遞目錄'); }
if (inbox) for (const entry of fs.readdirSync(inbox, { withFileTypes: true })) {
  if (entry.isDirectory() && fs.existsSync(path.join(inbox, entry.name, entry.name + '.json'))) sources.set(entry.name, inboxSource(entry.name));
}

/** 整份匯入：骨架、圖集與圖集裡列出的每一頁。缺任何一個檔就整個略過，不留半套素材。 */
function importWhole(name, source, dir) {
  let json, atlas, pages;
  try { json = source.json(); atlas = source.atlas(); pages = atlasPages(atlas).map(file => [file, source.page(file)]); }
  catch (error) { console.log(name, '略過：來源缺骨架、圖集或圖集頁（', source.label, '）'); return false; }
  if (!pages.length) { console.log(name, '略過：圖集裡找不到圖集頁'); return false; }
  console.log(name, WRITE ? '已匯入到' : '（試跑）將匯入到', dir, `來源：${source.label}，圖集頁 ${pages.length} 張`);
  if (!WRITE) return true;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.json'), json);
  fs.writeFileSync(path.join(dir, name + '.atlas'), atlas);
  for (const [file, bytes] of pages) fs.writeFileSync(path.join(dir, file), bytes);
  return true;
}

/** 遊戲內已有骨架的武將：只併入共用戰場動作，保留遊戲內既有動作與事件。 */
function mergeGeneral(name, source, rel) {
  const file = path.join(GAME, rel, name + '.json');
  if (!fs.existsSync(file)) {
    // 目標工作樹沒有這位武將的私有骨架：從本儲存庫複製整個資料夾（含圖集與 .meta，避免 Cocos 重新產生不同的資源編號）
    const from = path.join(HOME, rel);
    if (GAME === HOME || !fs.existsSync(path.join(from, name + '.json'))) return importWhole(name, source, path.join(GAME, rel));
    console.log(name, WRITE ? '已從本儲存庫複製骨架到' : '（試跑）將從本儲存庫複製骨架到', path.dirname(file));
    if (WRITE) fs.cpSync(from, path.dirname(file), { recursive: true });
  }
  const readFrom = fs.existsSync(file) ? file : path.join(HOME, rel, name + '.json');
  const game = JSON.parse(fs.readFileSync(readFrom, 'utf8'));
  let src;
  try { src = JSON.parse(source.json()); } catch (error) { console.log(name, '略過：來源骨架讀不到（', source.label, '）'); return false; }
  const sameRig = names(game.bones) === names(src.bones) && names(game.slots) === names(src.slots) && names(game.skins) === names(src.skins);
  const evG = Object.keys(game.events || {}).sort().join('|'), evS = Object.keys(src.events || {}).sort().join('|');
  console.log(name, 'rig一致', sameRig, 'events', evG === evS ? '一致' : `不同 game[${evG}] src[${evS}]`);
  if (!sameRig) { console.log('  略過：骨架不一致'); return false; }
  const missing = ACTIONS.filter(a => !(src.animations || {})[a]);
  if (missing.length) console.log('  來源缺動作（不併入）：', missing.join('、'));
  for (const a of ACTIONS) if ((src.animations || {})[a]) game.animations[a] = src.animations[a];
  game.events = Object.assign({}, src.events || {}, game.events || {});
  if (WRITE) { fs.writeFileSync(file, JSON.stringify(game)); console.log('  已寫入', Object.keys(game.animations).length, '個動作'); }
  return true;
}

const plan = planImport(Array.from(sources.keys()), CONFIG).filter(item => !only || only.has(item.name));
if (!plan.length) console.log('沒有可匯入的角色');
const newArts = new Set();
for (const item of plan) {
  const source = sources.get(item.name);
  if (item.kind === 'general') { mergeGeneral(item.name, source, item.dir); continue; }
  if (importWhole(item.name, source, path.join(GAME, item.dir))) { const art = soldierArtOf(item.name); if (art) newArts.add(art.art); }
}
if (newArts.size) console.log('小兵外觀：', Array.from(newArts).sort().join('、'),
  '\n  新外觀要在 assets/scripts/battle/shared/UnitPresentationConfig.ts 的 SOLDIER_ART 加一行對應兵種才會上場；藍紅兩色缺一色時先跑 recolor_soldier.py。');
