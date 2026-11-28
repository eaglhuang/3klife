/**
 * KinBattleEffects.test.ts — 結義戰場效果（PROG-2-10204）
 * 義兄弟同陣士氣 +20、生死相隨援護（50% 介入、分攤 30%）、動態義兄弟合攻。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { MORALE_DURATION_TURNS } from '../assets/scripts/battle/shared/Morale';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { HistoricalPairTable, combatRelationsBetween } from '../assets/scripts/core/systems/HistoricalPairs';
import { comboChanceOfPair } from '../assets/scripts/core/systems/ComboAttackKin';
import { kinRescueSplit, type KinPairLike } from '../assets/scripts/core/systems/KinBattleEffects';
import type { TallyBattleInfo } from '../assets/scripts/core/systems/TigerTallyStar';
import { TestSuite, assert } from './TestRunner';

const HISTORIC = HistoricalPairTable.load({
    relations: [{ relationId: 'T_SWORN', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', epBonus: 15, extraEffects: { comboAttackRateMod: 1.3 }, loreKey: 'L' }],
}).table;
const OATH: KinPairLike[] = [{ uidA: 'merc-a', uidB: 'zhao-yun', type: 'DYNAMIC_SWORN' }];
const COMRADE: KinPairLike[] = [{ uidA: 'zhao-yun', uidB: 'ma-chao', type: 'COMRADE' }];

function hero(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60, luk: 0,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [], ultimateSlots: [],
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number, tallyId: string | null, hp = 100): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp, attack: 1, defense: 1, moveRange: 0, attackRange: 0 });
    u.moveTo(lane, depth);
    u.tallyId = tallyId;
    return u;
}

function openBattle(dynamic: KinPairLike[]): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(hero('liu-bei', Faction.Player), hero('e', Faction.Enemy));
    ctrl.historicalPairs = HISTORIC;
    ctrl.dynamicRelations = dynamic;
    // 虎符 id 直接當來源武將 id
    ctrl.tallyInfoOf = (tallyId) => ({ sourceTemplateId: tallyId, star: 1, templateId: tallyId } as unknown as TallyBattleInfo);
    return ctrl;
}

function resolverOf(ctrl: BattleController): BattleCombatResolver {
    return (ctrl as unknown as { combatResolver: BattleCombatResolver }).combatResolver;
}

function damage(ctrl: BattleController, target: TroopUnit, amount: number): void {
    resolverOf(ctrl).applyUnitDamage(target, amount, Faction.Enemy, { attackerId: 'foe', attackerLane: 0, attackerDepth: 5, allowDamageLink: true });
}

function twoKin(dynamic: KinPairLike[], hpB = 100): { ctrl: BattleController; a: TroopUnit; b: TroopUnit } {
    const ctrl = openBattle(dynamic);
    const a = troop('ua', Faction.Player, 1, 2, 'zhao-yun');
    const b = troop('ub', Faction.Player, 1, 3, 'ma-chao', hpB);
    ctrl.state.addUnit(a);
    ctrl.state.addUnit(b);
    return { ctrl, a, b };
}

export function createKinBattleEffectsSuite(): TestSuite {
    const suite = new TestSuite('KinBattleEffects (結義戰場效果 PROG-2-10204)');

    // ── 義兄弟同陣士氣 ──
    suite.test('動態義兄弟同在出戰名單：部署時士氣 +20 並計時', () => {
        const ctrl = openBattle(OATH);
        ctrl.sortieLineupIds = ['liu-bei', 'merc-a', 'zhao-yun'];
        const out = ctrl.tryDeployTroop(TroopType.Infantry, 0, undefined, { tally: { cardUid: 'merc-a', templateId: 'x' } });
        assert.isTrue(out.ok);
        assert.equals(20, out.unit!.morale);
        assert.equals(MORALE_DURATION_TURNS, out.unit!.moraleTurns);
    });

    suite.test('史實義兄弟（劉備／關羽）同陣也加成；來源武將對不上義兄弟不加', () => {
        const ctrl = openBattle([]);
        ctrl.sortieLineupIds = ['liu-bei'];
        const yes = ctrl.tryDeployTroop(TroopType.Infantry, 0, undefined, { tally: { cardUid: 'guan-yu', templateId: 'x' } });
        assert.equals(20, yes.unit!.morale);
        const no = ctrl.tryDeployTroop(TroopType.Infantry, 1, undefined, { tally: { cardUid: 'zhang-fei', templateId: 'x' } });
        assert.equals(0, no.unit!.morale, '張飛與名單內無義兄弟關係');
        assert.equals(0, no.unit!.moraleTurns);
    });

    suite.test('義兄弟不在出戰名單（非同陣）不加；無虎符部隊不加', () => {
        const ctrl = openBattle(OATH);
        ctrl.sortieLineupIds = ['liu-bei'];
        const away = ctrl.tryDeployTroop(TroopType.Infantry, 0, undefined, { tally: { cardUid: 'merc-a', templateId: 'x' } });
        assert.equals(0, away.unit!.morale, 'zhao-yun 不在名單');
        const plain = ctrl.tryDeployTroop(TroopType.Infantry, 1);
        assert.equals(0, plain.unit!.morale);
    });

    suite.test('不疊加：名單有兩位義兄弟仍只 +20', () => {
        const ctrl = openBattle([...OATH, { uidA: 'merc-a', uidB: 'liu-bei', type: 'DYNAMIC_SWORN' }]);
        ctrl.sortieLineupIds = ['liu-bei', 'zhao-yun'];
        const out = ctrl.tryDeployTroop(TroopType.Infantry, 0, undefined, { tally: { cardUid: 'merc-a', templateId: 'x' } });
        assert.equals(20, out.unit!.morale, '兩位義兄弟也只 +20');
    });

    // ── 生死相隨 ──
    suite.test('分攤公式：援護者 30%、被救者 70%', () => {
        assert.equals(30, kinRescueSplit(100).helperDamage);
        assert.equals(70, kinRescueSplit(100).rescuedDamage);
        assert.equals(0, kinRescueSplit(1).helperDamage);
    });

    suite.test('戰友相鄰、致命傷害、擲骰命中（0）：援護者承 30%、被救者承 70%，發 KinRescue 事件', () => {
        const { ctrl, a, b } = twoKin(COMRADE);
        resolverOf(ctrl).hitRandom = () => 0;
        const events: Array<{ rescuedId: string; helperId: string; sharedDamage: number }> = [];
        services().event.on(EVENT_NAMES.KinRescue, (p: { rescuedId: string; helperId: string; sharedDamage: number }) => { events.push(p); });
        damage(ctrl, a, 100); // 兵力 100，傷害 100 致命
        assert.equals(30, a.currentHp, '被救者承 70，剩 30');
        assert.equals(70, b.currentHp, '援護者承 30，剩 70');
        assert.equals(1, events.length);
        assert.equals('ua', events[0].rescuedId);
        assert.equals('ub', events[0].helperId);
        assert.equals(30, events[0].sharedDamage);
    });

    suite.test('擲骰落空（0.99）：不援護，被救者承受全額', () => {
        const { ctrl, a, b } = twoKin(COMRADE);
        resolverOf(ctrl).hitRandom = () => 0.99;
        damage(ctrl, a, 100);
        assert.isTrue(a.isDead());
        assert.equals(100, b.currentHp);
    });

    suite.test('非致命傷害不援護（連骰都不擲）', () => {
        const { ctrl, a, b } = twoKin(COMRADE);
        let rolls = 0;
        resolverOf(ctrl).hitRandom = () => { rolls += 1; return 0; };
        damage(ctrl, a, 99);
        assert.equals(1, a.currentHp);
        assert.equals(100, b.currentHp);
        assert.equals(0, rolls);
    });

    suite.test('義兄弟（動態、史實）相鄰皆可援護；沒有關係不援護', () => {
        const dyn = twoKin([{ uidA: 'zhao-yun', uidB: 'ma-chao', type: 'DYNAMIC_SWORN' }]);
        resolverOf(dyn.ctrl).hitRandom = () => 0;
        damage(dyn.ctrl, dyn.a, 100);
        assert.equals(70, dyn.b.currentHp, '動態義兄弟援護');

        const ctrl = openBattle([]);
        const a = troop('ua', Faction.Player, 1, 2, 'liu-bei');
        const b = troop('ub', Faction.Player, 1, 3, 'guan-yu');
        ctrl.state.addUnit(a);
        ctrl.state.addUnit(b);
        resolverOf(ctrl).hitRandom = () => 0;
        damage(ctrl, a, 100);
        assert.equals(70, b.currentHp, '史實義兄弟援護');

        const none = twoKin([]);
        resolverOf(none.ctrl).hitRandom = () => 0;
        damage(none.ctrl, none.a, 100);
        assert.equals(100, none.b.currentHp, '無關係不援護');
    });

    suite.test('不相鄰（隔一格）不援護', () => {
        const ctrl = openBattle(COMRADE);
        const a = troop('ua', Faction.Player, 1, 2, 'zhao-yun');
        const far = troop('ub', Faction.Player, 1, 4, 'ma-chao');
        ctrl.state.addUnit(a);
        ctrl.state.addUnit(far);
        resolverOf(ctrl).hitRandom = () => 0;
        damage(ctrl, a, 100);
        assert.equals(100, far.currentHp);
    });

    suite.test('不遞迴：援護者承受的 30% 即使致命，也不再被第三人援護；援護者自己會死照算', () => {
        const ctrl = openBattle([...COMRADE, { uidA: 'ma-chao', uidB: 'guan-yu', type: 'COMRADE' }]);
        const a = troop('ua', Faction.Player, 1, 2, 'zhao-yun');
        const b = troop('ub', Faction.Player, 1, 3, 'ma-chao', 10); // 只剩 10，分攤 30 會死
        const c = troop('uc', Faction.Player, 1, 4, 'guan-yu');
        ctrl.state.addUnit(a);
        ctrl.state.addUnit(b);
        ctrl.state.addUnit(c);
        resolverOf(ctrl).hitRandom = () => 0;
        damage(ctrl, a, 100);
        assert.equals(30, a.currentHp);
        assert.isTrue(b.isDead(), '援護者自己死亡');
        assert.isFalse(ctrl.state.units.has('ub'), '援護者已移出戰場');
        assert.equals(100, c.currentHp, '第三人不連鎖援護');
    });

    suite.test('敵軍部隊不觸發；無虎符部隊不觸發', () => {
        const ctrl = openBattle(COMRADE);
        const e1 = troop('e1', Faction.Enemy, 1, 2, 'zhao-yun');
        const e2 = troop('e2', Faction.Enemy, 1, 3, 'ma-chao');
        ctrl.state.addUnit(e1);
        ctrl.state.addUnit(e2);
        resolverOf(ctrl).hitRandom = () => 0;
        resolverOf(ctrl).applyUnitDamage(e1, 100, Faction.Player, { attackerId: 'x', attackerLane: 0, attackerDepth: 0, allowDamageLink: true });
        assert.equals(100, e2.currentHp, '敵軍相鄰不吃我方關係表（敵軍無虎符）');

        const ctrl2 = openBattle(COMRADE);
        const p = troop('p', Faction.Player, 2, 2, null);
        const q = troop('q', Faction.Player, 2, 3, null);
        ctrl2.state.addUnit(p);
        ctrl2.state.addUnit(q);
        resolverOf(ctrl2).hitRandom = () => 0;
        damage(ctrl2, p, 100);
        assert.equals(100, q.currentHp);
    });

    suite.test('每次致命傷害最多一人援護：左右各一位戰友只有一人分攤', () => {
        const ctrl = openBattle([...COMRADE, { uidA: 'zhao-yun', uidB: 'guan-yu', type: 'COMRADE' }]);
        const a = troop('ua', Faction.Player, 1, 2, 'zhao-yun');
        const b = troop('ub', Faction.Player, 1, 3, 'ma-chao');
        const c = troop('uc', Faction.Player, 1, 1, 'guan-yu');
        ctrl.state.addUnit(a);
        ctrl.state.addUnit(b);
        ctrl.state.addUnit(c);
        resolverOf(ctrl).hitRandom = () => 0;
        damage(ctrl, a, 100);
        assert.equals(70, b.currentHp);
        assert.equals(100, c.currentHp);
    });

    // ── 合攻關係來源 ──
    suite.test('combatRelationsBetween：動態義兄弟視同義兄弟（合攻 20%x1.3=26%）；戰友不給合攻；與史實並存取 Max', () => {
        const dyn = combatRelationsBetween(null, 'merc-a', 'zhao-yun', OATH);
        assert.equals(1, dyn.length);
        assert.equals(0.26, Math.round(comboChanceOfPair(dyn) * 100) / 100);
        assert.equals(0, combatRelationsBetween(null, 'zhao-yun', 'ma-chao', COMRADE).length, '戰友不觸發合攻');
        assert.equals(0, comboChanceOfPair(combatRelationsBetween(HISTORIC, 'a', 'b', [])), '無關係為 0');
        const both = combatRelationsBetween(HISTORIC, 'liu-bei', 'guan-yu', [{ uidA: 'liu-bei', uidB: 'guan-yu', type: 'DYNAMIC_SWORN' }]);
        assert.equals(2, both.length);
        assert.equals(0.26, Math.round(comboChanceOfPair(both) * 100) / 100, '多重關係 Max 不累乘');
        assert.equals(1, combatRelationsBetween(HISTORIC, 'liu-bei', 'guan-yu').length, '舊簽名行為不變');
    });

    suite.test('BattleController.relationsBetweenUnits 認動態義兄弟', () => {
        const ctrl = openBattle(OATH);
        ctrl.state.addUnit(troop('ua', Faction.Player, 1, 2, 'merc-a'));
        ctrl.state.addUnit(troop('ub', Faction.Player, 2, 2, 'zhao-yun'));
        assert.equals(1, ctrl.relationsBetweenUnits('ua', 'ub').length);
        ctrl.dynamicRelations = [];
        assert.equals(0, ctrl.relationsBetweenUnits('ua', 'ub').length);
    });

    return suite;
}
