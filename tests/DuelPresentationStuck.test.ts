// PROG-2-9355：單挑演出不可以卡住回合。
// 線上實況：張飛對呂布打超過 4 招時，挑招程式對 Set 用展開語法，網頁版建置把整個 Set 當成一個元素，
// 招式變成 undefined，演出每一格都丟例外、永遠不結束，「結束回合」按了也沒用。
import { strict as assert } from 'assert';
import { ActionClip, UnitAction, UnitPresentationCore } from '../assets/scripts/battle/shared/UnitPresentationCore';
import {
  DUEL_PRESENTATION_HARD_LIMIT_SECONDS, DuelExchange, DuelPresentationCore, selectDuelExchanges,
} from '../assets/scripts/battle/shared/DuelPresentationCore';

const clip = (name: string, loop: boolean, duration: number): ActionClip => ({ name, loop, duration });
const clips: Record<UnitAction, ActionClip> = {
  idle: clip('idle', true, 2), move: clip('walk', true, 1.2),
  attack: clip('attack', false, 1), hit: clip('hit', false, 0.5),
  dodge: clip('dodge', false, 0.5), fall: clip('fall', false, 1),
  retreat: clip('walk', true, 1.2),
};
const config = { clips, walkGroundSpeed: 100, displayScale: 1, speedMultiplier: 1 };
const makeDuel = (exchanges: readonly DuelExchange[]) => {
  const left = new UnitPresentationCore(config, { x: 0, y: 0 });
  const right = new UnitPresentationCore(config, { x: 100, y: 0 }, -1);
  return { left, right, duel: new DuelPresentationCore(
    { unit: left, sideline: { x: 0, y: 0 }, arena: { x: 40, y: 0 } },
    { unit: right, sideline: { x: 100, y: 0 }, arena: { x: 60, y: 0 } }, 0, false, exchanges) };
};
/** 以每格 1/30 秒跑到結束，回傳花掉的秒數；跑超過上限就回 Infinity。 */
const runToDone = (duel: DuelPresentationCore, limitSeconds = 60): number => {
  const dt = 1 / 30;
  for (let t = 0; t < limitSeconds; t += dt) if (duel.step(dt).phase === 'done') return t;
  return Infinity;
};

// (1) 超過 4 招的長單挑：挑出來的每一招都必須是真的招式（不可以有 undefined），且依原順序
const long: DuelExchange[] = Array.from({ length: 9 }, (_, i) => ({ attacker: (i % 2) as 0 | 1, dodged: i === 5 }));
const picked = selectDuelExchanges(long);
assert.equal(picked.length, 4, '長單挑應濃縮成 4 招');
assert.ok(picked.every(event => event && (event.attacker === 0 || event.attacker === 1)), '挑出來的招式不可以有空值');
assert.deepEqual(picked, [long[0], long[1], long[5], long[8]], '保留開頭兩招、第一次閃避、最後一擊');
// 沒有人閃避時取中間一招
const noDodge: DuelExchange[] = Array.from({ length: 8 }, (_, i) => ({ attacker: (i % 2) as 0 | 1, dodged: false }));
assert.deepEqual(selectDuelExchanges(noDodge), [noDodge[0], noDodge[1], noDodge[4], noDodge[7]]);
// 4 招以內原樣回傳
assert.deepEqual(selectDuelExchanges(long.slice(0, 3)), long.slice(0, 3));

// (2) 原始碼守門：挑招不可以再對 Set 用展開語法（單元測試環境測不出網頁版的編譯差異）
import { readFileSync } from 'fs';
import { join } from 'path';
const source = readFileSync(join(__dirname, '../assets/scripts/battle/shared/DuelPresentationCore.ts'), 'utf8');
assert.ok(!/\[\.\.\.selected\]/.test(source), 'selectDuelExchanges 不可以用 [...selected]，網頁版會壞');

// (3) 長單挑演出會在硬上限內自己結束
assert.ok(runToDone(makeDuel(picked).duel) < DUEL_PRESENTATION_HARD_LIMIT_SECONDS, '4 招演出要在硬上限內結束');

// (4) 招式資料壞掉（重現線上的 [undefined]）：不丟例外、直接進結果階段並結束
const broken = makeDuel([undefined as unknown as DuelExchange]);
let seconds = Infinity;
assert.doesNotThrow(() => { seconds = runToDone(broken.duel); }, '招式資料壞掉也不可以丟例外');
assert.ok(seconds < DUEL_PRESENTATION_HARD_LIMIT_SECONDS, '招式資料壞掉時要能結束');

// (5) 演出途中有一方被外部改成倒地（倒地不會自己回到待機）：進場階段原本會永遠等下去，現在由硬上限收尾
const interrupted = makeDuel([{ attacker: 0, dodged: false }]);
interrupted.duel.step(0.1);
interrupted.right.play('fall');
const stuckSeconds = runToDone(interrupted.duel);
assert.ok(Number.isFinite(stuckSeconds), '被外部打斷時也要能結束');
assert.ok(stuckSeconds <= DUEL_PRESENTATION_HARD_LIMIT_SECONDS + 0.1, '最晚在硬上限收尾');

// (6) 硬上限必須比回合安全計時（20 秒）短，才不會先被當成卡住
assert.ok(DUEL_PRESENTATION_HARD_LIMIT_SECONDS < 20);
console.log('DuelPresentationStuck: ALL PASS');
