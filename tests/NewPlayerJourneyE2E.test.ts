/**
 * NewPlayerJourneyE2E.test.ts — 新玩家完整旅程整合流程（PROG-2-0696）
 * 新局 → 開場（中途存讀檔接回幕）→ 首戰 → 紅顏趕路倒數 → 隔日登入領入學令，全程多次存讀檔。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { ITEM_ADMISSION_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';
import { createNewPlayerOpeningFlow, OPENING_INTRO_DONE, SHOWCASE_DONE_EVENT } from '../assets/scripts/core/systems/NewPlayerOpening';
import { DESTINY_LOCKED_EVENT_TYPE } from '../assets/scripts/core/systems/DestinyOpening';
import { sys } from 'cc';

const DAY1 = Date.UTC(2026, 9, 28, 4, 0); // 12:00 UTC+8
const HOUR = 3600 * 1000;

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(9);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createNewPlayerJourneyE2ESuite(): TestSuite {
    const suite = new TestSuite('NewPlayerJourneyE2E (新玩家完整旅程 PROG-2-0696)');

    suite.test('開場中途存讀檔接回幕 → 首戰 → 紅顏趕路倒數 → 隔日領入學令', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();

        // 1. 新局，進入第一幕，登入領入學令
        const a = build(adapter);
        a.startNewGame(3);
        const flowA = createNewPlayerOpeningFlow();
        flowA.start();
        await a.setOpeningPhase(flowA.current()!.id);
        a.recordLoginAt(DAY1);
        const tokenDay1 = a.itemCount(ITEM_ADMISSION_TOKEN);
        assert.isTrue(tokenDay1 >= 1, '首登發入學令');
        flowA.advance({ type: OPENING_INTRO_DONE });
        await a.setOpeningPhase(flowA.current()!.id);
        assert.equals('destiny', a.openingPhase);
        await a.save();

        // 2. 關遊戲重開：接回第二幕，入學令不重發
        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals('destiny', b.openingPhase);
        const flowB = createNewPlayerOpeningFlow();
        assert.isTrue(flowB.restoreAt(b.openingPhase!), '接回第二幕');
        assert.equals('destiny', flowB.current()!.id);
        b.recordLoginAt(DAY1 + HOUR);
        assert.equals(tokenDay1, b.itemCount(ITEM_ADMISSION_TOKEN), '同日重登不重發');
        flowB.advance({ type: DESTINY_LOCKED_EVENT_TYPE });
        await b.setOpeningPhase(flowB.current()!.id);
        assert.equals('showcase', b.openingPhase);
        flowB.advance({ type: SHOWCASE_DONE_EVENT });
        await b.setOpeningPhase(flowB.current()?.id ?? null);
        assert.equals(null, b.openingPhase, '開場結束');
        assert.isFalse(b.shouldShowOpeningRedFace, '首戰前不彈紅顏');
        assert.equals(null, b.countdown);
        await b.save();

        // 3. 再重開：開場不再接續；首戰勝利後才彈紅顏並啟動趕路倒數
        const c = build(adapter);
        assert.isTrue(await c.load());
        assert.equals(null, c.openingPhase, '開場結束不再接續');
        await c.recordBattle([], 'player-win', { stageId: 'stage-1' });
        assert.isTrue(c.shouldShowOpeningRedFace);
        const shownAt = DAY1 + 2 * HOUR;
        await c.markOpeningRedFaceShown(shownAt);
        assert.isFalse(c.shouldShowOpeningRedFace);
        assert.equals('zhen-ji', c.countdown!.targetId);
        assert.equals(shownAt + 3 * HOUR, c.countdown!.finishTimestamp);
        await c.save();

        // 4. 隔日重開：倒數仍依絕對時間；入學令再發一次；開場與紅顏不重播
        const d = build(adapter);
        assert.isTrue(await d.load());
        assert.equals(shownAt + 3 * HOUR, d.countdown!.finishTimestamp, '倒數存讀檔保留');
        assert.equals(null, d.openingPhase);
        assert.isFalse(d.shouldShowOpeningRedFace);
        d.recordLoginAt(DAY1 + 24 * HOUR);
        assert.isTrue(d.itemCount(ITEM_ADMISSION_TOKEN) > tokenDay1, '隔日再發入學令');
        // 5. 新遊戲覆蓋：舊倒數、開場進度、紅顏旗標全部清掉
        d.startNewGame(3);
        assert.equals(null, d.countdown, '新局清倒數');
        assert.equals(null, d.openingPhase);
        assert.isFalse(d.shouldShowOpeningRedFace);
    });

    return suite;
}
