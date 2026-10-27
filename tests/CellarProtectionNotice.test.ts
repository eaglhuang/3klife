/**
 * CellarProtectionNotice.test.ts — 戰敗地窖保護提示（PROG-2-1342，ECO-06）
 */
import { assert, TestSuite } from './TestRunner';
import { cellarProtectionText } from '../assets/scripts/ui/core/DailySubsidyNotice';

export function createCellarProtectionNoticeSuite(): TestSuite {
    const suite = new TestSuite('CellarProtectionNotice (PROG-2-1342 戰敗地窖保護提示)');

    suite.test('有保住糧草時顯示保住量與保底線', () => {
        assert.equals('地窖保護：保住糧草 1300（保底 1500）', cellarProtectionText(1300));
        assert.equals('地窖保護：保住糧草 20（保底 800）', cellarProtectionText(20, 800));
    });

    suite.test('沒觸發（0 或負數）回空字串', () => {
        assert.equals('', cellarProtectionText(0));
        assert.equals('', cellarProtectionText(-5));
    });

    return suite;
}
