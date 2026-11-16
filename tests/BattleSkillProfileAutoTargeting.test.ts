import { TestSuite, assert } from './TestRunner';
import { listBattleSkillProfiles, requiresBattleSkillManualTargeting } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';

/** 以自身或我方為對象的戰技不必挑落點，不需要自動瞄準方式；只有要在敵陣選錨點的才必填。 */
const NO_AIM_NEEDED: ReadonlySet<string> = new Set([
    BattleSkillTargetMode.Self, BattleSkillTargetMode.AroundSelf, BattleSkillTargetMode.AllyAll, BattleSkillTargetMode.AllySingle,
]);

export function createBattleSkillProfileAutoTargetingSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillProfileAutoTargeting');

    suite.test('初始與既有戰技 profile 都應維持自動選目標', () => {
        const profiles = listBattleSkillProfiles();
        assert.isTrue(profiles.length > 0, 'Expected at least one battle skill profile');

        for (const profile of profiles) {
            assert.isDefined(profile.battleSkillId);
            assert.isFalse(
                requiresBattleSkillManualTargeting(profile.battleSkillId),
                `Expected ${profile.battleSkillId} to stay auto-targeted`
            );
            assert.isFalse(
                profile.manualTargeting ?? false,
                `Expected ${profile.battleSkillId} manualTargeting to remain false`
            );
            if (!NO_AIM_NEEDED.has(profile.targetMode)) {
                assert.isDefined(profile.autoAimMode, `Expected ${profile.battleSkillId} to define autoAimMode`);
            }
        }
    });

    return suite;
}