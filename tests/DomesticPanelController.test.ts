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
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, stats: Record<string, number | string>): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 40, hp: 1000, maxLifespan: 70, ...stats } as unknown as GeneralConfig;
}

/** 接上 GameSession 的換將依賴（與 LobbyScene 同形） */
function sessionController(session: GameSession): DomesticPanelController {
    return new DomesticPanelController({
        log: () => session.domesticLog,
        season: () => session.gameTime.totalSeasonsElapsed,
        choose: (taskId) => session.chooseDomesticTask(taskId),
        candidates: () => session.roster.map((g) => ({ id: g.id, name: g.name, stats: session.domesticStatsOf(g) })),
        assignedUid: (taskId) => session.governanceAssignments.find((a) => a.task === taskId)?.generalUid ?? null,
        assign: (taskId, uid) => {
            if (uid === null) { session.unassignGovernor(taskId); return true; }
            return session.assignGovernor(taskId, uid).ok;
        },
        magistrateCandidates: () => session.roster
            .filter((g) => (g as { fatherId?: string }).fatherId)
            .map((g) => ({ id: g.id, name: g.name, pol: session.domesticStatsOf(g).pol })),
        magistrateUid: () => session.magistrateUid,
        setMagistrate: (uid) => session.setMagistrate(uid),
        autoMode: () => session.autoGovernance,
        setAutoMode: (on) => session.setAutoGovernance(on),
    });
}

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

    suite.test('換將：FlowView 含換將鈕與主事欄位，key 全部對得上版面', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('a', { pol: 10 })]));
        const view = sessionController(session).getFlowView();
        const ids = layoutIds();
        assert.equals(0, keysOf(view).filter((key) => !ids.has(key)).length);
        assert.isTrue(view.enabled.btnGovFarming);
        assert.equals('主事：未指派', view.texts.farmingGovernor);
    });

    suite.test('換將：依該任務產出由高到低輪替，最後回到未指派；他格的武將跳過', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([
            general('low', { pol: 10, str: 90 }),
            general('high', { pol: 90, str: 10 }),
        ]));
        session.setAutoSave(false);
        const controller = sessionController(session);
        controller.cycleGovernor('farming');
        assert.equals('high', session.governanceAssignments.find((a) => a.task === 'farming')?.generalUid);
        assert.equals('糧草 +280', controller.getFlowView().texts.farmingOutput);
        assert.equals('主事：high', controller.getFlowView().texts.farmingGovernor);

        controller.cycleGovernor('arms');
        assert.equals('low', session.governanceAssignments.find((a) => a.task === 'arms')?.generalUid);

        controller.cycleGovernor('farming');
        assert.equals(undefined, session.governanceAssignments.find((a) => a.task === 'farming'));
        assert.equals('糧草 +120', controller.getFlowView().texts.farmingOutput);
    });

    suite.test('GameSession 整合：指派武將後選任務，入帳量依武將屬性', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('zhuge', { pol: 95 })]));
        session.setAutoSave(false);
        const controller = sessionController(session);
        controller.cycleGovernor('farming');
        const result = await controller.choose('farming');
        assert.isTrue(result !== null && result.ok);
        assert.equals(290, result!.output!.amount);
    });

    suite.test('自動指派：空格補上武將並顯示太守府提示；全滿時再按只提示', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('a', { pol: 90 }), general('b', { str: 90 })]));
        session.setAutoSave(false);
        const controller = sessionController(session);
        assert.equals(2, controller.autoAssign());
        assert.equals('太守府已自動安排武將執行內政。', controller.getFlowView().texts.noticeLabel);
        assert.equals('主事：a', controller.getFlowView().texts.farmingGovernor);
        assert.equals('主事：b', controller.getFlowView().texts.armsGovernor);
        assert.equals(0, controller.autoAssign());
        assert.equals('沒有可指派的閒置武將', controller.getFlowView().texts.noticeLabel);
    });

    suite.test('自動治理切換：鈕文字隨開關變動，開啟時補格並提示', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('a', { pol: 90 })]));
        session.setAutoSave(false);
        const controller = sessionController(session);
        assert.equals('自動治理：關', controller.getFlowView().texts.btnAutoModeLabel);
        controller.toggleAutoMode();
        assert.equals('自動治理：開', controller.getFlowView().texts.btnAutoModeLabel);
        assert.equals('自動治理已啟用，太守府補上 1 格主事。', controller.getFlowView().texts.noticeLabel);
        controller.toggleAutoMode();
        assert.isFalse(session.autoGovernance);
        assert.equals('已改回手動治理', controller.getFlowView().texts.noticeLabel);
    });

    suite.test('縣令換人：政治高者先任，商業產出顯示含加成；內政主事者跳過；最後卸任', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([
            general('busy', { pol: 99, fatherId: 'f' }),
            general('kid', { pol: 50, fatherId: 'f' }),
            general('founder', { pol: 80 }),
        ]));
        session.setAutoSave(false);
        const controller = sessionController(session);
        assert.equals('郡城縣令：未任命（子嗣可任）', controller.getFlowView().texts.magistrateLabel);
        assert.isTrue(session.assignGovernor('farming', 'busy').ok);
        controller.cycleMagistrate();
        assert.equals('kid', session.magistrateUid);
        assert.equals('郡城縣令：kid（黃金產出 +30%）', controller.getFlowView().texts.magistrateLabel);
        assert.equals('黃金 +130', controller.getFlowView().texts.commerceOutput);
        controller.cycleMagistrate();
        assert.equals(null, session.magistrateUid);
        assert.equals('已卸下郡城縣令', controller.getFlowView().texts.noticeLabel);
    });

    return suite;
}
