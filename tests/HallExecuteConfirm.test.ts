/**
 * HallExecuteConfirm.test.ts — 任務詳情執行前的情報確認流程（PROG-2-0460）
 *
 * 只驗證純邏輯：何時要問、三個選擇各自會不會執行、會不會再探、情報度怎麼變。
 */
import { assert, TestSuite } from './TestRunner';
import {
    INTEL_CONFIRM_TEXT,
    applyIntelConfirmChoice,
    resolveExecutePress,
} from '../assets/scripts/ui/core/HallExecuteConfirm';

export function createHallExecuteConfirmSuite(): TestSuite {
    const suite = new TestSuite('HallExecuteConfirm (大廳任務執行前的情報確認)');

    suite.test('情報滿 100 直接執行；未滿則先問「是否再探一次？」', () => {
        assert.equals('execute', resolveExecutePress(100));
        assert.equals('ask-intel-confirm', resolveExecutePress(99));
        assert.equals('ask-intel-confirm', resolveExecutePress(0));
        assert.equals('探子回報尚不完整，是否再探一次？', INTEL_CONFIRM_TEXT);
    });

    suite.test('再探一次後執行：情報度刷新到 100，並要求派探子與執行', () => {
        const outcome = applyIntelConfirmChoice(40, 'rescout-then-execute');
        assert.equals(100, outcome.intelRevealPercent);
        assert.isTrue(outcome.shouldRescout);
        assert.isTrue(outcome.shouldExecute);
    });

    suite.test('直接執行：不再探，情報度維持原值', () => {
        const outcome = applyIntelConfirmChoice(40, 'execute-now');
        assert.equals(40, outcome.intelRevealPercent);
        assert.isFalse(outcome.shouldRescout);
        assert.isTrue(outcome.shouldExecute);
    });

    suite.test('取消：不執行、不再探，情報度不變', () => {
        const outcome = applyIntelConfirmChoice(40, 'cancel');
        assert.equals(40, outcome.intelRevealPercent);
        assert.isFalse(outcome.shouldRescout);
        assert.isFalse(outcome.shouldExecute);
    });

    return suite;
}
