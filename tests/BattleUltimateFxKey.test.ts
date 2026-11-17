/**
 * BattleUltimateFxKey — 武將專屬奧義特效的選擇規則（PROG-2-9372）
 *
 * 特效表有 battle_ult_<武將代號> 就播專屬的，沒有就播通用奧義特效；一般戰法不受影響。
 * 同時鎖住：張飛、關羽、呂布、曹操四位在特效表裡真的有專屬效果，而且每一層都是有 prefab 的特效。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { BATTLE_FLOW_FX, resolveBattleGeneralSkillEffectKey, ultimateEffectKeyOf } from '../assets/scripts/battle/views/BattleFlowVfx';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';

type RawBlock = { blockId?: string; delay?: number };
type RawEffect = RawBlock & { blocks?: RawBlock[]; lifetime?: number };

const effects = JSON.parse(readFileSync(join(__dirname, '../assets/resources/data/vfx-effects.json'), 'utf8')).effects as Record<string, RawEffect | string>;
const hasEffect = (key: string): boolean => typeof effects[key] === 'object';

const SIGNATURE_GENERALS = ['zhang-fei', 'guan-yu', 'lu-bu', 'cao-cao'];

export function createBattleUltimateFxKeySuite(): TestSuite {
    const suite = new TestSuite('BattleUltimateFxKey（武將專屬奧義特效，PROG-2-9372）');

    suite.test('鍵名規則：battle_ult_ 加武將代號，連字號換底線', () => {
        assert.equals('battle_ult_zhang_fei', ultimateEffectKeyOf('zhang-fei'));
        assert.equals('battle_ult_lu_bu', ultimateEffectKeyOf('lu-bu'));
    });

    suite.test('四位武將施放奧義時播各自的專屬特效', () => {
        for (const id of SIGNATURE_GENERALS) {
            assert.equals(ultimateEffectKeyOf(id), resolveBattleGeneralSkillEffectKey(SkillSourceType.Ultimate, [null, id], hasEffect));
        }
    });

    suite.test('名冊範本代號優先於武將代號', () => {
        assert.equals('battle_ult_guan_yu', resolveBattleGeneralSkillEffectKey(SkillSourceType.Ultimate, ['guan-yu', 'roster-0007'], hasEffect));
        assert.equals('battle_ult_guan_yu', resolveBattleGeneralSkillEffectKey(SkillSourceType.Ultimate, ['no-such-template', 'guan-yu'], hasEffect));
    });

    suite.test('沒有專屬特效的武將播通用奧義特效', () => {
        assert.equals(BATTLE_FLOW_FX.skillUltimate, resolveBattleGeneralSkillEffectKey(SkillSourceType.Ultimate, [null, 'no-such-general'], hasEffect));
        assert.equals(BATTLE_FLOW_FX.skillUltimate, resolveBattleGeneralSkillEffectKey(SkillSourceType.Ultimate, [], hasEffect));
        assert.equals(BATTLE_FLOW_FX.skillUltimate, resolveBattleGeneralSkillEffectKey(SkillSourceType.Ultimate));
    });

    suite.test('一般戰法不套用專屬奧義特效', () => {
        assert.equals(BATTLE_FLOW_FX.skillSeed, resolveBattleGeneralSkillEffectKey(SkillSourceType.SeedTactic, ['zhang-fei'], hasEffect));
        assert.equals(BATTLE_FLOW_FX.skillSeed, resolveBattleGeneralSkillEffectKey(undefined, ['zhang-fei'], hasEffect));
    });

    suite.test('四個專屬特效各有三層以上、每一層都有 prefab、最後一層在總長度內開始', () => {
        const registry = new Map(VFX_BLOCK_REGISTRY.map(block => [block.id, block] as const));
        for (const id of SIGNATURE_GENERALS) {
            const key = ultimateEffectKeyOf(id);
            const effect = effects[key] as RawEffect;
            assert.isTrue(typeof effect === 'object', `${key} 應該在特效表裡`);
            const blocks = effect.blocks ?? [];
            assert.isTrue(blocks.length >= 3, `${key} 至少三層，實際 ${blocks.length}`);
            for (const block of [effect, ...blocks]) {
                assert.isTrue(!!registry.get(block.blockId ?? '')?.prefabPath, `${key} 用了沒有 prefab 的特效 ${block.blockId}`);
            }
            const lastStart = Math.max(...blocks.map(block => block.delay ?? 0));
            assert.isTrue(lastStart < (effect.lifetime ?? 0), `${key} 最後一層開始得比總長度還晚`);
        }
    });

    return suite;
}
