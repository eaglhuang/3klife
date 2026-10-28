/**
 * BattleRelationEvents.test.ts — 戰場開場的關係事件（KIN-08 戰場呼叫端 / PROG-2-1413）多回合流程測試
 *
 * Unity 對照：PlayMode 測試把整場戰鬥跑好幾回合，確認開場事件只在開場播一次，之後回合不會重播。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import { RelationEventLedger } from '../assets/scripts/core/systems/RelationEvents';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 10, int: 60, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function coupleTable(): HistoricalPairTable {
    const base = { epBonus: 0, extraEffects: {} };
    return HistoricalPairTable.load({
        relations: [
            { ...base, relationId: 'T_COUPLE', templateA: 'zhou-yu', templateB: 'xiao-qiao', type: 'COUPLE', loreKey: 'L1' },
        ],
    }).table;
}

/** 一整個回合：玩家階段 → 敵方階段 → 收尾 */
function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

function battle(encounterId: string, ledger: RelationEventLedger, enemyId = 'xiao-qiao'): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.historicalPairs = coupleTable();
    ctrl.bindRelationEvents(`battle:${encounterId}`, ledger);
    ctrl.initBattle(general('zhou-yu', Faction.Player), general(enemyId, Faction.Enemy));
    return ctrl;
}

export function createBattleRelationEventsSuite(): TestSuite {
    const suite = new TestSuite('BattleRelationEvents (戰場開場關係事件 KIN-08)');

    suite.test('開場出陣雙方為史實配對：觸發一次，跑多回合後不重播', () => {
        const ledger = new RelationEventLedger();
        const ctrl = battle('stage-a', ledger);
        assert.equals(1, ctrl.relationEventHits.length);
        assert.equals('famous-match', ctrl.relationEventHits[0].eventId);
        const startTurn = services().battle.getSnapshot().turn;
        for (let turn = 0; turn < 3; turn += 1) fullTurn(ctrl);
        assert.isTrue(services().battle.getSnapshot().turn > startTurn, '確實跑過多個回合');
        assert.equals(1, ctrl.relationEventHits.length, '回合推進不會重新判定事件');
        assert.equals(1, ledger.size());
    });

    suite.test('同一場戰役再次開場（同一帳本）不再觸發；換戰役則照播', () => {
        const ledger = new RelationEventLedger();
        battle('stage-a', ledger);
        assert.equals(0, battle('stage-a', ledger).relationEventHits.length, '同一戰役只播一次');
        assert.equals(1, battle('stage-b', ledger).relationEventHits.length, '不同戰役是新的實例');
    });

    suite.test('非史實配對、無配對表或未綁定帳本時不觸發', () => {
        assert.equals(0, battle('stage-c', new RelationEventLedger(), 'cao-cao').relationEventHits.length);

        services().initialize();
        const unbound = new BattleController();
        unbound.historicalPairs = coupleTable();
        unbound.initBattle(general('zhou-yu', Faction.Player), general('xiao-qiao', Faction.Enemy));
        assert.equals(0, unbound.relationEventHits.length, '沒綁定帳本時維持舊版');

        const noTable = new BattleController();
        noTable.bindRelationEvents('battle:stage-d', new RelationEventLedger());
        noTable.initBattle(general('zhou-yu', Faction.Player), general('xiao-qiao', Faction.Enemy));
        assert.equals(0, noTable.relationEventHits.length, '沒有配對表時不判定');
    });

    return suite;
}
