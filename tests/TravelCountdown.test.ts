import { assert, TestSuite } from './TestRunner';
import {
    createTravelCountdown,
    normalizeTravelCountdown,
    tickTravelCountdown,
    travelStatus,
} from '../assets/scripts/core/systems/TravelCountdown';

export function createTravelCountdownSuite(): TestSuite {
    const suite = new TestSuite('TravelCountdown (趕路倒數回合制)');

    suite.test('建立時剩餘回合等於輸入，狀態為趕路中', () => {
        const state = createTravelCountdown('zhen-mi', 3);
        assert.equals(3, state.remainingTurns);
        assert.equals('traveling', travelStatus(state).status);
    });

    suite.test('每回合減一，歸零後為已到達，不會變成負數', () => {
        let state = createTravelCountdown('zhen-mi', 2);
        state = tickTravelCountdown(state);
        assert.equals(1, state.remainingTurns);
        state = tickTravelCountdown(state);
        assert.equals(0, state.remainingTurns);
        assert.equals('arrived', travelStatus(state).status);
        state = tickTravelCountdown(state);
        assert.equals(0, state.remainingTurns);
    });

    suite.test('tick 不改輸入物件', () => {
        const state = createTravelCountdown('zhen-mi', 2);
        tickTravelCountdown(state);
        assert.equals(2, state.remainingTurns);
    });

    suite.test('回合數非正整數時拋出 RangeError', () => {
        for (const bad of [0, -1, 1.5, Number.NaN]) {
            let threw = false;
            try {
                createTravelCountdown('zhen-mi', bad);
            } catch (error) {
                threw = error instanceof RangeError;
            }
            assert.isTrue(threw, `應拒絕 ${bad}`);
        }
    });

    suite.test('讀回存檔時只接受合法的趕路資料，其餘視為沒有趕路', () => {
        assert.equals(null, normalizeTravelCountdown(undefined));
        assert.equals(null, normalizeTravelCountdown({ targetId: '', remainingTurns: 2 }));
        assert.equals(null, normalizeTravelCountdown({ targetId: 'a', remainingTurns: 0 }));
        assert.equals(null, normalizeTravelCountdown({ targetId: 'a', remainingTurns: 1.5 }));
        assert.equals('a', normalizeTravelCountdown({ targetId: 'a', remainingTurns: 2 })!.targetId);
    });

    return suite;
}
