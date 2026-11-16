// PROG-2-9362：戰場 Q 版角色匯入工具改成資料驅動。
// 以前名單寫死在程式裡（四位武將＋槍兵藍、弓兵紅），新兵種（騎兵）或新武將到貨要改程式才能匯入。
// 這裡鎖住匯入計畫的規則：來源有什麼就排什麼，例外只看設定檔。
import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { planImport, atlasPages, soldierArtOf } = require('../tools_node/battle-chibi/import-plan.js') as {
  planImport: (names: string[], config: { generalDirs?: Record<string, string>; skip?: string[] }) => Array<{ name: string; kind: string; dir: string }>;
  atlasPages: (text: string) => string[];
  soldierArtOf: (name: string) => { art: string; color: string } | null;
};
const config = JSON.parse(readFileSync(join(__dirname, '../tools_node/battle-chibi/import-config.json'), 'utf8'));

// 現有來源：結果必須和改寫前寫死的名單一致（四位武將的資料夾對應、兩種小兵、淘汰的 zhao 不匯入）
const current = planImport(['char2', 'guan_yu', 'lu_bu', 'soldier_bow_red', 'soldier_spear_blue', 'zhao', 'zhao_v2'], config);
assert.deepEqual(current.map(item => `${item.name}>${item.dir}`), [
  'char2>generals/zhang_fei', 'guan_yu>generals/guan_yu', 'lu_bu>generals/lu_bu',
  'soldier_bow_red>soldiers/soldier_bow_red', 'soldier_spear_blue>soldiers/soldier_spear_blue', 'zhao_v2>generals/zhao_yun',
]);

// 新兵種、新武將不用改程式：名稱照規則自動歸類
const added = planImport(['soldier_cavalry_blue', 'xiahou_dun', 'gan_ning'], config);
assert.deepEqual(added, [
  { name: 'gan_ning', kind: 'general', dir: 'generals/gan_ning' },
  { name: 'soldier_cavalry_blue', kind: 'soldier', dir: 'soldiers/soldier_cavalry_blue' },
  { name: 'xiahou_dun', kind: 'general', dir: 'generals/xiahou_dun' },
]);

// 重複與空名稱不可重複匯入；沒給設定也要能跑
assert.equal(planImport(['a', 'a', ''], {}).length, 1);

// 圖集可能有多頁，每一頁都要找出來；區塊名稱（下一行是 bounds:）不可誤認成圖集頁
const atlas = 'big.png\nsize: 512,512\nfilter: Linear,Linear\nweapon_spear\nbounds: 2,2,62,333\n\nbig_2.png\nsize: 256,256\nhelmet\nbounds: 1,1,2,2\n';
assert.deepEqual(atlasPages(atlas), ['big.png', 'big_2.png']);
assert.deepEqual(atlasPages(''), []);

// 小兵素材名拆出外觀與陣營色；外觀名可含底線
assert.deepEqual(soldierArtOf('soldier_cavalry_blue'), { art: 'cavalry', color: 'blue' });
assert.deepEqual(soldierArtOf('soldier_elite_infantry_red'), { art: 'elite_infantry', color: 'red' });
assert.equal(soldierArtOf('xiahou_dun'), null);

// 匯入工具本身不可再寫死角色名單
const tool = readFileSync(join(__dirname, '../tools_node/battle-chibi/import-battle-chibi.js'), 'utf8');
for (const name of ['soldier_spear_blue', 'soldier_bow_red', 'zhang_fei', 'lu_bu', 'guan_yu', 'zhao_v2']) {
  assert.ok(!tool.includes(`'${name}'`), `匯入工具不可寫死 ${name}，名單由來源與 import-config.json 決定`);
}

console.log('BattleChibiImportPlan: ok');
