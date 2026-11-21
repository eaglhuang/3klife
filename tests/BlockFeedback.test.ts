/**
 * BlockFeedback — 傷害被擋下的演出（PROG-2-9437）
 *
 * 覆蓋：護盾吸收時跳字只顯示真的扣掉的生命、結算事件帶護盾吸收量、
 * 無敵擋下改發「傷害被擋」事件（以前什麼都不發）、畫面飄「無敵」。
 *
 * Unity 對照：EditMode 測試 DamageResult.absorbed 與 HitPresenter 對結果的反應。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { EVENT_NAMES, Faction, StatusEffect } from '../assets/scripts/core/config/Constants';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { BLOCK_FLOAT_TEXT, shieldHitFeedback } from '../assets/scripts/battle/shared/BlockFeedback';
import { createTestUnit } from './BattleSkillTestUtils';

const noop = () => undefined;
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 300));

function resolver(): BattleCombatResolver {
    return new BattleCombatResolver({ state: { getDamageLink: () => null, getGeneral: () => null, units: new Map() } } as never);
}

function capture(eventName: string): { list: any[]; off: () => void } {
    const list: any[] = [];
    const handler = (d: any) => list.push(d);
    services().event.on(eventName, handler);
    return { list, off: () => services().event.off(eventName, handler) };
}

export function createBlockFeedbackSuite(): TestSuite {
    const suite = new TestSuite('BlockFeedback (傷害被擋下演出 PROG-2-9437)');

    suite.test('護盾：全吃掉不飄數字只格擋、吃一部分飄剩下的、沒護盾照舊', () => {
        assert.equals(0, shieldHitFeedback(60, 60).hpLoss);
        assert.isTrue(shieldHitFeedback(60, 60).blocked);
        assert.equals(25, shieldHitFeedback(60, 35).hpLoss);
        assert.isTrue(shieldHitFeedback(60, 35).blocked);
        assert.equals(60, shieldHitFeedback(60, 0).hpLoss);
        assert.isTrue(!shieldHitFeedback(60, undefined).blocked, '舊事件沒有欄位當 0');
        assert.equals(0, shieldHitFeedback(60, 999).hpLoss, '吸收量超過傷害也不出負數');
    });

    suite.test('結算：受傷事件帶護盾吸收量，生命只扣穿透的部分', () => {
        services().initialize();
        const unit = createTestUnit('u1', Faction.Player, 0, 2, { hp: 100 });
        unit.shield = 40;
        const cap = capture(EVENT_NAMES.UnitDamaged);
        resolver().applyUnitDamage(unit, 60, Faction.Enemy, { attackerId: null, attackerLane: null, attackerDepth: null, allowDamageLink: false });
        cap.off();
        assert.equals(1, cap.list.length);
        assert.equals(40, cap.list[0].shieldAbsorbed);
        assert.equals(80, unit.currentHp);
    });

    suite.test('結算：無敵擋下改發傷害被擋事件，不扣血、不發受傷；自己人的效果不發', () => {
        services().initialize();
        const unit = createTestUnit('zhao', Faction.Player, 0, 0, { hp: 200 });
        services().buff.applyBuff('zhao', StatusEffect.Invincible, 1);
        const blocked = capture(EVENT_NAMES.UnitDamageBlocked);
        const damaged = capture(EVENT_NAMES.UnitDamaged);
        resolver().applyUnitDamage(unit, 50, Faction.Enemy, { attackerId: 'e1', attackerLane: 2, attackerDepth: 0, allowDamageLink: false });
        resolver().applyUnitDamage(unit, 50, Faction.Player, { attackerId: 'ally', attackerLane: 1, attackerDepth: 0, allowDamageLink: false });
        blocked.off(); damaged.off();
        assert.equals(200, unit.currentHp);
        assert.equals(0, damaged.list.length);
        assert.equals(1, blocked.list.length);
        assert.equals('invincible', blocked.list[0].reason);
        assert.equals('e1', blocked.list[0].attackerId);
    });

    suite.test('畫面：傷害被擋事件在目標頭上飄「無敵」', async () => {
        services().initialize();
        const floats: string[] = [];
        const ctx = createBattleSceneContext();
        ctx.unitRenderer = { playBuffConsumeValue: (_l: number, _d: number, text: string) => floats.push(text), waitForMovementIdle: () => Promise.resolve() } as any;
        ctx.ctrl = { state: { units: new Map([['zhao', { id: 'zhao', name: '趙雲', faction: Faction.Player, lane: 0, depth: 0, isDead: () => false }]]) } } as any;
        const scene = { isValid: true, scheduleOnce: (fn: () => void, sec: number) => { setTimeout(fn, sec * 1000); } };
        const bridge = new BattleUIBridge(ctx, scene as any);
        bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop, onReplay: noop });
        services().event.emit(EVENT_NAMES.UnitDamageBlocked, { unitId: 'zhao', attackerId: null, attackerFaction: Faction.Enemy, damage: 50, reason: 'invincible' });
        await settle();
        bridge.unsubscribeEvents();
        assert.equals(BLOCK_FLOAT_TEXT.invincible, floats.join(','));
    });

    return suite;
}
