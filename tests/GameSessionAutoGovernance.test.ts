/**
 * GameSessionAutoGovernance.test.ts — 自動治理開關與季結分配、存讀檔（PROG-2-0978）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function withRoster(session: GameSession, ...ids: string[]): GameSession {
    session.setRosterStore(new InMemoryRosterStore(ids.map((id) => ({ id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 120 } as unknown as GeneralConfig))));
    return session;
}

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

export function createGameSessionAutoGovernanceSuite(): TestSuite {
    const suite = new TestSuite('GameSessionAutoGovernance (PROG-2-0978 自動治理)');

    suite.test('預設關閉：runAutoGovernance 回傳 null 且不分派', () => {
        const session = new GameSession(1);
        assert.isFalse(session.autoGovernance);
        assert.isTrue(session.runAutoGovernance() === null);
        assert.equals(0, session.governanceAssignments.length);
    });

    suite.test('開啟後分派名冊中的武將，且不超過格數', () => {
        const session = withRoster(new GameSession(1), 'G010', 'G045');
        session.setAutoGovernance(true);
        const result = session.runAutoGovernance();
        assert.isTrue(result !== null);
        assert.equals(2, session.governanceAssignments.length);
        assert.equals('G010', session.governanceAssignments[0].generalUid);
        assert.equals('G045', session.governanceAssignments[1].generalUid);
    });

    suite.test('季結前自動分派：開啟後 advanceSeason 會寫入指派', async () => {
        const session = withRoster(new GameSession(1), 'G010', 'G045');
        session.setAutoGovernance(true);
        await session.advanceSeason();
        assert.equals(2, session.governanceAssignments.length);
    });

    suite.test('跨存讀檔保留自動模式與指派；關閉時快照不寫入欄位', async () => {
        const session = withRoster(new GameSession(1), 'G010', 'G045');
        session.setAutoGovernance(true);
        await session.advanceSeason();
        const snapshot = roundTrip(session.createSnapshot(new Date(0)));
        assert.isTrue(snapshot.governanceAutoMode === true);

        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.isTrue(restored.autoGovernance);
        assert.equals(session.governanceAssignments.length, restored.governanceAssignments.length);

        const off = new GameSession(1);
        assert.isTrue(off.createSnapshot(new Date(0)).governanceAutoMode === undefined);
    });

    suite.test('舊檔沒有 governanceAutoMode：讀回關閉', () => {
        const restored = new GameSession(1);
        restored.setAutoGovernance(true);
        restored.restoreLifespanState({} as PlayerSaveSnapshot);
        assert.isFalse(restored.autoGovernance);
    });

    return suite;
}
