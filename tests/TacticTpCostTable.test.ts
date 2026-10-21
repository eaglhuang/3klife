/**
 * TacticTpCostTable — 戰法 TP 消耗表（PROG-2-0924，WBS NUM-10）
 *
 * 數值來源：數值系統.md E-9。逐招對照 28 筆；綠色因子學習時 TP 成本 ×0.5（learnTpCost）。
 */
import { getTacticTpCost, TACTIC_TP_COST_OVERRIDE } from '../assets/scripts/core/systems/SortieDeploy';
import { learnTpCost } from '../assets/scripts/core/systems/FactorTacticLinkage';
import { TestSuite, assert } from './TestRunner';

/** E-9 規格表（戰法 ID → TP） */
const SPEC_TP: Readonly<Record<string, number>> = {
    TAC_CAVALRY_CHARGE: 30, TAC_COMBO_ATTACK: 20,
    TAC_LONE_RIDER: 50, TAC_SWORN_FURY: 45,
    TAC_LANCE_THRUST: 20, TAC_HEAL: 25,
    TAC_IRON_WALL_CHARGE: 40, TAC_INSPIRE: 30,
    TAC_BACKSTAB: 25, TAC_HASTE: 15,
    TAC_AMBUSH: 40, TAC_SHIELD: 35,
    TAC_NIGHT_RAID: 35, TAC_EIGHT_ARRAY: 80,
    TAC_SEVEN_IN_OUT: 60, TAC_WEI_MIGHT: 70,
    TAC_DISCORD: 45, TAC_DRAGON_GALL: 60,
    TAC_TAUNT: 15, TAC_FIRE_ATTACK: 35,
    TAC_SLOW: 20, TAC_RED_CLIFF: 90,
    TAC_EMPTY_FORT: 55, TAC_FIRE_ARROW: 25,
    TAC_CHAIN_LINK: 70, TAC_ARROW_RAIN: 50,
    TAC_WATER_ATTACK: 65, TAC_FOREST_AMBUSH: 30,
};

export function createTacticTpCostTableSuite(): TestSuite {
    const suite = new TestSuite('TacticTpCostTable (戰法 TP 消耗表 NUM-10)');

    suite.test('E-9 規格表共 28 招，覆寫表鍵數一致', () => {
        assert.equals(28, Object.keys(SPEC_TP).length);
        assert.equals(28, Object.keys(TACTIC_TP_COST_OVERRIDE).length);
    });

    suite.test('每招 getTacticTpCost 與 E-9 規格一致', () => {
        for (const [tacticId, tp] of Object.entries(SPEC_TP)) {
            assert.equals(tp, getTacticTpCost(tacticId), `${tacticId} 應為 ${tp} TP`);
        }
    });

    suite.test('未列入表的戰法仍用預設值，沒有 tacticId 也用預設值', () => {
        assert.equals(30, getTacticTpCost('TAC_UNKNOWN_FOR_TEST'));
        assert.equals(30, getTacticTpCost(null));
    });

    suite.test('綠色因子：學習 TP 成本 ×0.5（無條件進位）', () => {
        assert.equals(15, learnTpCost(getTacticTpCost('TAC_CAVALRY_CHARGE'), true));
        assert.equals(30, learnTpCost(getTacticTpCost('TAC_CAVALRY_CHARGE'), false));
        assert.equals(45, learnTpCost(getTacticTpCost('TAC_RED_CLIFF'), true));
    });

    return suite;
}
