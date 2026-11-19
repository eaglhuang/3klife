/**
 * JobChangeEntry.test.ts — 武將詳情頁轉職入口（PROG-2-9166，裁決 89）
 *
 * 純邏輯：入口顯示判斷，以及 JobChangeController 聚焦單一武將後的流程（現成武將可轉、成人禮名單不變）。
 */
import { assert, TestSuite } from './TestRunner';
import { jobChangeEntryState, isJobChangeCandidate, JOB_CHANGE_ENTRY_HAS_SUB_HINT } from '../assets/scripts/core/systems/JobChangeEntry';
import { JobChangeController } from '../assets/scripts/ui/core/JobChangeController';
import { GENERAL_STATUS_DEAD } from '../assets/scripts/core/systems/GeneralAging';
import type { JobWiringGeneral } from '../assets/scripts/core/systems/JobChangeWiring';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): JobWiringGeneral {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        str: 80, lea: 60, int: 50, pol: 70, primaryClass: 'Warrior', ...extra,
    } as unknown as JobWiringGeneral;
}

export function createJobChangeEntrySuite(): TestSuite {
    const suite = new TestSuite('JobChangeEntry (PROG-2-9166 詳情頁轉職入口)');

    suite.test('現成武將（無父母欄位）滿 20 歲：顯示且可按', () => {
        const state = jobChangeEntryState(general('gongsun'));
        assert.isTrue(state.visible);
        assert.isTrue(state.enabled);
        assert.isTrue(state.hint === null);
    });

    suite.test('未滿 20 歲（含子嗣）不顯示；已陣亡不顯示；缺年齡不顯示', () => {
        assert.isFalse(jobChangeEntryState(general('kid', { age: 19, fatherId: 'dad' })).visible);
        assert.isFalse(jobChangeEntryState(general('dead', { status: GENERAL_STATUS_DEAD })).visible);
        assert.isFalse(jobChangeEntryState(general('noage', { age: undefined })).visible);
    });

    suite.test('成年子嗣在詳情頁也可轉（與成人禮同一流程）', () => {
        const state = jobChangeEntryState(general('child', { age: 20, fatherId: 'dad' }));
        assert.isTrue(state.visible && state.enabled);
    });

    suite.test('已有副職：顯示但不可按，附說明', () => {
        const state = jobChangeEntryState(general('done', { subClass: 'Scholar' }));
        assert.isTrue(state.visible);
        assert.isFalse(state.enabled);
        assert.equals(JOB_CHANGE_ENTRY_HAS_SUB_HINT, state.hint!);
        assert.isFalse(isJobChangeCandidate(general('done', { subClass: 'Scholar' })));
    });

    suite.test('聚焦現成武將：名單只剩一位、可選副職並確認轉職；取消聚焦後回到成人禮名單', async () => {
        const roster = [general('gongsun'), general('child', { age: 20, fatherId: 'dad' })];
        const changed: string[] = [];
        const controller = new JobChangeController({
            roster: { getAll: () => roster as unknown as GeneralConfig[] },
            ordersOwned: () => 1,
            changeJob: async (id, sub) => { changed.push(`${id}:${sub}`); return { ok: true, subAbility: 42 } as never; },
        });
        assert.equals('child', controller.eligibleGenerals().map((g) => g.id).join(','));
        controller.focusGeneral('gongsun');
        assert.equals('gongsun', controller.eligibleGenerals().map((g) => g.id).join(','));
        assert.equals('gongsun', controller.getView().generalId!);
        controller.selectSubClass('Scholar');
        assert.isTrue(controller.getView().confirmEnabled);
        await controller.confirm();
        assert.equals('gongsun:Scholar', changed.join(','));
        controller.focusGeneral(null);
        assert.equals('child', controller.eligibleGenerals().map((g) => g.id).join(','));
    });

    suite.test('聚焦的武將不合資格（未滿 20 歲）：名單為空，確認鈕不可按', () => {
        const controller = new JobChangeController({
            roster: { getAll: () => [general('kid', { age: 15 })] as unknown as GeneralConfig[] },
            ordersOwned: () => 1,
            changeJob: async () => null,
        });
        controller.focusGeneral('kid');
        assert.equals(0, controller.eligibleGenerals().length);
        assert.isFalse(controller.getView().confirmEnabled);
    });

    suite.test('標題：成人禮入口「成人禮・轉職」，詳情頁聚焦入口「轉職」', () => {
        const controller = new JobChangeController({
            roster: { getAll: () => [general('gongsun')] as unknown as GeneralConfig[] },
            ordersOwned: () => 1,
            changeJob: async () => null,
        });
        assert.equals('成人禮・轉職', controller.getFlowView().texts.jobTitle);
        controller.focusGeneral('gongsun');
        assert.equals('轉職', controller.getFlowView().texts.jobTitle);
        controller.focusGeneral(null);
        assert.equals('成人禮・轉職', controller.getFlowView().texts.jobTitle);
    });

    suite.test('聚焦轉職成功後中央顯示「已完成轉職」；不合資格仍是「目前沒有可轉職的武將」', async () => {
        const roster = [general('gongsun'), general('kid', { age: 15 })];
        const controller = new JobChangeController({
            roster: { getAll: () => roster as unknown as GeneralConfig[] },
            ordersOwned: () => 1,
            changeJob: async (id, sub) => {
                roster[0] = { ...roster[0], subClass: sub } as JobWiringGeneral;
                return { ok: true, subAbility: 42 } as never;
            },
        });
        controller.focusGeneral('gongsun');
        controller.selectSubClass('Scholar');
        await controller.confirm();
        assert.equals('已完成轉職', controller.getFlowView().texts.emptyHint);
        assert.equals('gongsun 已追加副職：文官', controller.getFlowView().texts.noticeLabel);
        controller.focusGeneral('kid');
        assert.equals('目前沒有可轉職的武將', controller.getFlowView().texts.emptyHint);
    });

    return suite;
}
