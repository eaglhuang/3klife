/**
 * HallMissionActions — 任務詳情四鈕的再探、等待、耗費條與資料預設值（PROG-2-9128）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    HALL_RECON_COST_GRAIN_DEFAULT, hallCostBarStateOf, hallReconCostGrainOf,
    planHallRecon, planHallWait,
} from '../assets/scripts/core/systems/HallMissionActions';
import { applyLobbyHubDefaults, validateLobbyHub } from '../assets/scripts/core/systems/LobbyHubSchema';
import { loadLobbyHub } from '../assets/scripts/core/systems/HallMissionBoardPresenter';
import { hallTaskDialogStateOf, planHallMissionAction } from '../assets/scripts/ui/core/HallMissionActionRouter';
import { resolveDetailActionStates } from '../assets/scripts/ui/core/HallDetailActionStates';

const TASK = { Task_ID: 'M-T1', Intel_Reveal_Percent: 0 };
const ctx = { selectedGeneralId: 'g1', aiDelegateChecked: false, alreadyAccepted: false };

function readHub(): unknown {
    return JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/lobby-hub.json'), 'utf8'));
}

export function createHallMissionActionsSuite(): TestSuite {
    const suite = new TestSuite('HallMissionActions (詳情窗再探／等待／耗費條，PROG-2-9128)');

    suite.test('再探計畫：已滿不扣、糧不足不扣不升、足夠才扣糧並升到 100', () => {
        assert.equals('full', planHallRecon(100, 9999, 50).kind);
        assert.equals('insufficient', planHallRecon(50, 49, 50).kind);
        const ok = planHallRecon(50, 50, 50);
        assert.equals('ok', ok.kind);
        assert.equals(100, ok.kind === 'ok' ? ok.intelAfter : 0);
        assert.equals(50, ok.kind === 'ok' ? ok.costGrain : 0);
    });

    suite.test('再探耗費取自資料；缺值或非法用預設 50', () => {
        assert.equals(80, hallReconCostGrainOf({ Recon: { Cost_Grain: 80 } }));
        assert.equals(HALL_RECON_COST_GRAIN_DEFAULT, hallReconCostGrainOf({}));
        assert.equals(HALL_RECON_COST_GRAIN_DEFAULT, hallReconCostGrainOf(null));
        const loaded = loadLobbyHub(readHub());
        assert.equals(50, loaded.ok ? hallReconCostGrainOf(loaded.hub) : -1);
    });

    // Session 再探／等待的整合測試（舊 reconHallTask／waitHallTask）已由任務服務取代，見 tests/mission/MissionService.test.ts（PROG-2-9148）

    suite.test('路由：再探與等待有各自的計畫；執行與委任仍走既有路徑', () => {
        assert.equals('recon', planHallMissionAction('re-scout', ctx).kind);
        assert.equals('wait', planHallMissionAction('wait', ctx).kind);
        assert.equals('dispatch', planHallMissionAction('execute', ctx).kind);
        assert.equals('assign-ai', planHallMissionAction('execute', { ...ctx, aiDelegateChecked: true }).kind);
        assert.equals('assign-ai', planHallMissionAction('assign', ctx).kind);
    });

    suite.test('資料預設值：lobby-hub 每個任務四鈕全開、可委任，個別任務可覆寫', () => {
        const loaded = loadLobbyHub(readHub());
        if (!loaded.ok) throw new Error('lobby-hub.json 驗證失敗');
        let checked = 0;
        for (const board of Object.values(loaded.hub.Mission_Boards)) {
            for (const task of board?.Tasks ?? []) {
                assert.isTrue(task.AI_Assign_Enabled);
                assert.equals('RECON,EXECUTE,WAIT,ASSIGN', task.Available_Actions.join(','));
                const state = hallTaskDialogStateOf(task);
                assert.equals(4, state.availableActions.length);
                const { states } = resolveDetailActionStates({ availableActions: state.availableActions, intelRevealPercent: state.intelRevealPercent, selectedGeneralId: 'g', aiDelegateChecked: false });
                assert.isTrue(states.execute.enabled && states.wait.enabled && states.assign.enabled && states['re-scout'].enabled);
                checked++;
            }
        }
        assert.isTrue(checked > 0);
        const raw = readHub() as { Lobby_Hub: { Mission_Boards: { Military: { Tasks: Record<string, unknown>[] } } } };
        raw.Lobby_Hub.Mission_Boards.Military.Tasks[0].AI_Assign_Enabled = false;
        const overridden = applyLobbyHubDefaults(raw) as typeof raw;
        assert.isFalse(overridden.Lobby_Hub.Mission_Boards.Military.Tasks[0].AI_Assign_Enabled as boolean, '任務自己寫的值優先');
        assert.isTrue(validateLobbyHub(raw).ok);
    });

    suite.test('預設值格式錯誤會被驗證擋下', () => {
        const raw = readHub() as { Lobby_Hub: Record<string, unknown> };
        raw.Lobby_Hub.Task_Defaults = { Available_Actions: ['FLY'] };
        assert.isFalse(validateLobbyHub(raw).ok);
        raw.Lobby_Hub.Task_Defaults = {};
        raw.Lobby_Hub.Recon = { Cost_Grain: -1 };
        assert.isFalse(validateLobbyHub(raw).ok);
    });

    suite.test('委任鈕亮暗跟著資料：AI_Assign_Enabled 為 false 時委任鈕不開放', () => {
        const on = hallTaskDialogStateOf({ Intel_Reveal_Percent: 0, Available_Actions: ['ASSIGN', 'EXECUTE'], AI_Assign_Enabled: true });
        assert.isTrue(on.availableActions.includes('assign'));
        const off = hallTaskDialogStateOf({ Intel_Reveal_Percent: 0, Available_Actions: ['ASSIGN', 'EXECUTE'], AI_Assign_Enabled: false });
        assert.isFalse(off.availableActions.includes('assign'));
        assert.isTrue(off.availableActions.includes('execute'));
    });

    suite.test('情報度：再探存檔值與資料底值取較大者；已 100 時再探鈕暗、原因為情報已完整', () => {
        const full = hallTaskDialogStateOf({ Intel_Reveal_Percent: 0, Available_Actions: ['RECON'] }, 100);
        assert.equals(100, full.intelRevealPercent);
        assert.isFalse(full.intelFogVisible);
        const { states } = resolveDetailActionStates({ availableActions: full.availableActions, intelRevealPercent: 100, selectedGeneralId: null, aiDelegateChecked: false });
        assert.isFalse(states['re-scout'].enabled);
        assert.equals('full-intel', states['re-scout'].reason);
    });

    suite.test('耗費條讀任務自己的 Costs', () => {
        const bar = hallCostBarStateOf({ GRAIN: 1200, TROOPS: 250, SILVER: 0, TIME_MINUTES: 150 });
        assert.equals('1,200', bar.costFoodValueLabel);
        assert.equals(0.6, bar.costFoodRatio);
        assert.equals('250', bar.costTroopValueLabel);
        assert.equals(0, bar.costFundRatio);
        assert.equals('2 小時 30 分', bar.costTimeValueLabel);
        const state = hallTaskDialogStateOf({ Intel_Reveal_Percent: 0, Available_Actions: [], Costs: { GRAIN: 10, TROOPS: 0, SILVER: 0, TIME_MINUTES: 0 } });
        assert.equals('10', state.costFoodValueLabel);
        assert.equals('無', state.costTimeValueLabel);
        assert.equals(undefined, hallTaskDialogStateOf({ Intel_Reveal_Percent: 0, Available_Actions: [] }).costFoodValueLabel, '沒帶 Costs 時沿用視窗預設');
    });

    return suite;
}
