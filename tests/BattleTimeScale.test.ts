/**
 * BattleTimeScale.test.ts — 戰場控制列 x2 加速（主戰場UI規格補充 v3-2，PROG-2-1867）
 *
 * x2 把每幀 dt 乘 2；切回 1 或離開戰場要還原成原本的 tick，不能疊乘。
 *
 * Unity 對照：測 Time.timeScale 設 2 後 deltaTime 變兩倍、設回 1 後恢復。
 */
import { battleTimeScale, effectiveBattleScale, ENEMY_TURN_PLAYBACK_SCALE, isEnemyTurnPlaybackActive, setBattlePaused, setBattleTimeScale, setEnemyTurnPlayback, setTimeScale, BATTLE_PAUSE_SCALE, type Tickable } from '../assets/scripts/battle/views/BattleTimeScale';
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

    suite.test('PROG-2-9413：敵方回合 1.5 倍，與 x2 相乘；單挑中回原速；結束還原', () => {
        assert.equals(1.5, ENEMY_TURN_PLAYBACK_SCALE);
        setBattleTimeScale(1);
        setEnemyTurnPlayback(true);
        assert.isTrue(isEnemyTurnPlaybackActive());
        assert.equals(1.5, effectiveBattleScale());
        setBattleTimeScale(2);
        assert.equals(3, effectiveBattleScale());
        let duel = true;
        setEnemyTurnPlayback(true, () => duel);
        assert.equals(2, effectiveBattleScale(), '單挑面板開著不加速');
        duel = false;
        assert.equals(3, effectiveBattleScale(), '單挑結束當幀恢復');
        setBattlePaused(true);
        assert.equals(BATTLE_PAUSE_SCALE, effectiveBattleScale(), '奧義暫停優先');
        setBattlePaused(false);
        setEnemyTurnPlayback(false);
        assert.isFalse(isEnemyTurnPlaybackActive());
        assert.equals(2, effectiveBattleScale());
        setBattleTimeScale(1);
        assert.equals(1, effectiveBattleScale());
    });

    suite.test('PROG-2-9413：離開戰場（解除訂閱）一併還原敵方回合加速', () => {
        services().initialize();
        const bridge = new BattleUIBridge(createBattleSceneContext(), {} as any);
        bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop, onReplay: noop });
        setEnemyTurnPlayback(true);
        bridge.unsubscribeEvents();
        assert.isFalse(isEnemyTurnPlaybackActive());
        assert.equals(1, effectiveBattleScale());
    });

    return suite;
}
