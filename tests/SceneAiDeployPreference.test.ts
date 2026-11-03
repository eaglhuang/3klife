import { BattleTactic, TroopType } from '../assets/scripts/shared/CommonEnums';
import { pickAiDeployTroop, resolveAiDeployPreference } from '../assets/scripts/core/systems/AiDeployTroopPick';
import { TestSuite, assert } from './TestRunner';

const ALL = [TroopType.Cavalry, TroopType.Infantry, TroopType.Shield, TroopType.Archer, TroopType.Pikeman];

export function createSceneAiDeployPreferenceSuite(): TestSuite {
    const suite = new TestSuite('SceneAiDeployPreference (場景部署偏好 PROG-2-1605)');

    suite.test('敵將有 Profile 偏好時優先，沒有才用場景偏好', () => {
        const profile = { preferredTroops: ['ARCHER'] as const, preferCounter: true };
        assert.equals(profile, resolveAiDeployPreference(profile, BattleTactic.FloodAttack));
        assert.isTrue(resolveAiDeployPreference(null, BattleTactic.FloodAttack)!.preferredTroops.includes('SHIELD'));
        assert.equals(null, resolveAiDeployPreference(null, BattleTactic.Normal));
        assert.equals(null, resolveAiDeployPreference(null, undefined));
    });

    suite.test('水淹七軍：沒有剋制目標時不出騎兵', () => {
        const preference = resolveAiDeployPreference(null, BattleTactic.FloodAttack);
        for (const r of [0, 0.3, 0.6, 0.99]) {
            const type = pickAiDeployTroop({ iq: null, affordable: ALL, playerMostCommon: null, counterMap: {}, preference, counterChance: 0, random: () => r });
            assert.isTrue(type !== TroopType.Cavalry, `random=${r} 出了騎兵`);
        }
    });

    suite.test('峽谷落石：偏好盾兵與長槍兵', () => {
        const preference = resolveAiDeployPreference(null, BattleTactic.RockSlide);
        const type = pickAiDeployTroop({ iq: null, affordable: ALL, playerMostCommon: null, counterMap: {}, preference, counterChance: 0, random: () => 0 });
        assert.equals(TroopType.Shield, type);
    });

    return suite;
}
