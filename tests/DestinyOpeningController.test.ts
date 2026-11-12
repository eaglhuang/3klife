/**
 * DestinyOpeningController.test.ts — 新局宿命池流程（PROG-2-0645；PROG-2-2243 改為十連全收、單鍵確定）
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
import { DestinyOpeningController, DESTINY_INTRO } from '../assets/scripts/ui/core/DestinyOpeningController';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8')) as T;
}

const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
const heroPool = readJson<GachaConfig[]>('assets/resources/data/gacha-config.json').find(c => c.poolId === 'destiny-pool')!;

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

export function createDestinyOpeningControllerSuite(): TestSuite {
    const suite = new TestSuite('DestinyOpeningController (宿命池：十連全收、單鍵確定)');

    suite.test('轉一輪：十位不重複、恰一位宿命名將，核心就是那位', () => {
        const { controller } = makeController();
        assert.isTrue(controller.roll());
        const view = controller.getView();
        assert.equals(10, new Set(view.rolledIds).size);
        const stars = view.rolledIds.filter(isDestinyStar);
        assert.equals(1, stars.length);
        assert.equals(stars[0], view.coreId);
        assert.equals(DESTINY_INTRO[view.coreId as keyof typeof DESTINY_INTRO].quote, view.quote);
    });

    suite.test('重轉免費不限次數，每輪仍恰一位名將', () => {
        const { controller } = makeController();
        assert.isFalse(controller.reroll(), '還沒轉不能重轉');
        controller.roll();
        for (let i = 1; i <= 5; i++) {
            assert.isTrue(controller.reroll());
            assert.equals(i, controller.getView().resets);
            assert.equals(1, controller.getView().rolledIds.filter(isDestinyStar).length);
        }
    });

    suite.test('確定：不用點選，十位全部入名冊，本輪名將當核心主將', async () => {
        const { controller, session, started } = makeController();
        assert.isFalse(await controller.confirm(), '還沒轉不能確定');
        controller.roll();
        const view = controller.getView();
        assert.isTrue(await controller.confirm());
        assert.isTrue(controller.started);
        assert.equals(view.coreId, session.leadGeneralId);
        assert.equals(view.coreId, started[0]);
        assert.equals([...view.rolledIds].sort().join(','), session.roster.map(g => g.id).sort().join(','));
        assert.isFalse(controller.reroll(), '確定後不能再重轉');
        assert.isFalse(await controller.confirm(), '不能重複開局');
    });

    suite.test('開局失敗退回已抽狀態，可以再按確定', async () => {
        const session = newSession();
        let fail = true;
        const original = session.startNewGameWithStarters.bind(session);
        session.startNewGameWithStarters = async (...args: Parameters<typeof original>) => {
            if (fail) throw new Error('boom');
            return original(...args);
        };
        const { controller } = makeController(heroPool, session);
        controller.roll();
        assert.isFalse(await controller.confirm());
        assert.isTrue(controller.getView().message.includes('開局失敗'));
        assert.equals('rolled', controller.state.phase);
        fail = false;
        assert.isTrue(await controller.confirm());
        assert.isTrue(controller.started);
    });

    suite.test('六位名將都有台詞', () => {
        for (const id of STARTER_GENERAL_IDS) assert.isTrue(!!DESTINY_INTRO[id].quote, id);
    });

    return suite;
}
