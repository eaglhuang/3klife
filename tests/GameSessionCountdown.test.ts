import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { createCountdown } from '../assets/scripts/core/systems/CountdownManager';
import { buildCountdownIconFlowView } from '../assets/scripts/core/systems/CountdownIconView';

export function createGameSessionCountdownSuite(): TestSuite {
    const suite = new TestSuite('GameSessionCountdown (OPEN-11 趕路倒數狀態來源)');

    suite.test('新局沒有趕路倒數，圖示保持隱藏', () => {
        const session = new GameSession(1);
        assert.equals(null, session.countdown);
        const view = buildCountdownIconFlowView(session.countdown, Date.now());
        assert.isFalse(view.actives.countdownIconLabel);
    });

    suite.test('startCountdown 寫入後畫面圖示顯示剩餘時間；回傳的是複本', () => {
        const session = new GameSession(1);
        const now = 1_000_000;
        session.startCountdown(createCountdown('zhen-mi', now, 60_000, true));
        const view = buildCountdownIconFlowView(session.countdown, now);
        assert.isTrue(view.actives.countdownIconLabel);
        assert.equals('01:00', view.texts.countdownIconLabel);
        const copy = session.countdown!;
        copy.finishTimestamp = 0;
        assert.equals(now + 60_000, session.countdown!.finishTimestamp);
    });

    suite.test('clearCountdown 後圖示隱藏', () => {
        const session = new GameSession(1);
        session.startCountdown(createCountdown('zhen-mi', 0, 5_000, false));
        session.clearCountdown();
        assert.equals(null, session.countdown);
        const view = buildCountdownIconFlowView(session.countdown, 0);
        assert.isFalse(view.actives.countdownIconLabel);
    });

    return suite;
}
