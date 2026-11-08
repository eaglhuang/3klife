import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

/** Q52 結算資料層額度（PROG-2-1991）：多名武將出戰，單場覺醒最多 1 個 */
function warrior(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 90, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
        genes: [
            { id: 'gene_cavalry', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1, displayName: '騎兵' },
        ],
    } as unknown as GeneralConfig;
}

export function createAwakeningQuotaSettlementSuite(): TestSuite {
    const suite = new TestSuite('AwakeningQuotaSettlement（Q52 單場覺醒 ≤ 1 PROG-2-1991）');

    suite.test('兩名武將都會覺醒的戰鬥：只有第一名覺醒，第二名因子仍鎖住', async () => {
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([warrior('a'), warrior('b')]));
        session.setRandomSource(() => 0);
        const record = await session.recordBattle(['a', 'b'], 'enemy-win');
        assert.equals(1, record.awakenings.length);
        assert.equals('a', record.awakenings[0].generalId);
        const roster = session.roster;
        assert.equals(false, roster.find((g) => g.id === 'a')!.genes![0].isLocked);
        assert.equals(true, roster.find((g) => g.id === 'b')!.genes![0].isLocked);
    });

    suite.test('新的一場重新計額度：下一場輪到第二名武將覺醒 1 個', async () => {
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([warrior('a'), warrior('b')]));
        session.setRandomSource(() => 0);
        await session.recordBattle(['a', 'b'], 'enemy-win');
        const second = await session.recordBattle(['a', 'b'], 'enemy-win');
        assert.equals(1, second.awakenings.length);
        assert.equals('b', second.awakenings[0].generalId);
    });

    return suite;
}
