/**
 * OpeningTravelCountdown.test.ts — 新手開場紅顏趕路倒數的開始、存讀檔與離線計時（OPEN-11）headless 測試
 *
 * Unity 對照：PlayMode 測試把 App 關掉再開，確認 DateTime 存進 PlayerPrefs 後，離線時間仍算進倒數。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import {
    countdownStatus,
    normalizeCountdownState,
    OPENING_TRAVEL_DURATION_MS,
    OPENING_TRAVEL_TARGET_ID,
} from '../assets/scripts/core/systems/CountdownManager';

const HOUR = 60 * 60 * 1000;

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(1414);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createOpeningTravelCountdownSuite(): TestSuite {
    const suite = new TestSuite('OpeningTravelCountdown (OPEN-11 趕路倒數)');

    suite.test('首次展示紅顏時開始趕路倒數：甄姬、三小時、可加速；之後再呼叫不重置', async () => {
        const session = sessionOn(new MemoryStorageAdapter());
        await session.markOpeningRedFaceShown(1000);
        const countdown = session.countdown;
        assert.equals(OPENING_TRAVEL_TARGET_ID, countdown?.targetId);
        assert.equals(1000 + OPENING_TRAVEL_DURATION_MS, countdown?.finishTimestamp);
        assert.isTrue(countdown?.canAccelerate ?? false);

        await session.markOpeningRedFaceShown(5000);
        assert.equals(1000, session.countdown?.startTimestamp, '已展示過不重開倒數');
    });

    suite.test('倒數經真實 JSON 存檔，新 session 讀回後離線仍照絕對時間計算', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        await source.markOpeningRedFaceShown(1000);
        await source.save();
        const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
        await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(JSON.stringify(source.countdown), JSON.stringify(restored.countdown));
        const countdown = restored.countdown!;
        assert.equals('traveling', countdownStatus(countdown, 1000 + HOUR).status, '離線一小時仍在趕路');
        assert.equals('arrived', countdownStatus(countdown, 1000 + 4 * HOUR).status, '離線超過三小時即到達');
    });

    suite.test('沒有趕路的存檔不寫入欄位；舊檔讀回為 null', async () => {
        const adapter = new MemoryStorageAdapter();
        await sessionOn(adapter).save();
        const raw = await adapter.get<Record<string, unknown>>(PLAYER_SAVE_KEY);
        assert.isTrue(raw !== null && !('countdown' in raw!));

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(null, restored.countdown);
    });

    suite.test('normalizeCountdownState：缺欄、目標為空、終點早於起點都拒收', () => {
        const valid = { targetId: 'zhen-ji', startTimestamp: 1, finishTimestamp: 2, canAccelerate: true, accelerated: false };
        assert.isTrue(normalizeCountdownState(valid) !== null);
        assert.equals(null, normalizeCountdownState({ ...valid, targetId: '' }));
        assert.equals(null, normalizeCountdownState({ ...valid, finishTimestamp: 0 }));
        assert.equals(null, normalizeCountdownState({ ...valid, canAccelerate: 'yes' }));
        assert.equals(null, normalizeCountdownState(null));
    });

    return suite;
}
