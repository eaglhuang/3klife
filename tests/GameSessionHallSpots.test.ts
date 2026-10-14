import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string): GeneralConfig {
    return { id, name: id } as unknown as GeneralConfig;
}

export function createGameSessionHallSpotsSuite(): TestSuite {
    const suite = new TestSuite('GameSessionHallSpots (HALL-07 點位接線)');

    suite.test('未刷新前點位為空；第一次刷新抽出名冊內武將並帶出收藏旗標', async () => {
        const session = new GameSession(1);
        await session.addGenerals(['a', 'b', 'c'].map(general));
        await session.toggleFavorite('a');
        assert.equals(0, session.hallSpotRows.length);
        const rows = session.refreshHallSpots(1000, () => 0.1, 3);
        assert.equals(3, rows.length);
        assert.isTrue(rows.some(r => r.id === 'a' && r.favorite));
    });

    suite.test('60 秒內再刷新沿用舊點位；滿 60 秒才重抽', async () => {
        const session = new GameSession(1);
        await session.addGenerals(['a', 'b', 'c', 'd'].map(general));
        const first = session.refreshHallSpots(1000, () => 0.1, 3).map(r => r.id).join(',');
        const same = session.refreshHallSpots(1059, () => 0.99, 3).map(r => r.id).join(',');
        assert.equals(first, same);
        const later = session.refreshHallSpots(1060, () => 0.99, 3);
        assert.equals(3, later.length);
    });

    suite.test('指派任務的武將帶出 assigned 旗標', async () => {
        const session = new GameSession(1);
        await session.addGenerals(['a', 'b'].map(general));
        await session.assignHallTask('task-1', 'b');
        session.refreshHallSpots(0, () => 0.1, 2);
        const b = session.hallSpotRows.find(r => r.id === 'b');
        assert.isTrue(b !== undefined && b.assigned);
    });

    return suite;
}
