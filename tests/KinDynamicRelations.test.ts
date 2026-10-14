import { assert, TestSuite } from './TestRunner';
import {
    DYNAMIC_RELATION_INITIAL_INTIMACY,
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

    return suite;
}
