/**
 * AiUltimateFamilyRule.test.ts — 敵方 AI 依奧義家族決定施放時機（ULT-13）
 *
 * 每個家族各一組「該放」與「不該放」的指標，並確認沒有家族資料時不限制。
 *
 * Unity 對照：像 AI Ability 的 Tag 條件，同一個通用判斷，Tag 不同就看不同的場景量。
 */
import { UltimateEffectFamily } from '../assets/scripts/shared/SkillRuntimeContract';
import { aiUltimateFamilyPermits, type AiUltimateFamilyInput } from '../assets/scripts/core/systems/AiUltimateFamilyRule';
import { TestSuite, assert } from './TestRunner';

const CALM: AiUltimateFamilyInput = { estimatedKills: 0, enemyCount: 1, selfHpRatio: 1, allyHpRatio: 1, isLosing: false };

export function createAiUltimateFamilyRuleSuite(): TestSuite {
    const suite = new TestSuite('AiUltimateFamilyRule (敵方奧義依家族施放 ULT-13)');

    suite.test('自身爆發：能斬殺或自身血量危險才放', () => {
        assert.isFalse(aiUltimateFamilyPermits(UltimateEffectFamily.SelfBurst, CALM));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.SelfBurst, { ...CALM, estimatedKills: 1 }));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.SelfBurst, { ...CALM, selfHpRatio: 0.3 }));
    });

    suite.test('全隊增益與回復：我方血線低或戰局落後才放', () => {
        assert.isFalse(aiUltimateFamilyPermits(UltimateEffectFamily.TeamBuff, CALM));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.TeamBuff, { ...CALM, allyHpRatio: 0.5 }));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.TeamHeal, { ...CALM, isLosing: true }));
    });

    suite.test('敵方全體減益與強控：玩家存活 3 支以上才放', () => {
        assert.isFalse(aiUltimateFamilyPermits(UltimateEffectFamily.EnemyMassDebuff, { ...CALM, enemyCount: 2 }));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.EnemyMassDebuff, { ...CALM, enemyCount: 3 }));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.ControlOverride, { ...CALM, enemyCount: 3 }));
    });

    suite.test('敵將定點與範圍傷害：有最優擊殺才放', () => {
        assert.isFalse(aiUltimateFamilyPermits(UltimateEffectFamily.SingleExecute, CALM));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.SingleExecute, { ...CALM, estimatedKills: 1 }));
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.AreaBurst, { ...CALM, estimatedKills: 1 }));
    });

    suite.test('特殊規則與無家族資料：不額外限制', () => {
        assert.isTrue(aiUltimateFamilyPermits(UltimateEffectFamily.SpecialRule, CALM));
        assert.isTrue(aiUltimateFamilyPermits(undefined, CALM));
        assert.isTrue(aiUltimateFamilyPermits(null, CALM));
    });

    return suite;
}
