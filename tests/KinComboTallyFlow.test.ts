/**
 * KinComboTallyFlow.test.ts — 來源武將戰死後，虎符仍能讓史實合攻觸發（PROG-2-1065 QA 修正）
 *
 * 流程：來源武將戰死（不在名冊）→ 產生死亡虎符 → 出陣時部隊綁定虎符 → 戰場查史實關係 → 相鄰助攻追加傷害。
 * 原本以名冊查來源模板，戰死的武將查不到，合攻永遠不觸發；本測試鎖住不再依賴名冊。
 *
 * 範圍：headless 驗證虎符資料與 BattleController 查詢；不含 cc 場景與出陣 UI。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { produceDeathTally, type TigerTallyGeneral } from '../assets/scripts/core/systems/TigerTally';
import { tallyBattleInfoOf } from '../assets/scripts/core/systems/TigerTallyStar';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const TABLE = HistoricalPairTable.load({
    relations: [
        {
            relationId: 'HIST_SWORN_TEST_FLOW',
            templateA: 'liu-bei',
            templateB: 'guan-yu',
            type: 'SWORN',
            epBonus: 15,
            extraEffects: { comboAttackRateMod: 1.3 },
            loreKey: 'LORE_TEST_FLOW',
        },
    ],
}).table;

/** 戰死的來源武將：uid 與 id 不同，且不會出現在名冊中 */
function fallenGeneral(id: string, uid: string): TigerTallyGeneral {
    return { id, uid, templateId: id, isHistorical: true, characterCategory: 'famed', gender: '男' };
}

function unit(id: string, faction: Faction, lane: number, depth: number, tallyId: string | null): TroopUnit {
    const troop = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 60, defense: 10, moveRange: 0, attackRange: 1 });
    troop.moveTo(lane, depth);
    troop.tallyId = tallyId;
    return troop;
}

/** 攻擊方（劉備虎符）打目標；助攻方（關羽虎符）站在目標旁邊。回傳目標被扣的 HP。 */
function damageWithTallies(linked: boolean): number {
    services().initialize();
    const liuCard = produceDeathTally(fallenGeneral('liu-bei', 'uid-liu'), 100, 0, 3);
    const guanCard = produceDeathTally(fallenGeneral('guan-yu', 'uid-guan'), 100, 0, 3);
    assert.isTrue(liuCard !== null && guanCard !== null);
    const cards = new Map([
        [liuCard!.uid, liuCard!],
        [guanCard!.uid, guanCard!],
    ]);

    const ctrl = new BattleController();
    ctrl.historicalPairs = TABLE;
    ctrl.tallyInfoOf = (tallyId) => {
        const card = cards.get(tallyId);
        return card ? tallyBattleInfoOf(card) : null;
    };
    const attacker = unit('attacker', Faction.Player, 2, 2, linked ? liuCard!.uid : null);
    const helper = unit('helper', Faction.Player, 2, 4, linked ? guanCard!.uid : null);
    const defender = unit('defender', Faction.Enemy, 2, 3, null);
    ctrl.state.addUnit(attacker);
    ctrl.state.addUnit(helper);
    ctrl.state.addUnit(defender);

    const resolver = new BattleCombatResolver({
        state: ctrl.state,
        relationsBetween: (a, b) => ctrl.relationsBetweenUnits(a, b),
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => undefined,
        setEnemyGeneralUnitId: () => undefined,
    });
    resolver.hitRandom = () => 0;
    const startHp = defender.currentHp;
    resolver.resolveCombat(attacker, defender, services());
    return startHp - defender.currentHp;
}

export function createKinComboTallyFlowSuite(): TestSuite {
    const suite = new TestSuite('KinComboTallyFlow (戰死來源虎符仍觸發史實合攻 PROG-2-1065)');

    suite.test('來源武將不在名冊：虎符仍帶出史實模板，controller 查得義兄弟關係', () => {
        services().initialize();
        const liuCard = produceDeathTally(fallenGeneral('liu-bei', 'uid-liu'), 100, 0, 3)!;
        const guanCard = produceDeathTally(fallenGeneral('guan-yu', 'uid-guan'), 100, 0, 3)!;
        const ctrl = new BattleController();
        ctrl.historicalPairs = TABLE;
        ctrl.tallyInfoOf = (tallyId) => (tallyId === liuCard.uid ? tallyBattleInfoOf(liuCard) : tallyId === guanCard.uid ? tallyBattleInfoOf(guanCard) : null);
        ctrl.state.addUnit(unit('a', Faction.Player, 2, 2, liuCard.uid));
        ctrl.state.addUnit(unit('b', Faction.Player, 2, 4, guanCard.uid));
        const relations = ctrl.relationsBetweenUnits('a', 'b');
        assert.equals(1, relations.length);
        assert.equals('SWORN', relations[0].type);
    });

    suite.test('戰死來源的虎符相鄰助攻：追加合攻傷害（與有史實關係但無虎符對照）', () => {
        const linked = damageWithTallies(true);
        const unlinked = damageWithTallies(false);
        assert.isTrue(linked > unlinked);
    });

    return suite;
}
