/**
 * BattleComradeWiring.test.ts — 共鬥（戰後）戰友事件呼叫端（PROG-2-0535）
 *
 * 出征編制的主將與參謀官／後勤官各成一對戰友；戰後記錄，不等多武將出戰。
 * Unity 對照：像戰鬥結束事件的 Listener，只在有編隊時寫入關係資料。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { battleComradePairs } from '../assets/scripts/core/systems/KinDynamicRelations';
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
    session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1'), makeGeneral('strat-1'), makeGeneral('dep-1')]));
    return session;
}

export function createBattleComradeWiringSuite(): TestSuite {
    const suite = new TestSuite('BattleComradeWiring (PROG-2-0535 共鬥戰友)');

    suite.test('battleComradePairs：主將與參謀、後勤各成一對；略過空值、同 id 與重複', () => {
        assert.equals(2, battleComradePairs('lead-1', ['strat-1', 'dep-1']).length);
        assert.equals(1, battleComradePairs('lead-1', [null, 'dep-1']).length);
        assert.equals(0, battleComradePairs('lead-1', [null, null]).length);
        assert.equals(0, battleComradePairs(null, ['strat-1', 'dep-1']).length);
        assert.equals(1, battleComradePairs('lead-1', ['lead-1', 'dep-1']).length);
        assert.equals(1, battleComradePairs('lead-1', ['dep-1', 'dep-1']).length);
    });

    suite.test('出征編制有參謀與後勤時，戰後主將與兩人各記一筆 COMRADE；兩名支援之間不配對', async () => {
        const session = readySession();
        assert.isTrue(await session.setLeadGeneral('lead-1'));
        assert.isTrue(session.setSortieSupport('strat-1', 'dep-1').ok);
        await session.recordBattle(['lead-1'], 'player-win', { stageId: 'stage-1', sortie: { lostTroops: 0, foodSpent: 0 } });
        assert.equals(2, session.dynamicRelations.listFor('lead-1').length);
        assert.equals(1, session.dynamicRelations.listFor('strat-1').length);
        assert.equals(1, session.dynamicRelations.listFor('dep-1').length);
        assert.equals('COMRADE', session.dynamicRelations.listFor('strat-1')[0].type);
    });

    suite.test('沒有出征主將時戰後不記戰友', async () => {
        const session = readySession();
        await session.recordBattle(['lead-1'], 'player-win', { stageId: 'stage-1' });
        assert.equals(0, session.dynamicRelations.listFor('lead-1').length);
    });

    suite.test('有設定出征支援但本場未出征（沒有 sortie）時不記戰友', async () => {
        const session = readySession();
        await session.setLeadGeneral('lead-1');
        session.setSortieSupport('strat-1', 'dep-1');
        await session.recordBattle(['lead-1'], 'player-win', { stageId: 'stage-1' });
        assert.equals(0, session.dynamicRelations.listFor('lead-1').length);
    });

    suite.test('ongoing 不記戰友；同一編制重複戰鬥不重複記錄', async () => {
        const session = readySession();
        await session.setLeadGeneral('lead-1');
        session.setSortieSupport('strat-1', null);
        await session.recordBattle(['lead-1'], 'ongoing', { sortie: { lostTroops: 0, foodSpent: 0 } });
        assert.equals(0, session.dynamicRelations.listFor('strat-1').length);
        await session.recordBattle(['lead-1'], 'player-win', { sortie: { lostTroops: 0, foodSpent: 0 } });
        await session.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: 0, foodSpent: 0 } });
        assert.equals(1, session.dynamicRelations.listFor('strat-1').length);
    });

    return suite;
}
