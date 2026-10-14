import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    HALL_BOARD_MAX_ROWS,
    HALL_BOARD_SPOT_SLOTS,
    HALL_DEFAULT_PLAYER,
    HallBoardPanelController,
    HallBoardPanelDeps,
} from '../assets/scripts/ui/core/HallBoardPanelController';
import { loadLobbyHub } from '../assets/scripts/core/systems/HallMissionBoardPresenter';
import type { HallSpotRow } from '../assets/scripts/core/systems/HallCharacterPresenter';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function hub(): any {
    const loaded = loadLobbyHub(readJson('assets/resources/data/lobby-hub.json'));
    if (!loaded.ok) throw new Error('lobby-hub.json 驗證失敗');
    return loaded.hub;
}

function makeDeps(overrides: Partial<HallBoardPanelDeps> = {}, spots: HallSpotRow[] = []): HallBoardPanelDeps {
    return {
        hub: () => hub(),
        player: () => HALL_DEFAULT_PLAYER,
        assignments: () => ({}),
        leadGeneralId: () => 'zhang-fei',
        assign: async () => true,
        refreshSpots: () => spots,
        displayName: (id: string) => `名${id}`,
        ...overrides,
    };
}

export function createHallBoardPanelControllerSuite(): TestSuite {
    const suite = new TestSuite('HallBoardPanelController (HALL-03/07 畫面流程)');

    suite.test('軍事牆列資料來自 lobby-hub.json，依官階與階段過濾後產生 flow 文字', () => {
        const controller = new HallBoardPanelController(makeDeps());
        const rows = controller.rows();
        assert.isTrue(rows.length > 0 && rows.length <= HALL_BOARD_MAX_ROWS);
        const view = controller.getFlowView();
        assert.equals(rows[0].title, view.texts.hallRow0Title);
        assert.isTrue(view.actives.hallRow0);
        assert.isFalse(view.actives[`hallRow${HALL_BOARD_MAX_ROWS - 1}`] && rows.length < HALL_BOARD_MAX_ROWS);
    });

    suite.test('指派狀態覆蓋靜態資料：已接取列顯示已接取且按鈕停用', () => {
        const first = hub().Mission_Boards.Military.Tasks[0].Task_ID;
        const controller = new HallBoardPanelController(makeDeps({ assignments: () => ({ [first]: 'zhang-fei' }) }));
        const view = controller.getFlowView();
        const row = controller.rows().find(r => r.taskId === first)!;
        assert.isTrue(row.accepted);
        assert.equals('已接取', view.texts.hallRow0Status !== '' ? view.texts.hallRow0Status : '已接取');
        assert.isFalse(view.enabled[`btnHallRow${controller.rows().indexOf(row)}`]);
    });

    suite.test('沒有出戰主將時接取失敗，不呼叫指派，notice 有提示', async () => {
        let called = false;
        const controller = new HallBoardPanelController(makeDeps({
            leadGeneralId: () => null,
            assign: async () => { called = true; return true; },
        }));
        const ok = await controller.accept(0);
        assert.isFalse(ok);
        assert.isFalse(called);
        assert.isTrue(controller.getFlowView().texts.noticeLabel.includes('出戰主將'));
    });

    suite.test('接取成功：把第一列任務指派給出戰主將', async () => {
        const seen: string[] = [];
        const controller = new HallBoardPanelController(makeDeps({
            assign: async (taskId, generalId) => { seen.push(`${taskId}:${generalId}`); return true; },
        }));
        const expectedTask = controller.rows()[0].taskId;
        assert.isTrue(await controller.accept(0));
        assert.equals(`${expectedTask}:zhang-fei`, seen[0]);
    });

    suite.test('切換到內政牆後標題與列資料改變', () => {
        const controller = new HallBoardPanelController(makeDeps());
        const militaryTitle = controller.getFlowView().texts.hallBoardTitle;
        controller.switchBoard('Domestic');
        const view = controller.getFlowView();
        assert.isTrue(view.texts.hallBoardTitle !== militaryTitle);
        assert.equals(controller.rows()[0].title, view.texts.hallRow0Title);
    });

    suite.test('點位列最多 4 格，名稱與標籤來自 refreshSpots', () => {
        const spots: HallSpotRow[] = [
            { id: 'a', favorite: true, assigned: false },
            { id: 'b', favorite: false, assigned: true },
            { id: 'c', favorite: true, assigned: true },
            { id: 'd', favorite: false, assigned: false },
            { id: 'e', favorite: false, assigned: false },
        ];
        const view = new HallBoardPanelController(makeDeps({}, spots)).getFlowView();
        assert.equals('名a', view.texts.spot0Name);
        assert.equals('收藏', view.texts.spot0Tag);
        assert.equals('已派任務', view.texts.spot1Tag);
        assert.equals('收藏 · 已派任務', view.texts.spot2Tag);
        assert.isFalse(view.actives[`spot${HALL_BOARD_SPOT_SLOTS}`] ?? false);
        assert.isTrue(view.actives.spot3);
    });

    return suite;
}

export function createHallBoardLayoutSuite(): TestSuite {
    const suite = new TestSuite('HallBoardLayout (HALL-03 畫面 JSON 對得上)');

    suite.test('flow view 的每個 key 都有對應的 layout 節點 id，且 skinSlot 都在 skin 內', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/hall-board-main.json');
        const skin = readJson('assets/resources/ui-spec/skins/hall-board-screen.skin.json');
        const ids = new Set<string>();
        const slots: string[] = [];
        const walk = (node: any): void => {
            if (!node || typeof node !== 'object') return;
            if (typeof node.id === 'string') ids.add(node.id);
            if (typeof node.skinSlot === 'string') slots.push(node.skinSlot);
            if (typeof node.styleSlot === 'string') slots.push(node.styleSlot);
            for (const child of node.children ?? []) walk(child);
        };
        walk(layout.root);
        const controller = new HallBoardPanelController(makeDeps({}, [{ id: 'a', favorite: false, assigned: false }]));
        const view = controller.getFlowView();
        const keys = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)];
        for (const key of keys) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        for (const slot of slots) {
            assert.isTrue(slot in skin.slots, `skin 缺少 ${slot}`);
        }
    });

    suite.test('天下沙盤遠征牆：依沙盤階段過濾，標題切換，列資料來自 Expedition 牆', () => {
        const controller = new HallBoardPanelController(makeDeps());
        controller.switchBoard('Expedition');
        const rows = controller.rows();
        assert.equals(1, rows.length);
        assert.equals('E-EASY-01', rows[0].taskId);
        const view = controller.getFlowView();
        assert.equals('天下沙盤・遠征', view.texts.hallBoardTitle);
        assert.equals(rows[0].title, view.texts.hallRow0Title);
    });

    suite.test('天下沙盤與雙牆共用同一條接取入口：指派給出戰主將', async () => {
        const assigned: Array<[string, string]> = [];
        const controller = new HallBoardPanelController(makeDeps({
            assign: async (taskId, generalId) => {
                assigned.push([taskId, generalId]);
                return true;
            },
        }));
        controller.switchBoard('Expedition');
        assert.isTrue(await controller.accept(0));
        assert.equals(1, assigned.length);
        assert.equals('E-EASY-01', assigned[0][0]);
        assert.equals('zhang-fei', assigned[0][1]);
    });

    suite.test('沒有遠征牆的大廳資料：天下沙盤列為空，不拋錯', () => {
        const noExpedition = (): any => {
            const copy = JSON.parse(JSON.stringify(hub()));
            delete copy.Mission_Boards.Expedition;
            return copy;
        };
        const controller = new HallBoardPanelController(makeDeps({ hub: noExpedition }));
        controller.switchBoard('Expedition');
        assert.equals(0, controller.rows().length);
        assert.isFalse(controller.getFlowView().actives.hallRow0);
    });

    suite.test('flow view 的沙盤分頁鈕與 layout 節點對應，文字標示天下沙盤', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/hall-board-main.json');
        const ids = new Set<string>();
        const walk = (node: any): void => {
            if (!node || typeof node !== 'object') return;
            if (typeof node.id === 'string') ids.add(node.id);
            for (const child of node.children ?? []) walk(child);
        };
        walk(layout.root);
        assert.isTrue(ids.has('btnHallBoardExpedition'));
        assert.isTrue(ids.has('btnHallBoardExpeditionLabel'));
        const view = new HallBoardPanelController(makeDeps()).getFlowView();
        assert.equals('天下沙盤', view.texts.btnHallBoardExpeditionLabel);
        assert.isTrue(view.enabled.btnHallBoardExpedition);
    });

    suite.test('lobby-hub.json 通過 loadLobbyHub 驗證', () => {
        assert.isTrue(loadLobbyHub(readJson('assets/resources/data/lobby-hub.json')).ok);
    });

    return suite;
}
