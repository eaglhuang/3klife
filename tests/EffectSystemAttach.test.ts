// PROG-2-9358：池取出的特效節點沒有父節點，呼叫端沒指定 parent 時必須掛回場景根。
// 線上實況（d7a9992a2）：playBlock 取到節點、粒子也播了，但節點不在場景裡，斬擊與受擊光效全部看不到。
// 單元測試環境沒有真的場景樹，這裡用原始碼守門鎖住「兩個播放入口都走 attachVfxNode」。
import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '../assets/scripts/core/systems/EffectSystem.ts'), 'utf8');

assert.ok(!/if \(parent\) node\.parent = parent;/.test(source), '不可以只在有 parent 時才掛節點，否則沒傳 parent 的特效永遠不在場景裡');
assert.equal((source.match(/this\.attachVfxNode\(node, parent\);/g) ?? []).length, 2, 'playEffect 與 playBlock 都要走 attachVfxNode');

const helper = source.slice(source.indexOf('private attachVfxNode('));
const body = helper.slice(0, helper.indexOf('\n    }\n'));
assert.ok(/director\.getScene\(\)/.test(body), '沒指定 parent 時要掛到場景根');
assert.ok(/if \(node\.parent\) return;/.test(body), '已有父節點的不可以被搬走');

console.log('EffectSystemAttach: ok');

// PROG-2-9361：特效層不可以寫死成 1 << 0。引擎的 DEFAULT 是 1 << 30，
// 寫成 1 << 0 會把特效移到沒有攝影機會畫的層（線上實況：節點在場景裡、粒子在播，但畫面上什麼都沒有）。
assert.ok(!/DEFAULT_LAYER\s*=\s*1\s*<<\s*0/.test(source), '特效層不可以寫死 1 << 0');
assert.ok(/DEFAULT_LAYER\s*=\s*Layers\.Enum\.DEFAULT/.test(source), '特效層要用 Layers.Enum.DEFAULT');
console.log('EffectSystemAttach layer: ok');
