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
import { isDestinyStar } from '../assets/scripts/core/systems/DestinyPool';
import { DestinyOpeningController, DESTINY_INTRO, DESTINY_OPENING_MAX_ROWS } from '../assets/scripts/ui/core/DestinyOpeningController';

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

function starIndex(controller: DestinyOpeningController): number {
    return controller.state.rolled.findIndex(isDestinyStar);
}

function collectIds(node: any, out: Set<string>): void {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) collectIds(child, out);
}

export function createDestinyOpeningControllerSuite(): TestSuite {
    const suite = new TestSuite('DestinyOpeningController (宿命轉蛋畫面流程)');

    suite.test('初始只有轉蛋鈕可按；列出六位名將的綽號，還不能點', () => {
        const { controller } = makeController();
        const view = controller.getFlowView();
        assert.isTrue(view.enabled.btnDestinyRoll);
        assert.isFalse(view.enabled.btnDestinyReset);
        assert.isFalse(view.enabled.btnDestinyConfirm);
        assert.equals(STARTER_GENERAL_IDS.join(','), controller.framePortraitKeys().join(','));
        STARTER_GENERAL_IDS.forEach((id, i) => {
            assert.isTrue(view.actives[`btnFrame${i}`]);
            assert.isFalse(view.enabled[`btnFrame${i}`]);
            assert.equals(DESTINY_INTRO[id].title, view.texts[`frame${i}Name`]);
            assert.equals('', view.texts[`frame${i}Sub`]);
            assert.isFalse(view.actives[`frame${i}Sel`]);
        });
        assert.isFalse(view.actives.btnFrame6);
    });

    suite.test('轉蛋後十格全開：名將露綽號可點，一般武將露名字不可點', () => {
        const { controller } = makeController();
        assert.isTrue(controller.roll());
        const view = controller.getFlowView();
        assert.equals(10, controller.framePortraitKeys().length);
        controller.state.rolled.forEach((id, i) => {
            const intro = DESTINY_INTRO[id as keyof typeof DESTINY_INTRO];
            assert.isTrue(view.actives[`btnFrame${i}`]);
            assert.equals(!!intro, view.enabled[`btnFrame${i}`]);
            assert.equals(intro ? intro.title : generals.find(g => g.id === id)!.name, view.texts[`frame${i}Name`]);
        });
        assert.isFalse(view.enabled.btnDestinyRoll);
        assert.isTrue(view.enabled.btnDestinyReset);
        assert.isFalse(controller.roll());
    });

    suite.test('點一般武將沒有反應', async () => {
        const { controller } = makeController();
        controller.roll();
        const i = controller.state.rolled.findIndex(id => !isDestinyStar(id));
        assert.isFalse(await controller.select(i));
        assert.isFalse(controller.getFlowView().enabled.btnDestinyConfirm);
    });

    suite.test('點選名將後名字與台詞逐字浮現，看完就留著', async () => {
        const { controller } = makeController();
        controller.roll();
        const i = starIndex(controller);
        const id = controller.state.rolled[i] as keyof typeof DESTINY_INTRO;
        const name = generals.find(g => g.id === id)!.name;
        assert.isTrue(await controller.select(i));
        assert.isTrue(controller.revealing);
        controller.tickReveal(1);
        let view = controller.getFlowView();
        assert.equals(name.slice(0, 1), view.texts[`frame${i}Name`]);
        assert.equals('', view.texts.destinyQuote);
        controller.tickReveal(name.length + 1);
        view = controller.getFlowView();
        assert.equals(name, view.texts[`frame${i}Name`]);
        assert.equals('「' + DESTINY_INTRO[id].quote.slice(0, 1), view.texts.destinyQuote);
        controller.tickReveal(999);
        assert.isFalse(controller.revealing);
        assert.equals(`「${DESTINY_INTRO[id].quote}」`, controller.getFlowView().texts.destinyQuote);
        controller.reset();
        view = controller.getFlowView();
        assert.equals('', view.texts.destinyQuote);
        assert.equals(name, view.texts[`frame${STARTER_GENERAL_IDS.indexOf(id)}Name`]);
    });

    suite.test('重置回到未抽，次數累計；可再轉蛋', () => {
        const { controller } = makeController();
        controller.roll();
        assert.isTrue(controller.reset());
        assert.equals('重置 1 次', controller.getFlowView().texts.destinyResetCount);
        assert.isTrue(controller.roll());
    });

    suite.test('真實設定也要確認：選中不開局，確認後整包入名冊、該位是核心，並通知存檔', async () => {
        assert.isFalse(heroPool.confirmRequired);
        const { controller, session, started } = makeController();
        controller.roll();
        const i = starIndex(controller);
        const picked = controller.state.rolled[i];
        assert.isTrue(await controller.select(i));
        assert.isFalse(controller.started);
        assert.isTrue(controller.getFlowView().actives[`frame${i}Sel`]);
        assert.isTrue(await controller.confirm());
        assert.isTrue(controller.started);
        assert.equals(picked, session.leadGeneralId);
        assert.equals(picked, started[0]);
        assert.equals(10, session.roster.length);
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
        const generalsOverride = { ids: new Set<string>() };
        const controller = new DestinyOpeningController({
            config: () => heroPool, generals: () => generals.filter(g => !generalsOverride.ids.has(g.id)), session, random: () => 0.3, seed: () => 7, onStarted: () => undefined,
        });
        assert.isTrue(controller.roll());
        // 把名將資料抽掉一位，模擬開局時資料缺漏
        const broken = controller.state.rolled[starIndex(controller)];
        generalsOverride.ids.add(broken);
        assert.isTrue(await controller.select(starIndex(controller)));
        assert.isFalse(await controller.confirm());
        assert.equals('rolled', controller.state.phase);
        assert.isTrue(controller.getFlowView().texts.destinyMessage.startsWith('開局失敗'));
        assert.isTrue(controller.reset());
    });

    suite.test('鎖定後 roll / reset 都被拒絕', async () => {
        const { controller } = makeController();
        controller.roll();
        await controller.select(starIndex(controller));
        await controller.confirm();
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
