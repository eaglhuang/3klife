/**
 * SoulFragmentLedger.test.ts — 戰魂碎片帳本與寄宿（SAME-08 接線，PROG-2-1056）headless 測試
 *
 * 鎖住：亡者死亡記一筆（同一亡者不重複）、TP 為 Total_TP × 0.2 向下取整；寄宿成功會消耗碎片並增加目標 TP；
 * 同版本或不同血源的寄宿不改任何狀態；存檔讀回時丟掉壞碎片，並能 JSON 往返。
 */
import { assert, TestSuite } from './TestRunner';
import {
    emptySoulFragmentLedger,
    injectFromLedger,
    normalizeSoulFragmentLedger,
    recordDeathFragment,
} from '../assets/scripts/core/systems/SoulFragmentLedger';

const dead = { templateId: 'guan-yu', bloodlineId: 'bl-1', totalTp: 500 };

export function createSoulFragmentLedgerSuite(): TestSuite {
    const suite = new TestSuite('SoulFragmentLedger (戰魂碎片帳本 SAME-08 PROG-2-1056)');

    suite.test('亡者死亡記一筆碎片，TP 為 Total_TP × 0.2 向下取整', () => {
        const { ledger, added } = recordDeathFragment(emptySoulFragmentLedger(), 'uid-1', { ...dead, totalTp: 333 });
        assert.isTrue(added);
        assert.equals(66, ledger['uid-1'].tp);
        assert.equals('guan-yu', ledger['uid-1'].fromTemplateId);
    });

    suite.test('同一亡者不重複記碎片，且不修改輸入', () => {
        const first = recordDeathFragment(emptySoulFragmentLedger(), 'uid-1', dead).ledger;
        const again = recordDeathFragment(first, 'uid-1', { ...dead, totalTp: 9999 });
        assert.isFalse(again.added);
        assert.equals(100, again.ledger['uid-1'].tp);
        assert.equals(1, Object.keys(first).length);
    });

    suite.test('寄宿成功：目標 TP 增加、碎片被消耗', () => {
        const ledger = recordDeathFragment(emptySoulFragmentLedger(), 'uid-1', dead).ledger;
        const result = injectFromLedger(ledger, 'uid-1', { templateId: 'liu-bei', bloodlineId: 'bl-1', tp: 10 });
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(110, result.target.tp);
        assert.equals(100, result.amount);
        assert.isTrue(result.ledger['uid-1'] === undefined);
        assert.equals(1, Object.keys(ledger).length);
    });

    suite.test('同版本或不同血源寄宿被拒絕，碎片保留', () => {
        const ledger = recordDeathFragment(emptySoulFragmentLedger(), 'uid-1', dead).ledger;
        const same = injectFromLedger(ledger, 'uid-1', { templateId: 'guan-yu', bloodlineId: 'bl-1', tp: 0 });
        assert.isFalse(same.ok);
        if (!same.ok) assert.equals('SAME_TEMPLATE', same.reason);
        const other = injectFromLedger(ledger, 'uid-1', { templateId: 'liu-bei', bloodlineId: 'bl-2', tp: 0 });
        assert.isFalse(other.ok);
        if (!other.ok) assert.equals('BLOODLINE_MISMATCH', other.reason);
        assert.equals(100, ledger['uid-1'].tp);
    });

    suite.test('沒有碎片時回傳 NO_FRAGMENT', () => {
        const result = injectFromLedger(emptySoulFragmentLedger(), 'nobody', { templateId: 'x', bloodlineId: 'bl-1', tp: 0 });
        assert.isFalse(result.ok);
        if (!result.ok) assert.equals('NO_FRAGMENT', result.reason);
    });

    suite.test('存檔讀回丟掉壞碎片，並可 JSON 往返', () => {
        const raw = {
            good: { fromTemplateId: 'guan-yu', bloodlineId: 'bl-1', tp: 100 },
            badTp: { fromTemplateId: 'x', bloodlineId: 'bl-1', tp: -1 },
            missingBloodline: { fromTemplateId: 'x', tp: 5 },
        };
        const normalized = normalizeSoulFragmentLedger(raw);
        assert.equals('good', Object.keys(normalized).join(','));
        const restored = normalizeSoulFragmentLedger(JSON.parse(JSON.stringify(normalized)));
        assert.equals(JSON.stringify(normalized), JSON.stringify(restored));
        assert.equals(0, Object.keys(normalizeSoulFragmentLedger(null)).length);
    });

    return suite;
}
