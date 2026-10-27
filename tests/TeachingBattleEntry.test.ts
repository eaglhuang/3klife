/**
 * TeachingBattleEntry.test.ts — 英靈夢回教學戰的戰後呼叫端：勝利才產出初始虎符（PROG-2-1207，OPEN-13）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { TeachingSpiritInput } from '../assets/scripts/core/systems/TeachingSpiritTalisman';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

function readySession(): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1')]));
    return session;
}

function spirit(): TeachingSpiritInput {
    return { spiritId: 'SPIRIT_TEST', spiritName: '測試英靈', geneIds: ['GENE_A', 'GENE_B', 'GENE_C'] };
}

export function createTeachingBattleEntrySuite(): TestSuite {
    const suite = new TestSuite('TeachingBattleEntry (PROG-2-1207 教學戰戰後呼叫端)');

    suite.test('教學戰勝利時產出初始虎符', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'player-win', { teachingSpirit: spirit() });
        assert.equals('SPIRIT_TEST', session.startingTalisman!.sourceSpiritId);
    });

    suite.test('教學戰敗北不產出初始虎符，玩家可以重打', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'enemy-win', { teachingSpirit: spirit() });
        assert.isTrue(session.startingTalisman === null);
    });

    suite.test('沒有傳入教學英靈的戰鬥不影響虎符', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'player-win', {});
        assert.isTrue(session.startingTalisman === null);
    });

    suite.test('第二次教學戰勝利不覆蓋既有虎符', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'player-win', { teachingSpirit: spirit() });
        await session.recordBattle(['lead-1'], 'player-win', { teachingSpirit: { spiritId: 'SPIRIT_OTHER', spiritName: '他人', geneIds: [] } });
        assert.equals('SPIRIT_TEST', session.startingTalisman!.sourceSpiritId);
    });

    return suite;
}
