/**
 * GameSessionHallStage.test.ts — 大廳在場武將檔案與名單（UI-2-0140，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id.toUpperCase(), ...extra } as unknown as GeneralConfig;
}

export function createGameSessionHallStageSuite(): TestSuite {
    const suite = new TestSuite('GameSessionHallStage (UI-2-0140 大廳在場名單)');

    suite.test('武將檔案帶出姓名、稱號與角色標籤；無情緒欄位視為 NORMAL', async () => {
        const session = new GameSession(1);
        await session.addGenerals([general('a', { title: '前將軍', careerClass: 'war', role: 'vanguard' })]);
        const profile = session.hallStageProfile('a');
        assert.isTrue(profile !== null, '查得到');
        assert.equals(profile!.name, 'A', '姓名');
        assert.equals(profile!.title, '前將軍', '稱號');
        assert.equals(profile!.roleTags.join(','), 'war,vanguard', '角色標籤');
        assert.equals(profile!.mood, 'NORMAL', '情緒預設');
        assert.equals(session.hallStageProfile('nobody'), null, '名冊外');
    });

    suite.test('在場名單依點位產出，EAGER 且標籤吻合者掛任務標記', async () => {
        const session = new GameSession(1);
        await session.addGenerals([general('a', { careerClass: 'war', mood: 'EAGER' }), general('b', { careerClass: 'war' })]);
        session.refreshHallSpots(0, () => 0.1, 2);
        const cast = session.hallStageCast([{ id: 't1', tags: ['war'], flags: [] }]);
        assert.equals(cast.generals.map(g => g.id).sort().join(','), 'a,b', '兩人在場');
        assert.equals([...cast.taskMarkIds].join(','), 'a', '只有 a 有標記');
    });

    suite.test('未刷新點位前名單為空', async () => {
        const session = new GameSession(1);
        await session.addGenerals([general('a')]);
        assert.lengthEquals(0, session.hallStageCast([]).generals, '空');
    });

    return suite;
}
