import { readFileSync } from 'fs';
import { join } from 'path';
import {
    CURRENT_VFX_EFFECT_TABLE_VERSION,
    DEFAULT_VFX_EFFECTS,
    normalizeVfxEffectTable,
} from '../assets/scripts/core/config/VfxEffectConfig';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';
import { TestSuite, assert } from './TestRunner';

/** PROG-2-9371 移除的 12 個舊效果：用的特效只有貼圖、沒有 prefab，戰場播不出來，也沒有人呼叫。 */
const REMOVED_LEGACY_EFFECTS = [
    'hit_enemy', 'hit_miss', 'crit_hit', 'buff_gain_atk', 'buff_gain_def', 'unit_death', 'heal', 'stun_apply',
    'skill_zhang_fei', 'skill_guan_yu', 'skill_lu_bu', 'skill_cao_cao',
];

type RawBlock = { blockId?: string };
type RawEffect = RawBlock & { blocks?: readonly RawBlock[] };

function loadEffectTable(): Record<string, RawEffect | string> {
    const raw = JSON.parse(readFileSync(join(__dirname, '../assets/resources/data/vfx-effects.json'), 'utf8'));
    return raw.effects as Record<string, RawEffect | string>;
}

export function createVfxEffectConfigSuite(): TestSuite {
    const suite = new TestSuite('VfxEffectConfig');

    suite.test('normalize：legacy v0 裸表可自動升級到目前 schema', () => {
        const table = normalizeVfxEffectTable({
            custom_hit: {
                blockId: 'impact_ring',
                lifetime: 3.2,
            },
        });

        assert.equals(CURRENT_VFX_EFFECT_TABLE_VERSION, table.version);
        assert.equals('impact_ring', table.effects.custom_hit.blockId);
        assert.equals(3.2, table.effects.custom_hit.lifetime);
    });

    suite.test('normalize：已知效果缺欄位時回填 fallback', () => {
        const table = normalizeVfxEffectTable({
            version: 1,
            effects: {
                battle_hit_default: {
                    blockId: 'p3d_star',
                },
            },
        });

        assert.equals('p3d_star', table.effects.battle_hit_default.blockId, '表內有寫的欄位以表為準');
        assert.equals(DEFAULT_VFX_EFFECTS.battle_hit_default.lifetime, table.effects.battle_hit_default.lifetime);
    });

    suite.test('normalize：較新的未知 schema 版本保守退回 fallback', () => {
        const table = normalizeVfxEffectTable({
            version: 999,
            effects: {
                battle_hit_default: {
                    blockId: 'glow_soft',
                },
            },
        });

        assert.equals(CURRENT_VFX_EFFECT_TABLE_VERSION, table.version);
        assert.equals(DEFAULT_VFX_EFFECTS.battle_hit_default.blockId, table.effects.battle_hit_default.blockId);
    });

    suite.test('舊的 12 個通用與武將技能效果已移除：正式表與內建備援都沒有（PROG-2-9371）', () => {
        const table = normalizeVfxEffectTable({ version: 2, effects: loadEffectTable() });
        for (const key of REMOVED_LEGACY_EFFECTS) {
            assert.isTrue(table.effects[key] === undefined, `${key} 不該再出現在特效表`);
            assert.isTrue(DEFAULT_VFX_EFFECTS[key] === undefined, `${key} 不該留在內建備援`);
        }
    });

    suite.test('特效表每個效果的每一層都有 prefab：沒有 prefab 的特效進不了物件池，戰場播不出來', () => {
        const registry = new Map(VFX_BLOCK_REGISTRY.map(block => [block.id, block] as const));
        let checked = 0;
        const sources: Array<[string, RawEffect]> = [];
        for (const [key, effect] of Object.entries(loadEffectTable())) {
            if (typeof effect === 'object' && effect) sources.push([key, effect]);
        }
        for (const [key, effect] of Object.entries(DEFAULT_VFX_EFFECTS)) sources.push([`內建備援 ${key}`, effect]);

        for (const [key, effect] of sources) {
            const ids = [effect.blockId, ...(effect.blocks ?? []).map(block => block.blockId)];
            for (const id of ids) {
                if (!id) continue;
                assert.isTrue(!!registry.get(id)?.prefabPath, `${key} 用了沒有 prefab 的特效 ${id}`);
                checked += 1;
            }
        }
        assert.isTrue(checked > 20, `特效表應該有內容可查，實際 ${checked}`);
    });

    return suite;
}
