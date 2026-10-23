/**
 * NewGameResetE2E.test.ts — 開新局要把整份進度歸零（QA，PROG-2-0660）
 *
 * Unity 對照：像在同一個執行中的 App 讀完舊存檔後按「新遊戲」，場景裡的單例（GameSession）
 * 不能留著上一局的戰魂碎片、羈絆點、新手導覽、待結算死亡，否則新局一開始就帶著舊進度。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 40, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
}

function lifecycleStub(session: GameSession): void {
    session.setLifecycle({
        settleSeason: async (roster: GeneralConfig[]) => ({
            roster: roster.filter((g) => g.status !== 'dead'),
            settlement: { spiritCards: [] },
        }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
}

function setup(roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    lifecycleStub(session);
    return session;
}

export function createNewGameResetE2ESuite(): TestSuite {
    const suite = new TestSuite('NewGameResetE2E (開新局歸零 PROG-2-0660)');

    suite.test('上一局的戰魂碎片不會帶進新局，也不能拿來寄宿', async () => {
        const session = setup([
            general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 }),
            general('zhang', { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 }),
        ]);
        session.spendLifespan('liu', 'breeding');
        await session.advanceSeason();
        assert.equals(1, Object.keys(session.createSnapshot().soulFragments ?? {}).length);

        session.startNewGame(5);
        assert.equals(0, Object.keys(session.createSnapshot().soulFragments ?? {}).length, '新局不該有舊局碎片');
    });

    suite.test('上一局的待結算死亡不會在新局第一季被結算', async () => {
        const session = setup([general('liu', { age: 69.75, templateId: 'liu-bei-1', bloodlineId: 'bl-1', totalTp: 500 })]);
        session.spendLifespan('liu', 'breeding');
        assert.isTrue((session.createSnapshot().pendingLifespanDeaths ?? []).length > 0);

        session.startNewGame(5);
        assert.equals(0, (session.createSnapshot().pendingLifespanDeaths ?? []).length);
    });

    suite.test('羈絆點、借將帳本、新手導覽進度都在新局歸零', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = setup([]);
        const save = new PlayerSaveService(adapter);
        first.setSaveService(save);
        first.startNewGame(1);
        await save.save({ ...first.createSnapshot(), bondPoints: 40 });
        assert.isTrue(await first.load());
        await first.acknowledgeOnboarding('fate');
        assert.equals(40, first.createSnapshot().bondPoints);

        first.startNewGame(2);
        const snap = first.createSnapshot();
        assert.equals(0, snap.bondPoints ?? 0, '羈絆點歸零');
        assert.equals(0, (snap.friendBorrowLedger?.records ?? []).length);
        const fresh = setup([]);
        fresh.startNewGame(2);
        assert.equals(JSON.stringify(fresh.createSnapshot().onboarding), JSON.stringify(snap.onboarding), '導覽進度與全新遊戲相同');
    });

    return suite;
}
