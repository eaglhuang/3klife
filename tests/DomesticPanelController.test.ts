/**
 * DomesticPanelController.test.ts — 大廳內政畫面流程 headless 測試（PROG-2-0319 / WBS MVP-10）
 *
 * 不開 Cocos、不建節點：驗證 DomesticPanelController 吐出的 FlowView 與 domestic-main.json 節點 id 對得上，
 * 並確認選擇任務後 GameSession 的資源、同季鎖定與黃金入帳一致。
 *
 * Unity 對照：EditMode Test 測 Presenter 與 GameManager，不實例化 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { DomesticPanelController, DomesticFlowView } from '../assets/scripts/ui/core/DomesticPanelController';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { DomesticSeasonLog, DomesticTaskId, DomesticTaskResult, EMPTY_DOMESTIC_LOG } from '../assets/scripts/core/systems/DomesticTasks';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function layoutIds(): Set<string> {
    const layout = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/ui-spec/layouts/domestic-main.json'), 'utf8'));
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        for (const child of node.children ?? []) walk(child as { id?: string; children?: unknown[] });
    };
    walk(layout.root);
    return ids;
}

function keysOf(view: DomesticFlowView): string[] {
    return [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)];
}

/** 純邏輯假依賴：季數與季紀錄由測試直接指定 */
function fakeController(season: number, initialLog: DomesticSeasonLog = EMPTY_DOMESTIC_LOG) {
    const chosen: DomesticTaskId[] = [];
    let log = initialLog;
    const controller = new DomesticPanelController({
        log: () => log,
        season: () => season,
        choose: async (taskId) => {
            chosen.push(taskId);
            const result: DomesticTaskResult = {
                ok: true,
                granted: 0,
                stock: { food: 0, gold: 0, fame: 0, cityTroops: 0 },
                log: { lastSeason: season, lastTask: taskId },
            };
            log = result.log;
            return result;
        },
    });
    return { controller, chosen };
}

export function createDomesticPanelControllerSuite(): TestSuite {
    const suite = new TestSuite('DomesticPanelController (大廳內政畫面 MVP-10)');

    suite.test('FlowView 的每個 key 都對應 domestic-main.json 的節點 id', () => {
        const { controller } = fakeController(3);
        const ids = layoutIds();
        const missing = keysOf(controller.getFlowView()).filter((key) => !ids.has(key));
        assert.equals(0, missing.length);
    });

    suite.test('初始狀態：5 列全部可選、沒有本季已選標記、顯示季數', () => {
        const { controller } = fakeController(3);
        const view = controller.getFlowView();
        assert.equals(5, controller.rows().length);
        assert.isTrue(controller.rows().every((row) => row.canChoose));
        assert.equals('第 3 季', view.texts.seasonLabel);
        assert.equals('農耕', view.texts.btnFarmingLabel);
        assert.equals('糧草 +120', view.texts.farmingOutput);
        assert.isTrue(view.enabled.btnFarming);
        assert.isFalse(view.actives.noticeLabel);
    });

    suite.test('同季已選一項後，5 個按鈕全部關閉並標示已選那一項', () => {
        const { controller } = fakeController(3, { lastSeason: 3, lastTask: 'commerce' });
        const view = controller.getFlowView();
        assert.isTrue(Object.keys(view.enabled).filter((key) => key.startsWith('btn') && key !== 'btnClose').every((key) => view.enabled[key] === false));
        assert.isTrue(view.actives.commerceChosen);
        assert.isFalse(view.actives.farmingChosen);
        assert.equals('本季已選', view.texts.commerceChosen);
    });

    suite.test('換季後同一項目重新可選', () => {
        const { controller } = fakeController(4, { lastSeason: 3, lastTask: 'commerce' });
        assert.isTrue(controller.rows().every((row) => row.canChoose));
        assert.isFalse(controller.rows().some((row) => row.chosenThisSeason));
    });

    suite.test('choose：可選時呼叫依賴並寫入提示；同季再選不呼叫依賴', async () => {
        const { controller, chosen } = fakeController(3);
        await controller.choose('farming');
        assert.equals(1, chosen.length);
        assert.equals('本季已選「農耕」：糧草 +120', controller.getFlowView().texts.noticeLabel);
        assert.isTrue(controller.getFlowView().actives.noticeLabel);

        const second = await controller.choose('scouting');
        assert.equals(null, second);
        assert.equals(1, chosen.length);
        assert.equals('本季已選過內政任務，下一季再選', controller.getFlowView().texts.noticeLabel);
    });

    suite.test('choose：未知任務 id 直接拒絕，不呼叫依賴', async () => {
        const { controller, chosen } = fakeController(3);
        const result = await controller.choose('unknown' as DomesticTaskId);
        assert.equals(null, result);
        assert.equals(0, chosen.length);
        assert.equals('找不到此內政任務', controller.getFlowView().texts.noticeLabel);
    });

    suite.test('GameSession 整合：選農耕後糧草入帳、同季第二次不再扣任何資源，存進季紀錄', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        const controller = new DomesticPanelController({
            log: () => session.domesticLog,
            season: () => session.gameTime.totalSeasonsElapsed,
            choose: (taskId) => session.chooseDomesticTask(taskId),
        });
        const foodBefore = session.military.food;
        const first = await controller.choose('farming');
        assert.isTrue(first !== null && first.ok);
        const foodAfterFirst = session.military.food;
        assert.isTrue(foodAfterFirst > foodBefore);

        await controller.choose('farming');
        assert.equals(foodAfterFirst, session.military.food);
        assert.equals('farming', session.domesticLog.lastTask);
        assert.isFalse(controller.rows().some((row) => row.canChoose));
    });

    suite.test('GameSession 整合：商業的黃金交給畫面注入的入帳回呼', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        const granted: number[] = [];
        const controller = new DomesticPanelController({
            log: () => session.domesticLog,
            season: () => session.gameTime.totalSeasonsElapsed,
            choose: (taskId) => session.chooseDomesticTask(taskId, (amount) => granted.push(amount)),
        });
        await controller.choose('commerce');
        assert.equals(1, granted.length);
        assert.isTrue(granted[0] > 0);
    });

    return suite;
}
