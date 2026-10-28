/**
 * SevenDayJourneyPersistence.test.ts — 七天歷程的登入流程與存讀檔（RET-12 / PROG-2-1443）
 *
 * 真實走 GameSession.recordLoginAt：首次登入寫 Day 1 日誌；同日重登不重寫；
 * 存檔經 JSON 往返後，觸發點與子嗣紀錄都保留，之後的登入不會重複寫入。
 * 只驗存讀檔流程，不升存檔版號。
 *
 * Unity 對照：Timeline 播過的 Marker 存進存檔，讀回後不會再播一次。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY, PLAYER_SAVE_SCHEMA_VERSION } from '../assets/scripts/core/services/PlayerSaveService';
import { buildBreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';
import type { BreedingResult } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const SEED = 1443;

/** 中午 12:00（UTC+8）的毫秒數，確保切日後落在指定登入日 */
function noonOf(day: string): number {
    return Date.parse(`${day}T04:00:00Z`);
}

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(SEED);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 經真實 JSON 往返，模擬寫入儲存後再讀回 */
async function roundTrip(adapter: MemoryStorageAdapter): Promise<void> {
    const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
    await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
}

function birthOf(childId: string, fatherId: string, motherId: string, daqi = false) {
    const result = {
        outcome: 'conceived',
        breedingMode: 'Peace_Lineage',
        reasons: [],
        conceptionRate: 0.5,
        father: { id: fatherId, name: '父' } as unknown as BreedingResult['father'],
        mother: { id: motherId, name: '母' } as unknown as BreedingResult['mother'],
        child: {
            id: childId, name: '子', gender: '男', age: 0, status: 'Mystery',
            ...(daqi ? { fate: { lateBloomer: true } } : {}),
        } as unknown as BreedingResult['child'],
        ep: { ep: 93 } as unknown as BreedingResult['ep'],
    } as BreedingResult;
    return buildBreedingBirthRecord(result, 'meteor')!.record!;
}

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70 } as unknown as GeneralConfig;
}

/** 日報需要名冊才會生成；名冊為空時第 1 天的日報觸發點不會成立 */
function withRoster(session: GameSession): GameSession {
    session.enrollGenerals([hero('zhang-fei', '張飛'), hero('guan-yu', '關羽')]);
    return session;
}

function journeySummaries(session: GameSession): string[] {
    return session.queryJournal({ category: 'SYSTEM' }).map((e) => e.summary);
}

export function createSevenDayJourneyPersistenceSuite(): TestSuite {
    const suite = new TestSuite('SevenDayJourneyPersistence (七天歷程存讀 RET-12 PROG-2-1443)');

    suite.test('首次登入寫 Day 1 日誌，同日重登不重寫，首次登入日被記下', () => {
        const session = new GameSession(SEED);
        session.startNewGame(SEED);
        withRoster(session).recordLoginAt(noonOf('2026-10-28'));
        const afterFirst = journeySummaries(session);
        assert.equals(1, afterFirst.filter((s) => s.includes('三國日報首次生成')).length);
        assert.equals('2026-10-28', session.sevenDayJourney.firstLoginDay);

        session.recordLoginAt(noonOf('2026-10-28'));
        assert.equals(afterFirst.length, journeySummaries(session).length);
    });

    suite.test('存檔經 JSON 往返後：觸發點不重寫、子嗣紀錄保留，之後的第 4 天 Is_Daqi 仍會觸發', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        withRoster(source).recordLoginAt(noonOf('2026-10-28'));
        source.recordBreedingBirth(birthOf('C1', 'G1', 'G2'));
        source.recordLoginAt(noonOf('2026-10-29'));
        assert.equals(1, journeySummaries(source).filter((s) => s.includes('子嗣誕生')).length);
        await source.save();

        const raw = await adapter.get<{ schemaVersion?: number; sevenDayJourney?: { firstLoginDay: string; firedIds: string[] } }>(PLAYER_SAVE_KEY);
        assert.equals(PLAYER_SAVE_SCHEMA_VERSION, raw?.schemaVersion);
        assert.equals('2026-10-28', raw?.sevenDayJourney?.firstLoginDay);
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals('2026-10-28', restored.sevenDayJourney.firstLoginDay);
        assert.equals(1, restored.breedingBirthRecords().length);

        restored.recordLoginAt(noonOf('2026-10-29'));
        assert.equals(1, journeySummaries(restored).filter((s) => s.includes('子嗣誕生')).length, '讀檔後同日重登不重寫第 2 天');

        restored.recordBreedingBirth(birthOf('C2', 'G3', 'G4', true));
        restored.recordLoginAt(noonOf('2026-10-31'));
        assert.equals(1, journeySummaries(restored).filter((s) => s.includes('晚成')).length, '第 4 天 Is_Daqi 觸發');
    });

    suite.test('舊檔沒有七天歷程欄位：讀檔後為從未登入，第一次登入照樣寫 Day 1', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot = sessionOn(adapter).createSnapshot();
        delete snapshot.sevenDayJourney;
        await adapter.set(PLAYER_SAVE_KEY, snapshot);

        const session = sessionOn(adapter);
        assert.isTrue(await session.load());
        assert.equals(null, session.sevenDayJourney.firstLoginDay);
        withRoster(session).recordLoginAt(noonOf('2026-10-28'));
        assert.equals(1, journeySummaries(session).filter((s) => s.includes('三國日報首次生成')).length);
    });

    return suite;
}
