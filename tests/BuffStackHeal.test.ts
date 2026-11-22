/**
 * BuffStackHeal — 堆疊、治療、持續傷害（doc_spec_0359；PROG-2-2045）
 */
import { assert, TestSuite } from './TestRunner';
import { Faction, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
import { BuffSystem } from '../assets/scripts/core/systems/BuffSystem';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleSkillTargetMode, SkillSourceType } from '../shared/skill-runtime';
import { StatusStackBook, burnTickDamage, computeHealAmount, poisonTickDamage } from '../assets/scripts/battle/shared/BuffStackHeal';

export function createBuffStackHealSuite(): TestSuite {
    const suite = new TestSuite('BuffStackHeal (堆疊與治療 doc_spec_0359 PROG-2-2045)');

    suite.test('§5-1 連施 5 次封頂 3 層，回合取最大不相加', () => {
        const book = new StatusStackBook();
        [2, 4, 3, 1, 2].forEach((d) => book.apply('ATK_UP', d));
        const s = book.get('ATK_UP')!;
        assert.equals(3, s.stacks);
        assert.equals(4, s.remainingTurns);
        for (let i = 0; i < 4; i++) book.tick();
        assert.equals(null, book.get('ATK_UP'));
    });

    suite.test('§5-2／§5-3 已損 25% 回補且不溢出', () => {
        assert.equals(200 + 250, computeHealAmount({ baseHeal: 200, currentHp: 1000, maxHp: 2000 }));
        assert.equals(0, computeHealAmount({ baseHeal: 200, currentHp: 2000, maxHp: 2000 }));
        assert.equals(100, computeHealAmount({ baseHeal: 400, currentHp: 1900, maxHp: 2000 }));
    });

    suite.test('§3 燃燒與中毒', () => {
        assert.equals(80, burnTickDamage(1000, false));
        assert.equals(160, burnTickDamage(1000, true));
        const p = poisonTickDamage(2000);
        assert.equals(100, p.damage);
        assert.equals(1, p.movePenalty);
    });

    // ---- 接線測試（PROG-2-9720）：實際走 BuffSystem／戰法結算／毒箭回合 ----
    suite.test('接線：BuffSystem 同名狀態連施 5 次只疊到 3 層，回合取 max 不相加', () => {
        const buff = new BuffSystem();
        [2, 4, 3, 1, 2].forEach((d) => buff.applyBuff('u1', StatusEffect.Haste, d));
        assert.equals(3, buff.getStacks('u1', StatusEffect.Haste));
        assert.equals(1, buff.getBuffs('u1').length);
        assert.equals(4, buff.getBuffs('u1')[0].remainingTurns);
        assert.equals(0, buff.getStacks('u1', StatusEffect.Slow));
        for (let i = 0; i < 4; i++) buff.tickBuff();
        assert.isFalse(buff.hasBuff('u1', StatusEffect.Haste));
    });

    const quiet = (): BattleController => {
        services().initialize();
        services().session.setRandomSource(() => 0);
        const ctrl = new BattleController();
        const mk = (id: string, f: Faction, skill: string) => new GeneralUnit({
            id, name: id, faction: f, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90, cha: 90,
            skillId: skill, battlePrimarySkillId: skill,
        } as ConstructorParameters<typeof GeneralUnit>[0]);
        const player = mk('p', Faction.Player, 'liu-bei-rally');
        const foe = mk('e', Faction.Enemy, 'cao-cao-tactics');
        ctrl.initBattle(player, foe);
        player.currentSp = player.maxSp;
        foe.currentSp = 0;
        (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
        return ctrl;
    };

    suite.test('接線：治療戰法 = 固定量 + 已損 HP×25%，且不超過上限', () => {
        const ctrl = quiet();
        const hurt = new TroopUnit('hurt', TroopType.Infantry, Faction.Player, { hp: 1000, attack: 10, defense: 10, moveRange: 0 });
        const full = new TroopUnit('full', TroopType.Infantry, Faction.Player, { hp: 1000, attack: 10, defense: 10, moveRange: 0 });
        const nearFull = new TroopUnit('near', TroopType.Infantry, Faction.Player, { hp: 1000, attack: 10, defense: 10, moveRange: 0 });
        hurt.moveTo(1, 1); full.moveTo(2, 1); nearFull.moveTo(3, 1);
        [hurt, full, nearFull].forEach((u) => ctrl.state.addUnit(u));
        hurt.currentHp = 400; nearFull.currentHp = 990;
        const ok = ctrl.triggerPlayerBattleSkill('liu-bei-rally', SkillSourceType.Ultimate, { targetMode: BattleSkillTargetMode.AllyAll });
        assert.isTrue(ok);
        // 固定量 = max(30, floor(主將最大 HP 1000 × 0.18)) = 180；已損 600×0.25 = 150
        assert.equals(400 + 180 + 150, hurt.currentHp);
        assert.equals(1000, full.currentHp);
        assert.equals(1000, nearFull.currentHp, '只差 10 點就只補 10，不溢出');
    });

    suite.test('接線：中毒單位本回合移動力 -1', () => {
        const ctrl = quiet();
        const a = new TroopUnit('a', TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 10, defense: 10, moveRange: 2 });
        const b = new TroopUnit('b', TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 10, defense: 10, moveRange: 2 });
        a.moveTo(0, 6); b.moveTo(4, 6);
        ctrl.state.addUnit(a); ctrl.state.addUnit(b);
        ctrl.state.unitDots.set('a', { unitId: 'a', ratio: 0.05, remainingTurns: 5 });
        ctrl.advanceTurn();
        ctrl.finalizeAdvanceTurn();
        const movedA = Math.abs(a.depth - 6);
        const movedB = Math.abs(b.depth - 6);
        assert.equals(movedB - 1, movedA, '中毒者少走 1 格');
    });

    return suite;
}
