/**
 * SoulInjectCandidates.test.ts — 寄宿戰魂面板的候選列表（PROG-2-1057）headless 測試
 *
 * 鎖住：每筆碎片都會列出；同版本與血源不同的碎片標為不可寄宿並附原因；
 * 只要有一筆可寄宿，按鈕就可按；列表順序以亡者 uid 排序；且不修改帳本。
 */
import { assert, TestSuite } from './TestRunner';
import {
    canOpenSoulInject,
    soulInjectCandidatesFor,
} from '../assets/scripts/core/systems/SoulInjectCandidates';
import type { SoulFragmentLedger } from '../assets/scripts/core/systems/SoulFragmentLedger';

const ledger: SoulFragmentLedger = {
    'uid-b': { fromTemplateId: 'lu-bu', bloodlineId: 'bl-1', tp: 40 },
    'uid-a': { fromTemplateId: 'zhang-fei', bloodlineId: 'bl-1', tp: 20 },
    'uid-c': { fromTemplateId: 'zhao-yun', bloodlineId: 'bl-2', tp: 10 },
};

const target = { templateId: 'guan-yu', bloodlineId: 'bl-1', tp: 100 };

export function createSoulInjectCandidatesSuite(): TestSuite {
    const suite = new TestSuite('SoulInjectCandidates (寄宿戰魂面板 PROG-2-1057)');

    suite.test('依亡者 uid 排序，每筆碎片都列出', () => {
        const list = soulInjectCandidatesFor(ledger, target);
        assert.equals(3, list.length);
        assert.equals('uid-a', list[0].deadUid);
        assert.equals('uid-b', list[1].deadUid);
        assert.equals('uid-c', list[2].deadUid);
    });

    suite.test('同血源不同版本可寄宿，附 TP 並無原因文字', () => {
        const a = soulInjectCandidatesFor(ledger, target)[0];
        assert.isTrue(a.enabled);
        assert.equals(20, a.tp);
        assert.isTrue(a.reasonText === null);
    });

    suite.test('同版本與血源不同標為不可寄宿，並給出原因', () => {
        const list = soulInjectCandidatesFor(ledger, target);
        const sameTemplate = { ...ledger, 'uid-d': { fromTemplateId: 'guan-yu', bloodlineId: 'bl-1', tp: 5 } };
        const same = soulInjectCandidatesFor(sameTemplate, target).find((c) => c.deadUid === 'uid-d')!;
        assert.isTrue(!same.enabled);
        assert.isTrue(same.reasonText !== null && same.reasonText.includes('同一版本'));
        const mismatch = list.find((c) => c.deadUid === 'uid-c')!;
        assert.isTrue(!mismatch.enabled);
        assert.isTrue(mismatch.reasonText !== null && mismatch.reasonText.includes('血脈不同'));
    });

    suite.test('只要有一筆可寄宿，按鈕可按；全部不可寄宿或無碎片則不可按', () => {
        assert.isTrue(canOpenSoulInject(soulInjectCandidatesFor(ledger, target)));
        assert.isTrue(!canOpenSoulInject(soulInjectCandidatesFor({}, target)));
        const onlyBlocked: SoulFragmentLedger = { 'uid-c': ledger['uid-c'] };
        assert.isTrue(!canOpenSoulInject(soulInjectCandidatesFor(onlyBlocked, target)));
    });

    suite.test('列出候選不修改帳本', () => {
        const before = JSON.stringify(ledger);
        soulInjectCandidatesFor(ledger, target);
        assert.equals(before, JSON.stringify(ledger));
    });

    return suite;
}
