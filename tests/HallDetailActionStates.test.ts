import { assert, TestSuite } from './TestRunner';
import {
    detailActionsFromTaskActions,
    intelAfterRescout,
    resolveDetailActionStates,
} from '../assets/scripts/ui/core/HallDetailActionStates';

const BASE = { availableActions: ['re-scout', 'execute', 'wait', 'assign'] as const, intelRevealPercent: 50, selectedGeneralId: 'zhang-fei', aiDelegateChecked: false };

export function createHallDetailActionStatesSuite(): TestSuite {
    const suite = new TestSuite('HallDetailActionStates (HALL-04 行動按鈕狀態)');

    suite.test('情報 50%、已選武將：四顆都可按，執行需先確認再探', () => {
        const result = resolveDetailActionStates({ ...BASE, availableActions: [...BASE.availableActions] });
        assert.isTrue(result.states['re-scout'].enabled);
        assert.isTrue(result.states.execute.enabled);
        assert.isTrue(result.states.wait.enabled);
        assert.isTrue(result.states.assign.enabled);
        assert.isTrue(result.needsIntelConfirm);
    });

    suite.test('情報已滿 100：再探停用，執行不再需要確認', () => {
        const result = resolveDetailActionStates({ ...BASE, availableActions: [...BASE.availableActions], intelRevealPercent: 100 });
        assert.isFalse(result.states['re-scout'].enabled);
        assert.equals('full-intel', result.states['re-scout'].reason!);
        assert.isFalse(result.needsIntelConfirm);
    });

    suite.test('沒有選武將且沒勾 AI 委任：執行停用，委任與等待仍可按', () => {
        const result = resolveDetailActionStates({ ...BASE, availableActions: [...BASE.availableActions], selectedGeneralId: null });
        assert.isFalse(result.states.execute.enabled);
        assert.equals('need-general', result.states.execute.reason!);
        assert.isTrue(result.states.assign.enabled);
        assert.isTrue(result.states.wait.enabled);
    });

    suite.test('勾選 AI 委任時即使沒選武將，執行也可按', () => {
        const result = resolveDetailActionStates({ ...BASE, availableActions: [...BASE.availableActions], selectedGeneralId: null, aiDelegateChecked: true });
        assert.isTrue(result.states.execute.enabled);
    });

    suite.test('Available_Actions 未包含的行動一律停用，原因為 not-offered', () => {
        const result = resolveDetailActionStates({ ...BASE, availableActions: ['execute', 'wait'] });
        assert.isFalse(result.states['re-scout'].enabled);
        assert.equals('not-offered', result.states['re-scout'].reason!);
        assert.isFalse(result.states.assign.enabled);
        assert.isTrue(result.states.execute.enabled);
    });

    suite.test('沒有 availableActions 時沿用舊行為：四顆都可按（相容既有狀態表）', () => {
        const result = resolveDetailActionStates({ intelRevealPercent: 50, selectedGeneralId: 'zhang-fei', aiDelegateChecked: false });
        assert.isTrue(result.states['re-scout'].enabled && result.states.execute.enabled && result.states.wait.enabled && result.states.assign.enabled);
    });

    suite.test('任務資料的 RECON 等代碼轉成按鈕 key，未知代碼略過', () => {
        assert.equals('re-scout,execute,wait,assign', detailActionsFromTaskActions(['RECON', 'EXECUTE', 'WAIT', 'ASSIGN']).join(','));
        assert.equals('wait', detailActionsFromTaskActions(['WAIT']).join(','));
    });

    suite.test('再探後情報度一律為 100', () => {
        assert.equals(100, intelAfterRescout());
    });

    return suite;
}
