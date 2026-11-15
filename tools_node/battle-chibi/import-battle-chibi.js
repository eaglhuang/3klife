// 把 spine-trial 戰場規格分支的共用戰場動作併入遊戲內現有武將骨架；小兵則整份匯入。
// 用法：node tools_node/battle-chibi/import-battle-chibi.js [--write] [--target <另一個工作樹的根目錄>]
// --target：把結果寫到指定工作樹（例如發版用的乾淨工作樹）。私有素材不進版控，那邊若沒有武將骨架，會先從本腳本所在的儲存庫整個資料夾複製過去再併入動作。
// 之後再跑 recolor_soldier.py 產出紅槍兵／藍弓兵（指令見 docs/battle-chibi-integration.md）。素材為私有，不進版控。
const fs = require('fs'), path = require('path'), cp = require('child_process');
const HOME = path.resolve(__dirname, '../../assets/resources/spine');
const targetAt = process.argv.indexOf('--target');
const targetRoot = targetAt >= 0 ? process.argv[targetAt + 1] : null;
if (targetAt >= 0 && (!targetRoot || targetRoot.startsWith('--') || !fs.existsSync(path.join(targetRoot, 'assets')))) {
  console.error('--target 後面要接工作樹根目錄（底下要有 assets 資料夾）：', targetRoot); process.exit(1);
}
const GAME = targetRoot ? path.resolve(targetRoot, 'assets/resources/spine') : HOME;
const TRIAL = process.env.SPINE_TRIAL_DIR || path.resolve(__dirname, '../../../spine-trial'), REF = 'origin/battle-chibi-spec';
const WRITE = process.argv.includes('--write');
const ACTIONS = ['dash_in', 'retreat', 'duel_attack', 'hit', 'dodge', 'fall'];
const show = (p, enc) => cp.execFileSync('git', ['-C', TRIAL, 'show', `${REF}:${p}`], { maxBuffer: 1 << 28, encoding: enc });
const names = a => (a || []).map(x => x.name).sort().join('|');
for (const [dir, name] of [['zhang_fei', 'char2'], ['lu_bu', 'lu_bu'], ['guan_yu', 'guan_yu'], ['zhao_yun', 'zhao_v2']]) {
  const file = path.join(GAME, 'generals', dir, name + '.json');
  if (!fs.existsSync(file)) {
    // 目標工作樹沒有這位武將的私有骨架：從本儲存庫複製整個資料夾（含圖集與 .meta，避免 Cocos 重新產生不同的資源編號）
    const from = path.join(HOME, 'generals', dir);
    if (GAME === HOME || !fs.existsSync(path.join(from, name + '.json'))) { console.log(name, '略過：找不到骨架', file); continue; }
    console.log(name, WRITE ? '已從本儲存庫複製骨架到' : '（試跑）將從本儲存庫複製骨架到', path.dirname(file));
    if (WRITE) fs.cpSync(from, path.dirname(file), { recursive: true });
  }
  const readFrom = fs.existsSync(file) ? file : path.join(HOME, 'generals', dir, name + '.json');
  const game = JSON.parse(fs.readFileSync(readFrom, 'utf8'));
  const src = JSON.parse(show(`characters/${name}/out/${name}.json`, 'utf8'));
  const sameRig = names(game.bones) === names(src.bones) && names(game.slots) === names(src.slots) && names(game.skins) === names(src.skins);
  const evG = Object.keys(game.events || {}).sort().join('|'), evS = Object.keys(src.events || {}).sort().join('|');
  console.log(name, 'rig一致', sameRig, 'events', evG === evS ? '一致' : `不同 game[${evG}] src[${evS}]`);
  if (!sameRig) { console.log('  略過：骨架不一致'); continue; }
  for (const a of ACTIONS) game.animations[a] = src.animations[a];
  game.events = Object.assign({}, src.events || {}, game.events || {});
  if (WRITE) { fs.writeFileSync(file, JSON.stringify(game)); console.log('  已寫入', Object.keys(game.animations).length, '個動作'); }
}
for (const name of ['soldier_spear_blue', 'soldier_bow_red']) {
  const dir = path.join(GAME, 'soldiers', name);
  console.log(name, '匯入到', dir);
  if (!WRITE) continue;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.json'), show(`characters/${name}/out/${name}.json`));
  fs.writeFileSync(path.join(dir, name + '.atlas'), show(`characters/${name}/out/atlas/${name}.atlas`));
  fs.writeFileSync(path.join(dir, name + '.png'), show(`characters/${name}/out/atlas/${name}.png`));
}
