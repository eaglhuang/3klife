/**
 * SoulTransfer — 同名武將戰魂寄宿（SAME-08 / PROG-2-0857）
 *
 * 驗證重點：
 *   1. 戰魂碎片 TP = Total_TP × 0.2（無條件捨去）
 *   2. 只能注入同 Bloodline_ID 的其他版本；跨血源與注入自己都拒絕
 *   3. 注入成功後目標 TP 增加；被拒絕時目標不變
 *   4. 非法 Total_TP 丟錯
 */
import { assert, TestSuite } from './TestRunner';
import {
    createSoulFragment,
    injectSoulFragment,
    SoulTransferGeneral,
} from '../assets/scripts/core/models/SoulTransfer';

function general(overrides: Partial<SoulTransferGeneral> = {}): SoulTransferGeneral {
    return { templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', tp: 100, ...overrides };
}

export function createSoulTransferSuite(): TestSuite {
    const suite = new TestSuite('SoulTransfer (同名戰魂寄宿 SAME-08)');

    suite.test('戰魂碎片 TP = Total_TP × 0.2，小數無條件捨去', () => {
        assert.equals(200, createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: 1000 }).tp);
        assert.equals(13, createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: 69 }).tp);
        assert.equals(0, createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: 0 }).tp);
    });

    suite.test('同血源不同版本可注入，目標 TP 增加', () => {
        const fragment = createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: 500 });
        const result = injectSoulFragment(general({ templateId: 'TPL_ZY_B', tp: 100 }), fragment);
        assert.isTrue(result.ok);
        if (result.ok) {
            assert.equals(200, result.target.tp);
            assert.equals(100, result.amount);
        }
    });

    suite.test('跨血源與注入自己都拒絕，且目標不變', () => {
        const fragment = createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: 500 });

        const self = injectSoulFragment(general({ templateId: 'TPL_ZY_A' }), fragment);
        assert.equals(false, self.ok);
        if (!self.ok) assert.equals('SAME_TEMPLATE', self.reason);

        const other = injectSoulFragment(general({ templateId: 'TPL_LB_A', bloodlineId: 'BL_LvBu' }), fragment);
        assert.equals(false, other.ok);
        if (!other.ok) assert.equals('BLOODLINE_MISMATCH', other.reason);
    });

    suite.test('非法 Total_TP 丟錯', () => {
        assert.throws(() => createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: -1 }));
        assert.throws(() => createSoulFragment({ templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', totalTp: Number.NaN }));
    });

    return suite;
}
