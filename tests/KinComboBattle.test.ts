/**
 * KinComboBattle.test.ts — 史實合攻接進戰場判定（KIN-09 接線，PROG-2-1065）多回合流程測試
 *
 * 鎖住：有史實關係的相鄰友軍會在每一回合追加合攻傷害；沒有史實關係的相鄰友軍不觸發；
 * 助攻方不在目標相鄰格時不觸發。擲骰固定為 0（命中與合攻都會成功），比較的是有無追加傷害造成的 HP 差。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { HistoricalRelation } from '../assets/scripts/core/systems/KinRelation';
import { TestSuite, assert } from './TestRunner';

const SWORN: HistoricalRelation = {
    relationId: 'HIST_SWORN_TEST',
    templateA: 'liu-bei',
    templateB: 'guan-yu',
    type: 'SWORN',
    epBonus: 0,
    extraEffects: { comboAttackRateMod: 1.3 },
    loreKey: 'LORE_TEST',
};

function troop(id: string, faction: Faction, lane: number, depth: number, attackRange: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 60, defense: 10, moveRange: 0, attackRange });
    unit.moveTo(lane, depth);
    return unit;
}

/** 建立戰場：攻擊方 (2,2) 打目標 (2,3)；助攻方在 helperCell；回傳 HP 總減少量 */
function runTurns(turns: number, helperCell: [number, number] | null, relation: boolean): number {
    services().initialize();
    const state = new BattleState();
    const attacker = troop('attacker', Faction.Player, 2, 2, 1);
    const defender = troop('defender', Faction.Enemy, 2, 3, 0);
    state.addUnit(attacker);
    state.addUnit(defender);
    if (helperCell) {
        state.addUnit(troop('helper', Faction.Player, helperCell[0], helperCell[1], 1));
    }
    const resolver = new BattleCombatResolver({
        state,
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => undefined,
        setEnemyGeneralUnitId: () => undefined,
        relationsBetween: (a, b) => (relation && [a, b].sort().join('|') === ['attacker', 'helper'].sort().join('|') ? [SWORN] : []),
    });
    resolver.hitRandom = () => 0;
    const svc = services();
    const startHp = defender.currentHp;
    for (let turn = 0; turn < turns; turn += 1) {
        resolver.resolveCombat(attacker, defender, svc);
        if (defender.isDead()) break;
    }
    return startHp - defender.currentHp;
}

export function createKinComboBattleSuite(): TestSuite {
    const suite = new TestSuite('KinComboBattle (史實合攻戰場判定 PROG-2-1065)');

    suite.test('多回合：有史實關係的相鄰助攻方每回合追加合攻傷害', () => {
        const alone = runTurns(3, null, false);
        const withoutRelation = runTurns(3, [2, 4], false);
        const withRelation = runTurns(3, [2, 4], true);
        assert.isTrue(alone > 0);
        assert.equals(alone, withoutRelation);
        assert.isTrue(withRelation > withoutRelation);
    });

    suite.test('沒有史實關係的相鄰友軍不觸發合攻', () => {
        assert.equals(runTurns(3, null, false), runTurns(3, [2, 4], false));
    });

    suite.test('助攻方不在目標相鄰格時不觸發合攻', () => {
        assert.equals(runTurns(3, null, true), runTurns(3, [0, 0], true));
    });

    return suite;
}
