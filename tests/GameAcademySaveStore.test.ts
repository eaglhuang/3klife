/**
 * GameAcademySaveStore — 學府修業存檔、外界時間凍結與舊存檔相容（PROG-2-9189）
 *
 * Unity 對照：EditMode Test 驗證存檔往返與狀態機規則。
 */
import { assert, TestSuite } from './TestRunner';
import { AcademyFrozenError, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { GameAcademySaveStore, isAcademyRecordActive, normalizeAcademyRecord, type PersistedAcademyRecord } from '../assets/scripts/core/services/GameAcademySaveStore';
import { AcademyAntiSLManager, AcademyStorageError } from '../assets/scripts/core/systems/nurture/AcademyAntiSLManager';
import { createAcademySnapshot } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { AcademyId } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { YINGCHUAN_GIMMICK } from '../assets/scripts/core/systems/nurture/YingchuanAcademy';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const CHILD = { id: 'child-a', name: '少主', age: 16, str: 30, lea: 30, int: 30, pol: 30, cha: 30 } as unknown as GeneralConfig;

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([{ ...CHILD }]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.4);
    return session;
}

function freshSnapshot() {
    return createAcademySnapshot({
        worldSeed: 'w', clanUuid: 'clan-local', childId: 'child-a', academyId: AcademyId.YINGCHUAN, admissionTurn: 0,
        initialStats: { str: 30, lea: 30, int: 30, pol: 30, cha: 30 },
    }, YINGCHUAN_GIMMICK);
}

export function createGameAcademySaveStoreSuite(): TestSuite {
    const suite = new TestSuite('GameAcademySaveStore (學府存檔與時間凍結 PROG-2-9189)');

    suite.test('begin 寫入：紀錄進 session、時鐘凍結點取入學當下；之後的寫入沿用凍結點', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const manager = new AcademyAntiSLManager(new GameAcademySaveStore(session), YINGCHUAN_GIMMICK);
        const clockAtEnroll = session.gameTime.totalSeasonsElapsed;
        manager.begin(freshSnapshot());
        assert.isTrue(session.isAcademyActive);
        assert.equals(clockAtEnroll, session.academyRecord!.frozenGameTime.totalSeasonsElapsed);
        manager.commit({ actionType: 'REST' });
        manager.acknowledge();
        assert.equals(clockAtEnroll, session.academyRecord!.frozenGameTime.totalSeasonsElapsed);
        assert.equals(2, session.academyRecord!.committed.currentTurn);
    });

    suite.test('修業中 advanceSeason 丟 AcademyFrozenError，時鐘不動；結業後恢復推進', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const store = new GameAcademySaveStore(session);
        new AcademyAntiSLManager(store, YINGCHUAN_GIMMICK).begin(freshSnapshot());
        const before = session.gameTime.totalSeasonsElapsed;
        let frozen = false;
        try { await session.advanceSeason(); } catch (e) { frozen = e instanceof AcademyFrozenError; }
        assert.isTrue(frozen, '修業中不得推進季度');
        assert.equals(before, session.gameTime.totalSeasonsElapsed);
        const record = session.academyRecord!;
        record.committed.graduated = true;
        store.restore(record);
        assert.isFalse(session.isAcademyActive);
        await session.advanceSeason();
        assert.equals(before + 1, session.gameTime.totalSeasonsElapsed);
    });

    suite.test('存檔往返：進行中的紀錄還原，且讀檔後時鐘仍是入學當下', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        const manager = new AcademyAntiSLManager(new GameAcademySaveStore(first), YINGCHUAN_GIMMICK);
        manager.begin(freshSnapshot());
        manager.commit({ actionType: 'REST' });
        manager.acknowledge();
        const frozen = first.gameTime.totalSeasonsElapsed;
        await first.save();
        const second = makeSession(new MemoryStorageAdapter());
        second.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await second.load());
        assert.isTrue(second.isAcademyActive);
        assert.equals(2, second.academyRecord!.committed.currentTurn, '回到同一回合');
        assert.equals(frozen, second.gameTime.totalSeasonsElapsed);
    });

    suite.test('舊存檔沒有 academy 欄位也能讀，且不是修業中', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        await first.save();
        const second = makeSession(new MemoryStorageAdapter());
        second.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await second.load());
        assert.isFalse(second.isAcademyActive);
        assert.equals(null, second.academyRecord);
    });

    suite.test('寫入失敗（壞快照）丟 AcademyStorageError，原紀錄不變；restore 可還原', () => {
        const session = makeSession(new MemoryStorageAdapter());
        const store = new GameAcademySaveStore(session);
        const manager = new AcademyAntiSLManager(store, YINGCHUAN_GIMMICK);
        manager.begin(freshSnapshot());
        const prev = store.read()!;
        let threw = false;
        try { manager.begin({ nope: true } as never); } catch (e) { threw = e instanceof AcademyStorageError; }
        assert.isTrue(threw);
        assert.equals(prev.committed.currentTurn, store.read()!.committed.currentTurn);
        manager.commit({ actionType: 'REST' });
        assert.equals(2, store.read()!.committed.currentTurn);
        store.restore(prev);
        assert.equals(1, store.read()!.committed.currentTurn);
        store.restore(null);
        assert.equals(null, store.read());
    });

    suite.test('recover：未確認的紀錄接續同一回合並累計中斷次數', () => {
        const session = makeSession(new MemoryStorageAdapter());
        const store = new GameAcademySaveStore(session);
        const manager = new AcademyAntiSLManager(store, YINGCHUAN_GIMMICK);
        manager.begin(freshSnapshot());
        manager.commit({ actionType: 'REST' });
        const result = manager.recover();
        assert.isTrue(result!.recovered);
        assert.equals(2, result!.snapshot.currentTurn);
        assert.equals(1, result!.snapshot.sessionCrashCounter);
    });

    suite.test('normalizeAcademyRecord：壞資料回 null；缺 frozenGameTime 用後備時鐘；沒有後備也沒有就丟棄', () => {
        const time = makeSession(new MemoryStorageAdapter()).gameTime;
        assert.equals(null, normalizeAcademyRecord(undefined, time));
        assert.equals(null, normalizeAcademyRecord({ committed: { bad: 1 } }, time));
        const raw = { committed: freshSnapshot(), before: null, action: null, acknowledged: true };
        const ok = normalizeAcademyRecord(raw, time) as PersistedAcademyRecord;
        assert.equals(time.totalSeasonsElapsed, ok.frozenGameTime.totalSeasonsElapsed);
        assert.isTrue(isAcademyRecordActive(ok));
        assert.equals(null, normalizeAcademyRecord(raw, undefined));
    });

    return suite;
}
