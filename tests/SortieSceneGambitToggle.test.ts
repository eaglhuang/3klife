// @spec-source → 戰法場景規格書.md (doc_spec_0039) B-1；裁決 11/09 第 12 題；PROG-2-2196
import { assert, TestSuite } from './TestRunner';
import { BattleTactic } from '../assets/scripts/core/config/Constants';
import { normalizePendingSceneGambit, type PendingSceneGambit } from '../assets/scripts/core/systems/HallSceneGambit';
import { SortieSetupController, type SortieSetupDeps } from '../assets/scripts/ui/core/SortieSetupController';

function controllerWith(initial: PendingSceneGambit | null): { ctrl: SortieSetupController; pending: () => PendingSceneGambit | null } {
    let pending = initial;
    const commander = { id: 'g-a', name: '主將', lea: 80, int: 80, pol: 80 };
    const session = {
        leadGeneralId: 'g-a',
        sortieSupport: { strategistUid: null, deputyUid: null },
        military: {},
        get pendingSceneGambit() { return pending; },
        setPendingSceneGambitArmed: async (armed: boolean) => {
            if (!pending) return false;
            pending = armed ? { taskId: pending.taskId, tactic: pending.tactic } : { ...pending, disarmed: true };
            return true;
        },
        getDeployableGenerals: () => [commander],
        setSortieSupport: () => ({ ok: true }),
        getSortieSupportSummary: () => ({ strategist: null, deputy: null, strategistBonus: {}, deputyBonus: {} }),
        getSortieInput: () => null,
    } as unknown as SortieSetupDeps['session'];
    return { ctrl: new SortieSetupController({ session }), pending: () => pending };
}

export function createSortieSceneGambitToggleSuite(): TestSuite {
    const suite = new TestSuite('SortieSceneGambitToggle');

    suite.test('沒有待發動時不顯示勾選列', () => {
        const { ctrl } = controllerWith(null);
        const view = ctrl.getView();
        assert.isFalse(view.actives.btnToggleSceneGambit);
        assert.equals('', view.texts.sceneGambitToggleLabel);
    });

    suite.test('接到軍事任務後自動點亮，可取消再勾回', async () => {
        const { ctrl, pending } = controllerWith({ taskId: 'M-NIGHT', tactic: BattleTactic.NightRaid });
        const lit = ctrl.getView();
        assert.isTrue(lit.actives.btnToggleSceneGambit);
        assert.isTrue(lit.texts.sceneGambitToggleLabel.endsWith('已勾選'), lit.texts.sceneGambitToggleLabel);

        await ctrl.toggleSceneGambit();
        assert.isTrue(pending()?.disarmed === true);
        const off = ctrl.getView();
        assert.isTrue(off.actives.btnToggleSceneGambit, '取消後仍顯示，才能勾回');
        assert.isTrue(off.texts.sceneGambitToggleLabel.endsWith('未勾選'), off.texts.sceneGambitToggleLabel);

        await ctrl.toggleSceneGambit();
        assert.equals(undefined, pending()?.disarmed);
    });

    suite.test('取消勾選會隨存檔保留；舊存檔沒有欄位視為已勾選', () => {
        const kept = normalizePendingSceneGambit({ taskId: 'M', tactic: BattleTactic.NightRaid, disarmed: true });
        assert.isTrue(kept?.disarmed === true);
        const old = normalizePendingSceneGambit({ taskId: 'M', tactic: BattleTactic.NightRaid });
        assert.equals(undefined, old?.disarmed);
    });

    return suite;
}
