/**
 * DestinyOpeningController.test.ts — 新局宿命轉蛋畫面流程（PROG-2-0645）
 *
 * Unity 對照：像開局選角畫面的 Presenter 測試，點按鈕 → 檢查畫面欄位與 GameSession 結果。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { STARTER_GENERAL_IDS } from '../assets/scripts/core/services/StarterRosterService';
import { DestinyOpeningController, DESTINY_OPENING_MAX_ROWS } from '../assets/scripts/ui/core/DestinyOpeningController';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8')) as T;
}

const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
const heroPool = readJson<GachaConfig[]>('assets/resources/data/gacha-config.json').find(c => c.poolId === 'hero-pool')!;

function newSession(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0.99);
    return session;
}

function makeController(config: GachaConfig = heroPool, session = newSession(), started: string[] = []) {
    const controller = new DestinyOpeningController({
        config: () => config,
        generals: () => generals,
        session,
        random: () => 0.3,
        seed: () => 7,
        onStarted: (id) => { started.push(id); },
    });
    return { controller, session, started };
}

function collectIds(node: any, out: Set<string>): void {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) collectIds(child, out);
}

export function createDestinyOpeningControllerSuite(): TestSuite {
    const suite = new TestSuite('DestinyOpeningController (宿命轉蛋畫面流程)');

    suite.test('初始只有轉蛋鈕可按，沒有候選列', () => {
        const view = makeController().controller.getFlowView();
        assert.isTrue(view.enabled.btnDestinyRoll);
        assert.isFalse(view.enabled.btnDestinyReset);
        assert.isFalse(view.enabled.btnDestinyConfirm);
        for (let i = 0; i < DESTINY_OPENING_MAX_ROWS; i++) assert.isFalse(view.actives[`destinyRow${i}`]);
    });

    suite.test('轉蛋後顯示六位初始名將的名字，轉蛋鈕停用、重置鈕啟用', () => {
        const { controller } = makeController();
        assert.isTrue(controller.roll());
        const view = controller.getFlowView();
        const names = Array.from({ length: DESTINY_OPENING_MAX_ROWS }, (_, i) => view.texts[`destinyRow${i}Name`]);
        const expected = STARTER_GENERAL_IDS.map(id => generals.find(g => g.id === id)!.name).sort();
        assert.equals(expected.join(','), [...names].sort().join(','));
        assert.isFalse(view.enabled.btnDestinyRoll);
        assert.isTrue(view.enabled.btnDestinyReset);
        assert.isFalse(controller.roll());
    });

    suite.test('重置回到未抽，次數累計；可再轉蛋', () => {
        const { controller } = makeController();
        controller.roll();
        assert.isTrue(controller.reset());
        assert.equals('重置 1 次', controller.getFlowView().texts.destinyResetCount);
        assert.isTrue(controller.roll());
    });

    suite.test('真實設定（選定即鎖定）：點第 i 列就以該位為核心開新局並通知存檔', async () => {
        for (let i = 0; i < DESTINY_OPENING_MAX_ROWS; i++) {
            const { controller, session, started } = makeController();
            controller.roll();
            const picked = controller.state.rolled[i];
            assert.isTrue(await controller.select(i));
            assert.isTrue(controller.started);
            assert.equals(picked, session.leadGeneralId);
            assert.equals(picked, started[0]);
            assert.equals(6, session.roster.length);
        }
    });

    suite.test('需要確認的設定：選中不開局，確認鈕啟用，確認後才開局', async () => {
        const { controller, session } = makeController({ ...heroPool, confirmRequired: true });
        controller.roll();
        assert.isTrue(await controller.select(2));
        assert.isFalse(controller.started);
        assert.equals(0, session.roster.length);
        const view = controller.getFlowView();
        assert.isTrue(view.enabled.btnDestinyConfirm);
        assert.equals('已選', view.texts.btnDestinyRow2Label);
        assert.isTrue(await controller.confirm());
        assert.equals(controller.state.rolled[2], session.leadGeneralId);
    });

    suite.test('沒有選定就確認、未抽就點列都會被拒絕且不開局', async () => {
        const { controller, session } = makeController({ ...heroPool, confirmRequired: true });
        assert.isFalse(await controller.select(0));
        controller.roll();
        assert.isFalse(await controller.confirm());
        assert.isFalse(await controller.select(DESTINY_OPENING_MAX_ROWS));
        assert.equals(0, session.roster.length);
    });

    suite.test('開局失敗（武將資料缺漏）退回已抽未鎖，可重置重選，不卡死', async () => {
        const session = newSession();
        const controller = new DestinyOpeningController({
            config: () => heroPool, generals: () => [], session, random: () => 0.3, seed: () => 7, onStarted: () => undefined,
        });
        controller.roll();
        assert.isFalse(await controller.select(0));
        assert.equals('rolled', controller.state.phase);
        assert.isTrue(controller.getFlowView().texts.destinyMessage.startsWith('開局失敗'));
        assert.isTrue(controller.reset());
    });

    suite.test('鎖定後 roll / reset 都被拒絕', async () => {
        const { controller } = makeController();
        controller.roll();
        await controller.select(0);
        assert.isFalse(controller.roll());
        assert.isFalse(controller.reset());
    });

    suite.test('FlowView 的 key 與按鈕 id 都存在於 destiny-opening-main.json', () => {
        const layout = readJson<any>('assets/resources/ui-spec/layouts/destiny-opening-main.json');
        const ids = new Set<string>();
        collectIds(layout.root, ids);
        const { controller } = makeController();
        controller.roll();
        const view = controller.getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        const screen = readJson<any>('assets/resources/ui-spec/screens/destiny-opening-screen.json');
        assert.equals('destiny-opening-main', screen.layout);
        const skin = readJson<any>('assets/resources/ui-spec/skins/destiny-opening-screen.skin.json');
        const slots = JSON.stringify(layout).match(/"(?:skinSlot|styleSlot)":\s*"([^"]+)"/g) ?? [];
        for (const entry of slots) {
            const slot = entry.replace(/.*:\s*"/, '').replace(/"$/, '');
            assert.isDefined(skin.slots[slot], `skin 缺少 ${slot}`);
        }
    });

    return suite;
}
