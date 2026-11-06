/**
 * StatusEffectFloat.test.ts — 單位中狀態時頭頂飄字（主戰場UI規格書 §3.2，PROG-2-1869）
 *
 * BuffApplied 原本沒人接收；要在該單位位置飄「暈眩」等狀態名，陣亡或找不到單位就不飄。
 *
 * Unity 對照：EditMode 測試對 EventBus 發事件，檢查 View 的飄字介面被呼叫。
 */
import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { STATUS_EFFECT_LABEL, statusEffectFloatText } from '../assets/scripts/battle/shared/StatusEffectLabel';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { EVENT_NAMES } from '../assets/scripts/core/config/Constants';
import { StatusEffect } from '../assets/scripts/shared/CommonEnums';
import { TestSuite, assert } from './TestRunner';

const noop = () => undefined;

function wiredBridge(units: Array<{ id: string; lane: number; depth: number; dead?: boolean }>) {
    services().initialize();
    const floats: Array<{ lane: number; depth: number; text: string }> = [];
    const ctx = createBattleSceneContext();
    ctx.unitRenderer = { playBuffConsumeValue: (lane: number, depth: number, text: string) => floats.push({ lane, depth, text }) } as any;
    ctx.ctrl = { state: { units: new Map(units.map((u) => [u.id, { ...u, isDead: () => !!u.dead }])) } } as any;
    const bridge = new BattleUIBridge(ctx, {} as any);
    bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop, onReplay: noop });
    return { bridge, floats };
}

export function createStatusEffectFloatSuite(): TestSuite {
    const suite = new TestSuite('StatusEffectFloat (Buff/Debuff 飄字 PROG-2-1869)');

    suite.test('每種狀態都有中文名；未知狀態不飄', () => {
        for (const effect of Object.values(StatusEffect)) assert.isTrue(STATUS_EFFECT_LABEL[effect].length > 0);
        assert.equals('暈眩', statusEffectFloatText(StatusEffect.Stun));
        assert.equals('', statusEffectFloatText('unknown'));
    });

    suite.test('BuffApplied：在該單位位置飄狀態名', () => {
        const { bridge, floats } = wiredBridge([{ id: 'u1', lane: 2, depth: 4 }]);
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'u1', effect: StatusEffect.Stun, turns: 1 });
        bridge.unsubscribeEvents();
        assert.equals(1, floats.length);
        assert.equals(2, floats[0].lane);
        assert.equals(4, floats[0].depth);
        assert.equals('暈眩', floats[0].text);
    });

    suite.test('單位已陣亡、找不到或狀態未知：不飄', () => {
        const { bridge, floats } = wiredBridge([{ id: 'dead', lane: 0, depth: 0, dead: true }, { id: 'u2', lane: 1, depth: 1 }]);
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'dead', effect: StatusEffect.Weak, turns: 2 });
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'missing', effect: StatusEffect.Slow, turns: 2 });
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'u2', effect: 'unknown', turns: 2 });
        bridge.unsubscribeEvents();
        assert.equals(0, floats.length);
    });

    return suite;
}
