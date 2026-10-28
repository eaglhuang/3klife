/**
 * AiUltimateDecision.test.ts — AI 奧義施放決策（AIS-07）
 *
 * 鎖住：低 IQ 不施放；中 IQ 需精力 > 50 且敵方 > 3；高 IQ 擊殺 ≥ 2 或落後且精力 > 30。
 * 邊界值各測一次（50、3、2、30 都不成立）。
 *
 * Unity 對照：像 AI 的 Ability 條件節點，IQ 決定用哪一組條件，條件不成立就不 Cast。
 */
import { assert, TestSuite } from './TestRunner';
import { aiShouldUseUltimate } from '../assets/scripts/core/systems/AiUltimateDecision';

const base = { vitality: 100, enemyCount: 5, estimatedKills: 0, isLosing: false };

export function createAiUltimateDecisionSuite(): TestSuite {
    const suite = new TestSuite('AiUltimateDecision (AI 奧義施放 AIS-07)');

    suite.test('低 IQ 不主動施放，即使條件都滿足', () => {
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'LOW', estimatedKills: 9, isLosing: true }));
    });

    suite.test('中 IQ：精力 > 50 且敵方 > 3 才施放；邊界 50、3 不成立', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 51, enemyCount: 4 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 50, enemyCount: 4 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 51, enemyCount: 3 }));
    });

    suite.test('高 IQ：擊殺 ≥ 2 即施放；擊殺 1 且未落後不施放', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'HIGH', estimatedKills: 2 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'HIGH', estimatedKills: 1 }));
    });

    suite.test('高 IQ：落後且精力 > 30 施放；邊界 30 不成立', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 31 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 30 }));
    });

    suite.test('EXTREME、PERFECT 暫與 HIGH 同規則', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'EXTREME', estimatedKills: 2 }));
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'PERFECT', estimatedKills: 2 }));
    });

    return suite;
}
