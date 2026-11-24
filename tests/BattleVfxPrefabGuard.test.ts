/**
 * BattleVfxPrefabGuard.test.ts — 戰場實際會播的 vfx-block 必須有 prefabPath（PROG-2-9997）
 *
 * 背景：戰場預熱只把「有 prefabPath」的積木放進 PoolSystem；只有 texPath 的積木 playBlock 會回 null，特效不出現。
 * 戰場現行會播特效的路徑：
 *   - vfx-effects.json 的 battle_* 效果（流程、受擊、奧義）→ playFullEffect
 *   - 格子特效 TACTIC_GRID_VFX_BLOCKS、近戰攻擊刀光 ATTACK_SLASH_EFFECT_ID → playBlock
 * skills.json 的 vfx 步驟只由 ActionSystem.playSkill 播放，而戰場內沒有人呼叫 playSkill（只讀 label／costSp）；
 * 本測試鎖住這個前提：一旦戰場程式開始呼叫 playSkill，就必須先把 skills.json 的積木換成有 prefab 的。
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';
import { TACTIC_GRID_VFX_BLOCKS } from '../assets/scripts/battle/shared/TacticVfxHooks';
import { ATTACK_SLASH_EFFECT_ID } from '../assets/scripts/battle/shared/AttackVfxMapping';

type Block = { blockId?: string };
type Effect = Block & { blocks?: Block[] };

const dataDir = join(__dirname, '../assets/resources/data');
const readJson = (file: string) => JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
const registry = new Map(VFX_BLOCK_REGISTRY.map((block) => [block.id, block] as const));
const blockIdsOf = (effect: Effect): string[] =>
    [effect.blockId, ...(effect.blocks ?? []).map((block) => block.blockId)].filter((id): id is string => !!id);

function listTs(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) out.push(...listTs(abs));
        else if (name.endsWith('.ts')) out.push(abs);
    }
    return out;
}

export function createBattleVfxPrefabGuardSuite(): TestSuite {
    const suite = new TestSuite('BattleVfxPrefabGuard');

    suite.test('特效表 battle_* 效果的每一層積木都有 prefabPath', () => {
        const effects = readJson('vfx-effects.json').effects as Record<string, Effect | string>;
        let checked = 0;
        for (const [key, effect] of Object.entries(effects)) {
            if (!key.startsWith('battle_') || typeof effect !== 'object' || !effect) continue;
            for (const id of blockIdsOf(effect)) {
                assert.isTrue(!!registry.get(id)?.prefabPath, `戰場效果 ${key} 用了沒有 prefabPath 的積木 ${id}，戰場上播不出來`);
                checked++;
            }
        }
        assert.isTrue(checked > 0, '應該至少檢查到一個 battle_* 積木');
    });

    suite.test('格子特效與近戰攻擊刀光的積木都有 prefabPath', () => {
        const ids = [ATTACK_SLASH_EFFECT_ID, ...Object.values(TACTIC_GRID_VFX_BLOCKS).flat()];
        for (const id of ids) {
            assert.isTrue(!!registry.get(id)?.prefabPath, `${id} 沒有 prefabPath，戰場 playBlock 會回 null`);
        }
    });

    suite.test('戰場程式不呼叫 ActionSystem.playSkill（否則 skills.json 的積木必須全部有 prefabPath）', () => {
        const callers = listTs(join(__dirname, '../assets/scripts/battle'))
            .filter((file) => /\.playSkill\s*\(/.test(readFileSync(file, 'utf8')));
        if (callers.length === 0) return;
        const skills = readJson('skills.json') as Array<{ id: string; steps?: Array<{ type: string; blockId?: string }> }>;
        for (const skill of skills) {
            for (const step of skill.steps ?? []) {
                if (step.type !== 'vfx' || !step.blockId) continue;
                assert.isTrue(!!registry.get(step.blockId)?.prefabPath,
                    `戰場（${callers.join(', ')}）呼叫 playSkill，但 ${skill.id} 的積木 ${step.blockId} 沒有 prefabPath`);
            }
        }
    });

    return suite;
}
