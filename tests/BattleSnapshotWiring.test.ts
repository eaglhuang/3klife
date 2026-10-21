/**
 * BattleSnapshotWiring.test.ts — 戰後結算產出單場戰報快照（PROG-2-0951）
 *
 * Unity 對照：EditMode Test，驗證戰鬥結束後戰報 DTO 只保留最近一場、ongoing 不產生。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

function readySession(): GameSession {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1'), makeGeneral('dep-1')]));
    return session;
}

export function createBattleSnapshotWiringSuite(): TestSuite {
    const suite = new TestSuite('BattleSnapshotWiring (PROG-2-0951)');

    suite.test('尚未戰鬥時快照為空', () => {
        assert.equals(0, readySession().lastBattleSnapshots.length);
    });

    suite.test('戰後為每位出戰武將產生一筆快照，帶勝負與本場表現', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1', 'dep-1'], 'player-win', {
            performance: { 'lead-1': { kills: 3, damageDealt: 500, damageTaken: 40, healingDone: 10 } },
        });
        const snapshots = session.lastBattleSnapshots;
        assert.equals(2, snapshots.length);
        const lead = snapshots.find((s) => s.generalUid === 'lead-1');
        assert.equals(3, lead?.kills ?? -1);
        assert.equals(500, lead?.damageDealt ?? -1);
        assert.isTrue(lead?.isWinner === true, '勝利場次應標 isWinner');
        assert.equals(0, snapshots.find((s) => s.generalUid === 'dep-1')?.kills ?? -1);
        assert.equals(`${session.gameTime.currentYear}Q${session.gameTime.currentSeason}`, lead?.battleDate ?? '');
    });

    suite.test('只保留最近一場：第二場覆蓋第一場，battleId 不同', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'player-win');
        const firstId = session.lastBattleSnapshots[0]?.battleId ?? '';
        await session.recordBattle(['dep-1'], 'enemy-win');
        const snapshots = session.lastBattleSnapshots;
        assert.equals(1, snapshots.length);
        assert.equals('dep-1', snapshots[0]?.generalUid ?? '');
        assert.isTrue(snapshots[0]?.isWinner === false, '敗場 isWinner 為 false');
        assert.isTrue(snapshots[0]?.battleId !== firstId, '每場 battleId 應不同');
    });

    suite.test('ongoing 不結算，快照維持上一場', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'player-win');
        await session.recordBattle(['lead-1'], 'ongoing');
        assert.equals(1, session.lastBattleSnapshots.length);
    });

    return suite;
}
