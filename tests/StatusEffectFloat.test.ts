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
/** 等戰鬥動畫佇列排空、震波延遲（最多 0.35 秒）跑完 */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 600));

function wiredBridge(units: Array<{ id: string; lane: number; depth: number; dead?: boolean }>) {
    services().initialize();
    const floats: Array<{ lane: number; depth: number; text: string }> = [];
    const flinches: string[] = [];
    const ctx = createBattleSceneContext();
    ctx.unitRenderer = {
        playBuffConsumeValue: (lane: number, depth: number, text: string) => floats.push({ lane, depth, text }),
        playHitAnimation: (id: string) => flinches.push(id),
    } as any;
    ctx.ctrl = { state: { units: new Map(units.map((u) => [u.id, { ...u, isDead: () => !!u.dead }])) } } as any;
    // PROG-2-9435：狀態上身改排進戰鬥動畫佇列並依遠近錯開，場景要能 scheduleOnce
    const scene = { isValid: true, scheduleOnce: (fn: () => void, sec: number) => { setTimeout(fn, sec * 1000); } };
    const bridge = new BattleUIBridge(ctx, scene as any);
    bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop, onReplay: noop });
    return { bridge, floats, flinches, ctx };
}

export function createStatusEffectFloatSuite(): TestSuite {
    const suite = new TestSuite('StatusEffectFloat (Buff/Debuff 飄字 PROG-2-1869)');

    suite.test('每種狀態都有中文名；未知狀態不飄', () => {
        for (const effect of Object.values(StatusEffect)) assert.isTrue(STATUS_EFFECT_LABEL[effect].length > 0);
        assert.equals('暈眩', statusEffectFloatText(StatusEffect.Stun));
        assert.equals('', statusEffectFloatText('unknown'));
    });

    suite.test('BuffApplied：排隊後在該單位位置飄狀態名，控制狀態讓目標縮一下', async () => {
        const { bridge, floats, flinches } = wiredBridge([{ id: 'u1', lane: 2, depth: 4 }]);
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'u1', effect: StatusEffect.Stun, turns: 1 });
        bridge.unsubscribeEvents();
        assert.equals(0, floats.length, '事件一到不立刻飄（等奧義分鏡與出招特效）');
        await settle();
        assert.equals(1, floats.length);
        assert.equals(1, flinches.length);
        assert.equals(2, floats[0].lane);
        assert.equals(4, floats[0].depth);
        assert.equals('暈眩', floats[0].text);
    });

    suite.test('增益狀態：飄字但目標不縮', async () => {
        const { bridge, floats, flinches } = wiredBridge([{ id: 'u3', lane: 1, depth: 0 }]);
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'u3', effect: StatusEffect.Haste, turns: 1 });
        bridge.unsubscribeEvents();
        await settle();
        assert.equals(1, floats.length);
        assert.equals(0, flinches.length);
    });

    suite.test('單位已陣亡、找不到或狀態未知：不飄', async () => {
        const { bridge, floats } = wiredBridge([{ id: 'dead', lane: 0, depth: 0, dead: true }, { id: 'u2', lane: 1, depth: 1 }]);
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'dead', effect: StatusEffect.Weak, turns: 2 });
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'missing', effect: StatusEffect.Slow, turns: 2 });
        services().event.emit(EVENT_NAMES.BuffApplied, { unitId: 'u2', effect: 'unknown', turns: 2 });
        bridge.unsubscribeEvents();
        await settle();
        assert.equals(0, floats.length);
    });

    return suite;
}
