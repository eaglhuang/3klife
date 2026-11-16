// PROG-2-9363：特效表引用的每個特效代號都必須在登錄表裡找得到。
// 以前有 4 處寫錯代號（張飛 trail_bigsword、關羽 trail_slash、呂布 energy_blast_ring、skills.json 的 trails），
// 播放時只記一行警告就略過，演出少一層卻沒人發現。
// 另外鎖住：戰場流程實際會播的效果（BATTLE_FLOW_FX）只能用有 prefab 的特效——
// 物件池只預熱有 prefab 的特效，沒有 prefab 的在戰場上永遠播不出來。
import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';
import { BATTLE_FLOW_FX } from '../assets/scripts/battle/views/BattleFlowVfx';

const data = (file: string) => JSON.parse(readFileSync(join(__dirname, '../assets/resources/data', file), 'utf8'));
const registry = new Map(VFX_BLOCK_REGISTRY.map(block => [block.id, block] as const));

type Block = { blockId?: string };
type Effect = Block & { blocks?: Block[] };
const effects = data('vfx-effects.json').effects as Record<string, Effect | string>;
const blockIdsOf = (effect: Effect): string[] =>
  [effect.blockId, ...(effect.blocks ?? []).map(block => block.blockId)].filter((id): id is string => !!id);

// 1. 特效表：每個效果的主特效與每一層都要在登錄表裡
let checked = 0;
for (const [key, effect] of Object.entries(effects)) {
  if (typeof effect !== 'object' || !effect) continue; // _comment_* 是說明文字
  for (const id of blockIdsOf(effect)) {
    assert.ok(registry.has(id), `vfx-effects.json 的 ${key} 引用了不存在的特效 ${id}`);
    checked++;
  }
}
assert.ok(checked > 20, '特效表應該有內容可查');

// 2. 技能動作序列：vfx 步驟的特效代號也要在登錄表裡
const skills = data('skills.json') as Array<{ id: string; steps?: Array<{ type: string; blockId?: string }> }>;
let skillSteps = 0;
for (const skill of skills) {
  for (const step of skill.steps ?? []) {
    if (step.type !== 'vfx') continue;
    assert.ok(step.blockId && registry.has(step.blockId), `skills.json 的 ${skill.id} 引用了不存在的特效 ${step.blockId}`);
    skillSteps++;
  }
}
assert.ok(skillSteps > 0, 'skills.json 應該有特效步驟可查');

// 3. 戰場流程實際會播的效果：必須存在，而且每一層都有 prefab
for (const key of Object.values(BATTLE_FLOW_FX)) {
  const effect = effects[key];
  assert.ok(effect && typeof effect === 'object', `戰場流程用到的效果 ${key} 不在特效表裡`);
  for (const id of blockIdsOf(effect as Effect)) {
    assert.ok(registry.get(id)?.prefabPath, `戰場效果 ${key} 用了沒有 prefab 的特效 ${id}，戰場上播不出來`);
  }
}

console.log('VfxTableReferences: ok');
