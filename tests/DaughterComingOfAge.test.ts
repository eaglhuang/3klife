/**
 * DaughterComingOfAge — 子嗣女兒 14 歲及笄分流（FEM-06，PROG-2-0566）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import {
    assignDaughterRoute,
    daughtersAwaitingRoute,
    isComingOfAge,
    type DaughterRecord,
} from '../assets/scripts/core/systems/DaughterComingOfAge';

function daughter(over: Partial<DaughterRecord> = {}): DaughterRecord {
    return { id: 'd1', age: 14, role: null, route: null, ...over };
}

export function createDaughterComingOfAgeSuite(): TestSuite {
    const suite = new TestSuite('DaughterComingOfAge (子嗣女兒及笄分流 FEM-06)');

    suite.test('13 歲不可分流，14 歲起可分流', () => {
        assert.isFalse(isComingOfAge(13));
        assert.isTrue(isComingOfAge(14));
        const early = assignDaughterRoute(daughter({ age: 13 }), 'frontline');
        assert.isFalse(early.ok);
        if (!early.ok) assert.equals('NOT_OF_AGE', early.reason);
    });

    suite.test('前線武將路線職能為 Combat，教官儲備為 Mentor', () => {
        const front = assignDaughterRoute(daughter(), 'frontline');
        const mentor = assignDaughterRoute(daughter(), 'instructor');
        assert.isTrue(front.ok && front.daughter.role === 'Combat');
        assert.isTrue(mentor.ok && mentor.daughter.role === 'Mentor');
        assert.isTrue(front.ok && !front.pendingDecision);
    });

    suite.test('後宮女官路線記錄路線、職能維持 null 並標為待裁決', () => {
        const palace = assignDaughterRoute(daughter(), 'palace');
        assert.isTrue(palace.ok);
        if (palace.ok) {
            assert.equals('palace', palace.daughter.route);
            assert.equals(null, palace.daughter.role);
            assert.isTrue(palace.pendingDecision);
        }
    });

    suite.test('已分流者不可重選，職能一旦定下不被覆寫', () => {
        const first = assignDaughterRoute(daughter(), 'frontline');
        assert.isTrue(first.ok);
        if (!first.ok) return;
        const again = assignDaughterRoute(first.daughter, 'instructor');
        assert.isFalse(again.ok);
        if (!again.ok) assert.equals('ALREADY_ROUTED', again.reason);
    });

    suite.test('待分流清單只含已滿 14 歲且尚未選路線的女兒', () => {
        const list = [
            daughter({ id: 'young', age: 10 }),
            daughter({ id: 'ready', age: 14 }),
            daughter({ id: 'done', age: 15, route: 'frontline', role: 'Combat' }),
        ];
        const ids = daughtersAwaitingRoute(list).map((d) => d.id);
        assert.equals('ready', ids.join(','));
    });

    return suite;
}
