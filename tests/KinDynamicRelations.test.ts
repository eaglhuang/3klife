import { assert, TestSuite } from './TestRunner';
import {
    DYNAMIC_RELATION_DECAY_RATE,
    DYNAMIC_RELATION_INITIAL_INTIMACY,
    DYNAMIC_RELATION_INTERACT_GAIN,
    DynamicRelationBook,
    DynamicRelationEventKind,
    dynamicRelationForEvent,
    pairKeyOf,
} from '../assets/scripts/core/systems/KinDynamicRelations';

export function createKinDynamicRelationsSuite(): TestSuite {
    const suite = new TestSuite('KinDynamicRelations (KIN-06 動態關係建立與快照)');

    suite.test('事件對照：共鬥→戰友、結義傭兵→義兄弟、結緣→夫妻、親子', () => {
        const cases: Array<[DynamicRelationEventKind, string]> = [
            ['battle-comrade', 'COMRADE'],
            ['mercenary-oath', 'DYNAMIC_SWORN'],
            ['bonding', 'SPOUSE'],
            ['parentage', 'PARENT_CHILD'],
        ];
        for (const [kind, type] of cases) {
            const result = dynamicRelationForEvent(kind, 'liu-bei', 'guan-yu', 3);
            assert.isTrue(result.ok);
            if (result.ok) {
                assert.equals(type, result.relation.type);
                assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY, result.relation.intimacy);
                assert.equals(3, result.relation.createdSeason);
            }
        }
    });

    suite.test('自我配對與未知事件被拒絕', () => {
        const self = dynamicRelationForEvent('bonding', 'cao-cao', 'cao-cao', 1);
        assert.isFalse(self.ok);
        if (!self.ok) assert.equals('self-relation', self.reason);
        const unknown = dynamicRelationForEvent('gossip' as DynamicRelationEventKind, 'a', 'b', 1);
        assert.isFalse(unknown.ok);
        if (!unknown.ok) assert.equals('unknown-event', unknown.reason);
    });

    suite.test('配對鍵順序無關', () => {
        assert.equals(pairKeyOf('a', 'b'), pairKeyOf('b', 'a'));
    });

    suite.test('同一對、同型別只保留一筆；順序顛倒也視為同一筆', () => {
        const book = new DynamicRelationBook();
        const first = book.record('battle-comrade', 'zhao-yun', 'ma-chao', 2);
        assert.isTrue(first.ok && first.created);
        const again = book.record('battle-comrade', 'ma-chao', 'zhao-yun', 9);
        assert.isTrue(again.ok && !again.created);
        if (again.ok) assert.equals(2, again.relation.createdSeason, '既有資料不被覆寫');
        assert.equals(1, book.size());
    });

    suite.test('同一對可同時擁有不同型別（戰友與夫妻）', () => {
        const book = new DynamicRelationBook();
        book.record('battle-comrade', 'a', 'b', 1);
        book.record('bonding', 'a', 'b', 4);
        assert.equals(2, book.size());
        assert.equals(2, book.listFor('a').length);
    });

    suite.test('listFor 只回傳與該武將有關的關係，依建立季度排序', () => {
        const book = new DynamicRelationBook();
        book.record('bonding', 'x', 'y', 5);
        book.record('battle-comrade', 'x', 'z', 2);
        book.record('battle-comrade', 'p', 'q', 1);
        const list = book.listFor('x');
        assert.equals(2, list.length);
        assert.equals('COMRADE', list[0].type);
        assert.equals('SPOUSE', list[1].type);
        assert.equals(0, book.listFor('nobody').length);
    });

    suite.test('快照為副本，還原後內容一致', () => {
        const book = new DynamicRelationBook();
        book.record('mercenary-oath', 'liu', 'guan', 1);
        book.record('parentage', 'liu', 'liu-shan', 6);
        const snap = book.snapshot();
        snap[0].intimacy = 99;
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY, book.listFor('liu')[0].intimacy, '改快照不影響原表');

        const restored = new DynamicRelationBook();
        const result = restored.restore(book.snapshot());
        assert.equals(2, result.loaded);
        assert.equals(0, result.skipped);
        assert.equals(JSON.stringify(book.listFor('liu')), JSON.stringify(restored.listFor('liu')));
    });

    suite.test('還原時略過無效與重複項目，並清空舊內容', () => {
        const book = new DynamicRelationBook();
        book.record('bonding', 'old-a', 'old-b', 1);
        const result = book.restore([
            { uidA: 'a', uidB: 'b', type: 'SPOUSE', intimacy: 10, createdSeason: 1, decayRate: 0 },
            { uidA: 'b', uidB: 'a', type: 'SPOUSE', intimacy: 20, createdSeason: 2, decayRate: 0 },
            { uidA: 'c', uidB: 'c', type: 'SPOUSE', intimacy: 10, createdSeason: 1, decayRate: 0 },
            { uidA: 'd', uidB: 'e', type: 'COMRADE', intimacy: 150, createdSeason: 1, decayRate: 0 },
            null,
        ]);
        assert.equals(1, result.loaded);
        assert.equals(4, result.skipped);
        assert.equals(1, book.size());
        assert.equals(0, book.listFor('old-a').length, '舊內容已清空');
    });

    suite.test('每季衰退依 decayRate 減親密度，下限 0，回傳改動筆數', () => {
        const book = new DynamicRelationBook();
        book.record('bonding', 'a', 'b', 1);
        book.record('battle-comrade', 'c', 'd', 1);
        const first = book.decaySeason();
        assert.equals(2, first);
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY - DYNAMIC_RELATION_DECAY_RATE, book.listFor('a')[0].intimacy);
        for (let i = 0; i < 30; i++) book.decaySeason();
        assert.equals(0, book.listFor('a')[0].intimacy, '下限為 0');
        assert.equals(0, book.decaySeason(), '已到下限不再計入改動');
    });

    suite.test('互動回補親密度，上限 100，回補同一對所有型別的關係', () => {
        const book = new DynamicRelationBook();
        book.record('bonding', 'a', 'b', 1);
        book.record('battle-comrade', 'b', 'a', 1);
        book.record('bonding', 'a', 'c', 1);
        const updated = book.interact('a', 'b');
        assert.equals(2, updated.length);
        for (const r of updated) assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY + DYNAMIC_RELATION_INTERACT_GAIN, r.intimacy);
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY, book.listFor('a').find((r) => r.uidB === 'c')!.intimacy, '不影響其他配對');
        book.interact('a', 'b', 500);
        assert.equals(100, book.interact('a', 'b', 1)[0].intimacy, '上限 100');
    });

    suite.test('沒有關係的一對互動回傳空陣列；互動後衰退仍依 decayRate 進行', () => {
        const book = new DynamicRelationBook();
        assert.equals(0, book.interact('x', 'y').length);
        book.record('bonding', 'a', 'b', 1);
        book.interact('a', 'b');
        book.decaySeason();
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY + DYNAMIC_RELATION_INTERACT_GAIN - DYNAMIC_RELATION_DECAY_RATE, book.listFor('a')[0].intimacy);
    });

    return suite;
}
