/**
 * AncestorBlessing — 英靈卡授與祖靈加護（SPI-11；PROG-2-1964）
 */
import { assert, TestSuite } from './TestRunner';
import {
    checkAncestorBlessing, grantAncestorBlessing, type AncestorBlessingInput,
} from '../assets/scripts/core/systems/AncestorBlessing';

function input(over: Partial<AncestorBlessingInput> = {}): AncestorBlessingInput {
    return {
        spiritCardUid: 'SPIRIT_ZHAO_YUN_01',
        cardFamilyKey: 'FAMILY_ZHAO',
        targetFamilyKey: 'FAMILY_ZHAO',
        target: { kind: 'DESCENDANT', generalUid: 'G_PLAYER_0017' },
        chargesRemaining: 2,
        resource: 30,
        resourceCost: 20,
        blessedTargetKeys: [],
        ...over,
    };
}

export function createAncestorBlessingSuite(): TestSuite {
    const suite = new TestSuite('AncestorBlessing (祖靈加護 SPI-11 PROG-2-1964)');

    suite.test('授與成功：扣一次次數與資源並記下對象', () => {
        const base = input();
        const out = grantAncestorBlessing(base);
        assert.equals(1, out?.chargesRemaining);
        assert.equals(10, out?.resource);
        assert.equals('G:G_PLAYER_0017', out?.targetKey);
        assert.equals(0, base.blessedTargetKeys.length);
        const branch = grantAncestorBlessing(input({ target: { kind: 'BRANCH', branchKey: 'ZHAO_EAST' } }));
        assert.equals('B:ZHAO_EAST', branch?.targetKey);
    });

    suite.test('擋下：異家族、重複授與、沒次數、資源不足', () => {
        assert.equals('DIFFERENT_FAMILY', checkAncestorBlessing(input({ targetFamilyKey: 'FAMILY_MA' })).blocked);
        assert.equals('ALREADY_BLESSED', checkAncestorBlessing(input({ blessedTargetKeys: ['G:G_PLAYER_0017'] })).blocked);
        assert.equals('NO_CHARGES', checkAncestorBlessing(input({ chargesRemaining: 0 })).blocked);
        assert.equals('NOT_ENOUGH_RESOURCE', checkAncestorBlessing(input({ resource: 19 })).blocked);
        assert.equals(null, grantAncestorBlessing(input({ chargesRemaining: Number.NaN })));
    });

    return suite;
}
