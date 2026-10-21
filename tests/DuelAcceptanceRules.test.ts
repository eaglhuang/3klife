/**
 * DuelAcceptanceRules — 單挑接受判定與拒絕懲罰（WBS NUM-02，PROG-2-0922）
 *
 * 規格：score = 0.45 × 主將血量優勢 + 0.35 × 兵力優勢 + 0.2 × 戰力優勢，score ≥ 0.58 接受；
 * 拒絕則防守方全軍攻擊與最大 HP 減半、HP 減半。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    unit.moveTo(lane, depth);
    return unit;
}

/** 兩邊主將與若干隊伍的戰場；challengerHpRate / defenderHpRate 以血量比例設定主將狀態 */
function duelBattle(challengerTroops: number, defenderTroops: number, challengerHpRate: number, defenderHpRate: number): BattleController {
    services().initialize();
    // 0.99 = 閃躲／暴擊骰都不中；若用 0，每次閃躲都成功，單挑永遠打不出傷害而無限迴圈
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    const challenger = general('challenger', Faction.Player);
    const defender = general('defender', Faction.Enemy);
    ctrl.initBattle(challenger, defender);
    challenger.currentHp = Math.floor(challenger.maxHp * challengerHpRate);
    defender.currentHp = Math.floor(defender.maxHp * defenderHpRate);
    for (let i = 0; i < challengerTroops; i += 1) ctrl.state.addUnit(troop(`p-${i}`, Faction.Player, 2, 1 + i));
    for (let i = 0; i < defenderTroops; i += 1) ctrl.state.addUnit(troop(`e-${i}`, Faction.Enemy, 2, 6 - i));
    return ctrl;
}

export function createDuelAcceptanceRulesSuite(): TestSuite {
    const suite = new TestSuite('DuelAcceptanceRules (單挑接受與拒絕懲罰 NUM-02)');

    suite.test('接受判定：挑戰方血量低、兵力少，防守方明顯占優 → score ≥ 0.58 接受', () => {
        const ctrl = duelBattle(0, 3, 0.1, 1);
        const result = ctrl['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        assert.isTrue(result.score >= 0.58, `score=${result.score}`);
        assert.isTrue(result.accepted);
        assert.equals(Faction.Enemy, result.defenderFaction);
    });

    suite.test('接受判定：雙方接近勢均力敵 → score < 0.58 拒絕', () => {
        const ctrl = duelBattle(3, 3, 1, 1);
        const result = ctrl['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        assert.isTrue(result.score < 0.58, `score=${result.score}`);
        assert.isFalse(result.accepted);
    });

    suite.test('拒絕懲罰：防守方全軍攻擊與最大 HP 減半、主將 HP 減半', () => {
        const ctrl = duelBattle(3, 2, 1, 1);
        const enemyTroop = [...ctrl.state.units.values()].find(unit => unit.faction === Faction.Enemy)!;
        const attackBefore = enemyTroop.getEffectiveAttack();
        const maxHpBefore = enemyTroop.getEffectiveMaxHp();
        const generalHpBefore = ctrl.state.enemyGeneral!.currentHp;
        const playerTroop = [...ctrl.state.units.values()].find(unit => unit.faction === Faction.Player)!;
        const playerAttackBefore = playerTroop.getEffectiveAttack();

        ctrl.resolveDuelChallenge(Faction.Player, false);

        assert.equals(attackBefore - Math.floor(attackBefore / 2), enemyTroop.getEffectiveAttack(), '攻擊減半');
        assert.equals(maxHpBefore - Math.floor(maxHpBefore / 2), enemyTroop.getEffectiveMaxHp(), '最大 HP 減半');
        assert.equals(Math.floor(generalHpBefore / 2), ctrl.state.enemyGeneral!.currentHp, '主將 HP 減半');
        assert.equals(playerAttackBefore, playerTroop.getEffectiveAttack(), '挑戰方不受懲罰');
    });

    suite.test('接受後不套用懲罰：防守方攻擊與最大 HP 維持原值', () => {
        const ctrl = duelBattle(0, 3, 0.1, 1);
        const enemyTroop = [...ctrl.state.units.values()].find(unit => unit.faction === Faction.Enemy)!;
        const attackBefore = enemyTroop.getEffectiveAttack();
        const maxHpBefore = enemyTroop.getEffectiveMaxHp();

        ctrl.resolveDuelChallenge(Faction.Player, true);

        assert.equals(attackBefore, enemyTroop.getEffectiveAttack());
        assert.equals(maxHpBefore, enemyTroop.getEffectiveMaxHp());
    });

    return suite;
}
