/**
 * KinStackingCap.test.ts — 羈絆戰場效果的疊加上限與防爆炸四條硬規則（doc_spec_1358 §2.3、§5.2）
 *  1. 一條軸一個來源  2. 同名取大、不累加  3. 一次事件一個羈絆動作  4. 關係等級取最高
 * 另含整合測試：同一場戰鬥同時有光環＋合攻＋援護，各軸互不相加。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { KIN_BATTLE_CONFIG } from '../assets/scripts/core/systems/KinBattleConfig';
import { kinRescueSplit, type KinPairLike } from '../assets/scripts/core/systems/KinBattleEffects';
import { COMRADE_PAIR, SPOUSE_PAIR, SWORN_PAIR, kinResolverOf, kinTroop, openKinBattle } from './KinTestFixtures';
import { TestSuite, assert } from './TestRunner';

interface ComboPayload { attackerId: string; helperId: string; targetId: string }

/** 攻擊方 a (2,2) 打敵方 (2,3)；helpers 為 [id, lane, depth]；擲骰固定為 roll；回傳合攻事件與目標損血 */
function fight(dynamic: KinPairLike[], helpers: Array<[string, number, number]>, roll: number): { events: ComboPayload[]; ctrl: BattleController; units: Map<string, TroopUnit>; lost: number } {
    const ctrl = openKinBattle(dynamic);
    const units = new Map<string, TroopUnit>();
    const attacker = kinTroop('ua', Faction.Player, 2, 2, 'a');
    const target = kinTroop('tgt', Faction.Enemy, 2, 3, null, 100000);
    units.set('ua', attacker);
    ctrl.state.addUnit(attacker);
    ctrl.state.addUnit(target);
    for (const [id, lane, depth] of helpers) {
        const u = kinTroop(`u${id}`, Faction.Player, lane, depth, id);
        units.set(u.id, u);
        ctrl.state.addUnit(u);
    }
    const resolver = kinResolverOf(ctrl);
    resolver.hitRandom = () => roll;
    const events: ComboPayload[] = [];
    const unsub = services().event.on(EVENT_NAMES.KinComboAttack, (payload?: ComboPayload) => {
        if (payload) events.push(payload);
    });
    resolver.resolveCombat(attacker, target, services());
    unsub();
    return { events, ctrl, units, lost: target.maxHp - target.currentHp };
}

function fatal(ctrl: BattleController, victim: TroopUnit, amount: number): void {
    kinResolverOf(ctrl).applyUnitDamage(victim, amount, Faction.Enemy, { attackerId: 'foe', attackerLane: 0, attackerDepth: 7, allowDamageLink: true });
}

export function createKinStackingCapSuite(): TestSuite {
    const suite = new TestSuite('KinStackingCap (羈絆疊加上限與防爆炸 doc_spec_1358 §2.3)');

    // ── 規則 2：同名取大、不累加 ──
    suite.test('士氣：三位義兄弟同在出戰名單，部隊士氣仍只有 +20', () => {
        const ctrl = openKinBattle([SWORN_PAIR('a', 'b'), SWORN_PAIR('a', 'c'), SWORN_PAIR('a', 'd')]);
        ctrl.sortieLineupIds = ['a', 'b', 'c', 'd'];
        const out = ctrl.tryDeployTroop(TroopType.Infantry, 0, undefined, { tally: { cardUid: 'a', templateId: 'x' } });
        assert.isTrue(out.ok);
        assert.equals(KIN_BATTLE_CONFIG.sworn.deployMorale, out.unit!.morale);
    });

    suite.test('合攻：兩位義兄弟都在目標九宮格內，一次攻擊只觸發一次（單次攻擊最多一位合攻者）', () => {
        const { events } = fight([SWORN_PAIR('a', 'b'), SWORN_PAIR('a', 'c')], [['b', 1, 4], ['c', 3, 4]], 0.1);
        assert.equals(1, events.length);
    });

    suite.test('合攻倍率取最大不累乘：義兄弟 26%、戰友 20%；同在九宮格時以義兄弟的 26% 擲', () => {
        const mixed = [SWORN_PAIR('a', 'b'), COMRADE_PAIR('a', 'c')];
        const helpers: Array<[string, number, number]> = [['c', 1, 3], ['b', 3, 4]];
        assert.equals(1, fight(mixed, helpers, 0.25).events.length, '0.25 < 26% 觸發');
        assert.equals('ub', fight(mixed, helpers, 0.25).events[0].helperId, '等級高者（義兄弟）優先，即使戰友先被掃到');
        assert.equals(0, fight(mixed, helpers, 0.26).events.length, '0.26 不低於 26% 不觸發（沒有累乘成 33%）');
        assert.equals(1, fight([COMRADE_PAIR('a', 'c')], [['c', 1, 3]], 0.19).events.length, '戰友 20%：0.19 觸發');
        assert.equals(0, fight([COMRADE_PAIR('a', 'c')], [['c', 1, 3]], 0.2).events.length, '戰友 20%：0.20 不觸發');
    });

    // ── 規則 4：等級取最高 ──
    suite.test('既是夫妻又是戰友：只算最高一種（夫妻合攻 0，不因戰友多拿 20%）', () => {
        const both = [SPOUSE_PAIR('a', 'c'), COMRADE_PAIR('a', 'c')];
        // 戰友等級較低，同一對取夫妻（rank 2 > 1）→ 合攻資格只看 SWORN／COMRADE：夫妻不在其內
        assert.equals(0, fight(both, [['c', 1, 3]], 0).events.length);
    });

    suite.test('夫妻與其他關係合攻一律 0', () => {
        assert.equals(0, fight([SPOUSE_PAIR('a', 'c')], [['c', 1, 3]], 0).events.length);
        assert.equals(0, fight([{ uidA: 'a', uidB: 'c', type: 'PARENT_CHILD' }], [['c', 1, 3]], 0).events.length);
    });

    // ── 規則 3：一次事件一個羈絆動作 ──
    suite.test('一次致命傷害只援護一次：九宮格內三位符合者，只有等級最高（義兄弟）者分攤 30%', () => {
        const ctrl = openKinBattle([COMRADE_PAIR('a', 'c'), SPOUSE_PAIR('a', 'd'), SWORN_PAIR('a', 'b')]);
        const victim = kinTroop('ua', Faction.Player, 2, 2, 'a', 100);
        const comrade = kinTroop('uc', Faction.Player, 1, 1, 'c', 100);
        const spouse = kinTroop('ud', Faction.Player, 1, 2, 'd', 100);
        const sworn = kinTroop('ub', Faction.Player, 3, 3, 'b', 100);
        for (const u of [victim, comrade, spouse, sworn]) ctrl.state.addUnit(u);
        kinResolverOf(ctrl).hitRandom = () => 0;
        fatal(ctrl, victim, 100);
        const share = kinRescueSplit(100).helperDamage;
        assert.equals(100 - share, sworn.currentHp, '義兄弟承擔 30%');
        assert.equals(100, spouse.currentHp);
        assert.equals(100, comrade.currentHp);
        assert.equals(100 - (100 - share), victim.currentHp, '被救者承受其餘 70%，剩 30');
    });

    suite.test('夫妻有援護（Q7）；援護者即使被打到致命也不再被第三人援護', () => {
        const ctrl = openKinBattle([SPOUSE_PAIR('a', 'd'), COMRADE_PAIR('d', 'c')]);
        const victim = kinTroop('ua', Faction.Player, 2, 2, 'a', 100);
        const spouse = kinTroop('ud', Faction.Player, 2, 3, 'd', 20);
        const third = kinTroop('uc', Faction.Player, 3, 4, 'c', 100);
        for (const u of [victim, spouse, third]) ctrl.state.addUnit(u);
        kinResolverOf(ctrl).hitRandom = () => 0;
        fatal(ctrl, victim, 100);
        assert.isTrue(spouse.currentHp < 20, '夫妻援護者吃了 30 傷害');
        assert.equals(100, third.currentHp, '援護傷害不連鎖');
    });

    suite.test('夫妻沒有同陣士氣（只有義兄弟有）', () => {
        const ctrl = openKinBattle([SPOUSE_PAIR('a', 'd')]);
        ctrl.sortieLineupIds = ['a', 'd'];
        const out = ctrl.tryDeployTroop(TroopType.Infantry, 0, undefined, { tally: { cardUid: 'a', templateId: 'x' } });
        assert.equals(0, out.unit!.morale);
    });

    // ── 斷義 ──
    suite.test('割袍斷義後（關係移除）：光環、合攻、援護、士氣四個效果同時消失', () => {
        const ctrl = openKinBattle([SWORN_PAIR('a', 'b')]);
        ctrl.sortieLineupIds = ['a', 'b'];
        const ua = kinTroop('ua', Faction.Player, 2, 2, 'a', 100);
        const ub = kinTroop('ub', Faction.Player, 2, 3, 'b', 100);
        ctrl.state.addUnit(ua);
        ctrl.state.addUnit(ub);
        ctrl.refreshKinAura();
        assert.isTrue(ua.kinAura && ub.kinAura, '斷義前有光環');
        ctrl.dynamicRelations = [];
        ctrl.refreshKinAura();
        assert.isTrue(!ua.kinAura && !ub.kinAura, '斷義後光環消失');
        kinResolverOf(ctrl).hitRandom = () => 0;
        fatal(ctrl, ua, 100);
        assert.equals(100, ub.currentHp, '斷義後不援護');
        const out = ctrl.tryDeployTroop(TroopType.Infantry, 1, undefined, { tally: { cardUid: 'a', templateId: 'x' } });
        assert.equals(0, out.unit!.morale, '斷義後沒有同陣士氣');
        assert.equals(0, fight([], [['b', 1, 3]], 0).events.length, '斷義後不合攻');
    });

    // ── 整合 ──
    suite.test('整合：同一場戰鬥光環＋合攻＋援護並存，各軸互不相加', () => {
        const ctrl = openKinBattle([SWORN_PAIR('a', 'b')]);
        const ua = kinTroop('ua', Faction.Player, 2, 2, 'a', 1000);
        const ub = kinTroop('ub', Faction.Player, 3, 3, 'b', 1000);
        const target = kinTroop('tgt', Faction.Enemy, 2, 3, null, 100000);
        for (const u of [ua, ub, target]) ctrl.state.addUnit(u);
        ctrl.refreshKinAura();
        const aura = 1 + KIN_BATTLE_CONFIG.aura.attackDefenseRatio;
        assert.isTrue(ua.kinAura && ub.kinAura, '光環軸：兩位義兄弟互相提供');
        assert.equals(Math.round(60 * aura * 1000), Math.round(ua.getEffectiveAttack() * 1000), '攻擊只乘一次 1.25');
        assert.equals(Math.round(10 * aura * 1000), Math.round(ua.getEffectiveDefense() * 1000), '防禦只乘一次 1.25');

        const resolver = kinResolverOf(ctrl);
        resolver.hitRandom = () => 0.25;
        const events: ComboPayload[] = [];
        const unsub = services().event.on(EVENT_NAMES.KinComboAttack, (payload?: ComboPayload) => {
            if (payload) events.push(payload);
        });
        resolver.resolveCombat(ua, target, services());
        unsub();
        assert.equals(1, events.length, '合攻軸：觸發一次（26%）');
        assert.equals('ub', events[0].helperId);

        // 援護軸：同一場戰鬥中致命傷害 → 30% 分攤，不再被光環或合攻重複計算
        const hpBefore = ub.currentHp;
        resolver.hitRandom = () => 0;
        ua.currentHp = 100;
        fatal(ctrl, ua, 100);
        assert.equals(hpBefore - kinRescueSplit(100).helperDamage, ub.currentHp, '援護軸：義兄弟承擔 30% 一次');
    });

    return suite;
}
