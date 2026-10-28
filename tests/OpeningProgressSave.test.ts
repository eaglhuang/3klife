/**
 * OpeningProgressSave.test.ts — 新玩家開場進度存讀與接續（PROG-2-1371）
 *
 * 鎖住：開場幕 id 寫進存檔、讀回後能接回同一幕；結束為 null 不寫入欄位；
 * 認不得的幕 id 不接續；壞資料在讀檔時丟棄。
 *
 * Unity 對照：像把 Tutorial 進度存進 Save 檔，下次開遊戲時 Tutorial Manager 從存下的步驟接續，而不是從頭播。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { createNewPlayerOpeningFlow, SHOWCASE_DONE_EVENT } from '../assets/scripts/core/systems/NewPlayerOpening';
import { normalizeOpeningPhaseId } from '../assets/scripts/core/systems/OpeningProgress';

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.4);
    return session;
}

export function createOpeningProgressSaveSuite(): TestSuite {
    const suite = new TestSuite('OpeningProgressSave (PROG-2-1371 開場進度存讀)');

    suite.test('normalizeOpeningPhaseId：只接受非空且不過長的字串', () => {
        assert.equals('showcase', normalizeOpeningPhaseId('showcase')!);
        assert.isTrue(normalizeOpeningPhaseId('') === null);
        assert.isTrue(normalizeOpeningPhaseId(5) === null);
        assert.isTrue(normalizeOpeningPhaseId(undefined) === null);
        assert.isTrue(normalizeOpeningPhaseId('x'.repeat(33)) === null);
    });

    suite.test('flow.restoreAt 接回指定幕，之後事件照常推進到結束', () => {
        const flow = createNewPlayerOpeningFlow();
        assert.isTrue(flow.restoreAt('showcase'));
        assert.equals('showcase', flow.current()!.id);
        assert.equals(null, flow.advance({ type: SHOWCASE_DONE_EVENT }));
    });

    suite.test('flow.restoreAt 認不得的幕 id 回傳 false，流程保持未開始', () => {
        const flow = createNewPlayerOpeningFlow();
        assert.isFalse(flow.restoreAt('no-such-phase'));
        assert.isTrue(flow.current() === null);
    });

    suite.test('新遊戲沒有開場進度，存檔不寫入欄位', () => {
        const session = makeSession(new MemoryStorageAdapter());
        assert.isTrue(session.openingPhase === null);
        assert.isTrue(session.createSnapshot(new Date(0)).openingPhase === undefined);
    });

    suite.test('設定開場幕後存檔，讀回同一幕；讀檔後開場幕可接續', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        await first.setOpeningPhase('showcase');

        const second = makeSession(adapter);
        assert.isTrue(await second.load());
        assert.equals('showcase', second.openingPhase!);

        const flow = createNewPlayerOpeningFlow();
        assert.isTrue(flow.restoreAt(second.openingPhase!));
        assert.equals('showcase', flow.current()!.id);
    });

    suite.test('開場結束（設為 null）後存檔不再帶開場進度，讀回也不接續', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        await first.setOpeningPhase('destiny');
        await first.setOpeningPhase(null);
        assert.isTrue(first.createSnapshot(new Date(0)).openingPhase === undefined);

        const second = makeSession(adapter);
        await second.load();
        assert.isTrue(second.openingPhase === null);
    });

    suite.test('舊存檔沒有 openingPhase 欄位，讀回為沒有進行中的開場', () => {
        const session = makeSession(new MemoryStorageAdapter());
        session.restoreLifespanState({ schemaVersion: 1 } as unknown as PlayerSaveSnapshot);
        assert.isTrue(session.openingPhase === null);
    });

    suite.test('壞資料的開場幕 id 在讀檔時被丟棄', () => {
        const session = makeSession(new MemoryStorageAdapter());
        session.restoreLifespanState({ openingPhase: 42 } as unknown as PlayerSaveSnapshot);
        assert.isTrue(session.openingPhase === null);
    });

    return suite;
}
