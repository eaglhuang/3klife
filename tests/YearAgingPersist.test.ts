/**
 * 年度老化事件存檔（PROG-2-0815）
 *
 * 鎖住：舊存檔缺欄位與壞項目讀回為空、有效項目保留；
 * 存檔後讀檔，年末年報仍計入讀檔前累積的死亡。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { normalizeYearAgingEvents } from '../assets/scripts/core/systems/YearReport';
import type { AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';

function makeGeneral(id: string, age: number, extra: Partial<AgingGeneral> = {}): AgingGeneral {
    return { id, name: id, faction: 'player', age, ...extra } as AgingGeneral;
}

function createSession(storage: MemoryStorageAdapter, roster: AgingGeneral[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster as never));
    session.setSaveService(new PlayerSaveService(storage));
    session.setRandomSource(() => 0);
    return session;
}

export function createYearAgingPersistSuite(): TestSuite {
    const suite = new TestSuite('YearAgingPersist (年度老化事件存檔 PROG-2-0815)');

    suite.test('舊存檔沒有欄位或為壞值：讀回空陣列', () => {
        assert.equals(0, normalizeYearAgingEvents(undefined).length);
        assert.equals(0, normalizeYearAgingEvents('bad').length);
        assert.equals(0, normalizeYearAgingEvents({}).length);
    });

    suite.test('有效項目保留，壞項目丟棄', () => {
        const events = normalizeYearAgingEvents([
            { type: 'died', generalId: 'a', age: 80 },
            { type: 'unknown', generalId: 'b', age: 60 },
            { type: 'entered-growth-stage', generalId: 'c', age: 16, stage: 'grow-up' },
            { type: 'died', generalId: 'd', age: Number.NaN },
            null,
        ]);
        assert.equals(2, events.length);
        assert.equals('a', events[0].generalId);
        assert.equals('grow-up', events[1].stage ?? '');
    });

    suite.test('存檔後讀檔：年末年報仍計入讀檔前的死亡', async () => {
        const storage = new MemoryStorageAdapter();
        const before = createSession(storage, [makeGeneral('dying', 90, { maxLifespan: 70 })]);
        await before.advanceSeason();

        const after = createSession(storage, []);
        assert.isTrue(await after.load());
        let report = null as Awaited<ReturnType<GameSession['advanceSeason']>>['yearReport'] | null;
        for (let i = 0; i < 3; i++) {
            report = (await after.advanceSeason()).yearReport ?? null;
        }
        assert.equals(1, report?.deaths ?? -1);
    });

    return suite;
}
