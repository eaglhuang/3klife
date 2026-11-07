/**
 * TallyUnitLoyalty — 虎符部隊忠誠與抗命叛變（doc_spec_0354；PROG-2-2040）
 */
import { assert, TestSuite } from './TestRunner';
import {
    TallyLoyaltyStatus, computeReassignmentDeduction, createTallyUnitLoyalty, endTallyQuarter,
    evaluateTallyLoyaltyStatus, reassignTallyLord, rollTallyDisobey, rollTallyMutinyAtDeploy, tallyCombatModifier,
} from '../assets/scripts/core/systems/TallyUnitLoyalty';

export function createTallyUnitLoyaltySuite(): TestSuite {
    const suite = new TestSuite('TallyUnitLoyalty (虎符忠誠 doc_spec_0354 PROG-2-2040)');

    suite.test('§4-1 同季換 3 次扣 10/15/22，扣到 0 不為負，季末重置並修復', () => {
        assert.equals('10,15,22', [1, 2, 3].map(computeReassignmentDeduction).join(','));
        let s = createTallyUnitLoyalty();
        for (let i = 0; i < 3; i++) s = reassignTallyLord(s);
        assert.equals(53, s.loyalty);
        for (let i = 0; i < 3; i++) s = reassignTallyLord(s);
        assert.equals(0, s.loyalty);
        s = endTallyQuarter(s, 'historicalLord');
        assert.equals(10, s.loyalty);
        assert.equals(0, s.changesThisQuarter);
        assert.equals(10, endTallyQuarter(s, 'storage').loyalty);
    });

    suite.test('§4-2 四態邊界與抗命', () => {
        assert.equals(TallyLoyaltyStatus.Loyal, evaluateTallyLoyaltyStatus(60));
        assert.equals(TallyLoyaltyStatus.Restless, evaluateTallyLoyaltyStatus(59));
        assert.equals(TallyLoyaltyStatus.Disobedient, evaluateTallyLoyaltyStatus(29));
        assert.equals(TallyLoyaltyStatus.Mutinous, evaluateTallyLoyaltyStatus(9));
        assert.isTrue(rollTallyDisobey(29, () => 0.49));
        assert.isFalse(rollTallyDisobey(29, () => 0.5));
        assert.isFalse(rollTallyDisobey(30, () => 0));
        assert.isFalse(tallyCombatModifier(45).canCrit);
        assert.equals(0.9, tallyCombatModifier(45).statMultiplier);
    });

    suite.test('§4-3 叛變轉 Rogue、血條轉黃', () => {
        const out = rollTallyMutinyAtDeploy(9, () => 0.1);
        assert.equals('Rogue', out.faction);
        assert.equals('yellow', out.hpBarColor);
        assert.isFalse(rollTallyMutinyAtDeploy(9, () => 0.15).mutinied);
        assert.isFalse(rollTallyMutinyAtDeploy(10, () => 0).mutinied);
    });

    return suite;
}
