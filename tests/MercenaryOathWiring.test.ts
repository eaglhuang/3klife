import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { hasSwornBrotherInLineup } from '../assets/scripts/core/systems/KinBattleEffects';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// 結義傭兵事件呼叫端（PROG-2-0533）：暫定以出戰主將為結義對象。

function leadGeneral(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

export function createMercenaryOathWiringSuite(): TestSuite {
    const suite = new TestSuite('MercenaryOathWiring (PROG-2-0533 結義義兄弟)');

    suite.test('沒有出戰主將時不記結義關係，回傳 null', async () => {
        const session = new GameSession(3);
        const result = await session.recordMercenaryOath('merc-1');
        assert.equals(null, result);
        assert.equals(0, session.dynamicRelations.listFor('merc-1').length);
    });

    suite.test('出戰主將可出戰時，結義傭兵與主將記為 DYNAMIC_SWORN', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([leadGeneral('lead-1')]));
        assert.isTrue(await session.setLeadGeneral('lead-1'));
        const result = await session.recordMercenaryOath('merc-1');
        assert.isTrue(result !== null && result.ok && result.created);
        const relations = session.dynamicRelations.listFor('merc-1');
        assert.equals(1, relations.length);
        assert.equals('DYNAMIC_SWORN', relations[0].type);
        assert.isTrue(relations[0].uidA === 'lead-1' || relations[0].uidB === 'lead-1');
    });

    suite.test('同一主將再次結義同一傭兵時不重複記錄', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([leadGeneral('lead-1')]));
        await session.setLeadGeneral('lead-1');
        await session.recordMercenaryOath('merc-1');
        const second = await session.recordMercenaryOath('merc-1');
        assert.isTrue(second !== null && second.ok && !second.created);
        assert.equals(1, session.dynamicRelations.listFor('merc-1').length);
    });

    suite.test('同一套 id：傭兵 general.id（=模板 id）與主將 id 記入結義，戰場以虎符模板 id＋主將 id 讀得到', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([leadGeneral('lead-1'), leadGeneral('merc-1')]));
        assert.isTrue(await session.setLeadGeneral('lead-1'));
        await session.recordMercenaryOath('merc-1');
        // 戰場主將 id = 大廳 resolveLeadGeneralId（可出戰時即 _leadGeneralId）
        const pgId = session.resolveLeadGeneralId('zhang-fei');
        assert.equals('lead-1', pgId);
        const snapshot = session.dynamicRelations.snapshot();
        // 傭兵虎符 sourceTemplateId = 傭兵 general.id；名單 = 主將 id
        assert.isTrue(hasSwornBrotherInLineup(null, snapshot, 'merc-1', [pgId]), '傭兵部隊見得到主將義兄弟');
        assert.isTrue(hasSwornBrotherInLineup(null, snapshot, 'lead-1', ['merc-1']), '主將部隊見得到傭兵義兄弟');
        assert.isTrue(!hasSwornBrotherInLineup(null, snapshot, 'merc-1', ['someone-else']), '名單外不算');
    });

    return suite;
}
