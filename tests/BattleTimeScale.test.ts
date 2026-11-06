/**
 * BattleTimeScale.test.ts — 戰場控制列 x2 加速（主戰場UI規格補充 v3-2，PROG-2-1867）
 *
 * x2 把每幀 dt 乘 2；切回 1 或離開戰場要還原成原本的 tick，不能疊乘。
 *
 * Unity 對照：測 Time.timeScale 設 2 後 deltaTime 變兩倍、設回 1 後恢復。
 */
import { battleTimeScale, setTimeScale, type Tickable } from '../assets/scripts/battle/views/BattleTimeScale';
import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { EVENT_NAMES } from '../assets/scripts/core/config/Constants';
import { TestSuite, assert } from './TestRunner';

function fakeDirector(): Tickable & { seen: number[] } {
    const seen: number[] = [];
    return { seen, tick(dt: number) { seen.push(dt); } };
}

const noop = () => undefined;

export function createBattleTimeScaleSuite(): TestSuite {
    const suite = new TestSuite('BattleTimeScale (戰場 x2 加速 PROG-2-1867)');

    suite.test('x2：每幀 dt 乘 2；重複設 2 不會疊乘', () => {
        const d = fakeDirector();
        setTimeScale(d, 2);
        setTimeScale(d, 2);
        d.tick(0.016);
        assert.equals(0.032, d.seen[0]);
    });

    suite.test('切回 1 還原原本的 tick；不合法倍率視為 1', () => {
        const d = fakeDirector();
        const original = d.tick;
        setTimeScale(d, 2);
        assert.equals(1, setTimeScale(d, 1));
        assert.equals(original, d.tick);
        assert.equals(1, setTimeScale(d, 0));
        assert.equals(1, setTimeScale(d, Number.NaN));
        d.tick(0.016);
        assert.equals(0.016, d.seen[0]);
    });

    suite.test('戰場接線：控制列發 x2 即加速，解除訂閱（離開戰場）還原 1', () => {
        services().initialize();
        const bridge = new BattleUIBridge(createBattleSceneContext(), {} as any);
        bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop, onReplay: noop });
        services().event.emit(EVENT_NAMES.BattleSpeedToggled, 2);
        assert.equals(2, battleTimeScale());
        services().event.emit(EVENT_NAMES.BattleSpeedToggled, 1);
        assert.equals(1, battleTimeScale());
        services().event.emit(EVENT_NAMES.BattleSpeedToggled, 2);
        bridge.unsubscribeEvents();
        assert.equals(1, battleTimeScale());
    });

    return suite;
}
