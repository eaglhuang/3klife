/**
 * KinComboPresentation.test.ts — 史實合攻觸發時發出演出事件（KIN-09 演出，PROG-2-0978）headless 測試
 *
 * 鎖住：有義兄弟且擲中觸發率時，於追加傷害前發出 KinComboAttack（攻方、助攻方、目標 id）；
 * 沒有史實關係時不發。cc 端的戰報與撲擊動畫由 BattleUIBridge 接聽，不在本測試範圍。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
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
            relationId: 'HIST_SWORN_PRESENTATION',
            templateA: 'liu-bei',
            templateB: 'guan-yu',
            type: 'SWORN',
            epBonus: 15,
            extraEffects: { comboAttackRateMod: 1.3 },
            loreKey: 'LORE_TEST_PRESENTATION',
        },
    ],
}).table;

function fallenGeneral(id: string, uid: string): TigerTallyGeneral {
    return { id, uid, templateId: id, isHistorical: true, characterCategory: 'famed', gender: '男' };
}

function unit(id: string, faction: Faction, lane: number, depth: number, tallyId: string | null): TroopUnit {
    const troop = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 60, defense: 10, moveRange: 0, attackRange: 1 });
    troop.moveTo(lane, depth);
    troop.tallyId = tallyId;
    return troop;
}

interface KinComboPayload {
    attackerId: string;
    helperId: string;
    targetId: string;
}

/** 攻擊方（劉備虎符）打目標，助攻方（關羽虎符）站在目標旁邊；回傳收到的 KinComboAttack 事件。 */
function fightAndCollect(linked: boolean, roll: number): KinComboPayload[] {
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
    resolver.hitRandom = () => roll;

    const received: KinComboPayload[] = [];
    const unsub = services().event.on(EVENT_NAMES.KinComboAttack, (payload?: KinComboPayload) => {
        if (payload) received.push(payload);
    });
    resolver.resolveCombat(attacker, defender, services());
    unsub();
    return received;
}

export function createKinComboPresentationSuite(): TestSuite {
    const suite = new TestSuite('KinComboPresentation (史實合攻演出事件 KIN-09 PROG-2-0978)');

    suite.test('義兄弟相鄰且擲中觸發率：發出一次事件，帶攻方、助攻方、目標 id', () => {
        const received = fightAndCollect(true, 0);
        assert.equals(1, received.length);
        assert.equals('attacker', received[0].attackerId);
        assert.equals('helper', received[0].helperId);
        assert.equals('defender', received[0].targetId);
    });

    suite.test('沒有史實關係的相鄰友軍：不發事件', () => {
        assert.equals(0, fightAndCollect(false, 0).length);
    });

    return suite;
}
