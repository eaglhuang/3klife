// PROG-2-9365：主將技能光效打在施放技能的主將身上（使用者裁決），不再固定打在棋盤正中央。
import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Vec3 } from 'cc';
import { playBattleGeneralSkillEffect } from '../assets/scripts/battle/views/BattleFlowVfx';

type Call = { kind: 'full' | 'block'; key: string; x: number; y: number; z: number };
function makeSystem(hasDef: boolean): { calls: Call[]; system: Parameters<typeof playBattleGeneralSkillEffect>[0] } {
  const calls: Call[] = [];
  const system = {
    getEffectDef: (_key: string) => (hasDef ? {} : null),
    playFullEffect: (key: string, p: Vec3) => { calls.push({ kind: 'full', key, x: p.x, y: p.y, z: p.z }); },
    playBlock: (key: string, p: Vec3) => { calls.push({ kind: 'block', key, x: p.x, y: p.y, z: p.z }); },
  } as unknown as Parameters<typeof playBattleGeneralSkillEffect>[0];
  return { calls, system };
}
// 測試用的 cc 替身 Vec3 沒有 clone，這裡自帶一個
const centre = { x: 0, y: 0, z: 0, clone() { return { x: this.x, y: this.y, z: this.z }; } };
const board = { getBoardMetrics: () => ({ center: centre }) } as unknown as Parameters<typeof playBattleGeneralSkillEffect>[1];

// 有施放者位置：光效打在施放者身上，不是棋盤中央
{
  const { calls, system } = makeSystem(true);
  playBattleGeneralSkillEffect(system, board, new Vec3(-3, 0.5, 4), 'battle_skill_seed', 1.35);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { kind: 'full', key: 'battle_skill_seed', x: -3, y: 0.5, z: 4 });
}
// 效果表沒有這個效果時，改播單一特效，位置一樣在施放者身上
{
  const { calls, system } = makeSystem(false);
  playBattleGeneralSkillEffect(system, board, new Vec3(3, 0.5, -4), 'p3d_x');
  assert.deepEqual(calls[0], { kind: 'block', key: 'p3d_x', x: 3, y: 0.5, z: -4 });
}
// 拿不到施放者位置：退回棋盤中央，光效不漏播
{
  const { calls, system } = makeSystem(true);
  playBattleGeneralSkillEffect(system, board, null, 'battle_skill_seed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].x, 0); assert.equal(calls[0].z, 0);
}
// 棋盤也沒有：安靜略過，不丟例外
{
  const { calls, system } = makeSystem(true);
  playBattleGeneralSkillEffect(system, null, null, 'battle_skill_seed');
  assert.equal(calls.length, 0);
}

// 戰場橋接要用施放方的主將位置呼叫；不可再直接打棋盤中央
const bridge = readFileSync(join(__dirname, '../assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
const body = bridge.slice(bridge.indexOf('private _presentGeneralSkillUsed('));
const fn = body.slice(0, body.indexOf('\n  }'));
assert.ok(/playBattleGeneralSkillEffect\(/.test(fn) && /getGeneralSidelineWorldPosition\(data\.faction\)/.test(fn), '主將技能光效要打在施放方主將身上');
assert.ok(!/playBattleFlowEffectAtBoardCenter\(/.test(fn), '主將技能光效不可再固定打在棋盤中央');

console.log('BattleGeneralSkillFxAnchor: ok');
