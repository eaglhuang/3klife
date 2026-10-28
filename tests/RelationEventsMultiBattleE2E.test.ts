/**
 * RelationEventsMultiBattleE2E.test.ts — 戰場關係事件跨回合、跨場次流程（PROG-2-0693）
 * 範圍：同一場多次部署／陣亡補位不重播；新的一場（新 BattleController）可再觸發一次。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import type { RelationEventHit } from '../assets/scripts/core/systems/RelationEvents';
import type { TallyBattleInfo } from '../assets/scripts/core/systems/TigerTallyStar';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const TABLE = HistoricalPairTable.load({
    relations: [
        { relationId: 'T_SWORN', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', epBonus: 15, extraEffects: {}, loreKey: 'LORE_T' },
        { relationId: 'T_SWORN2', templateA: 'liu-bei', templateB: 'zhang-fei', type: 'SWORN', epBonus: 15, extraEffects: {}, loreKey: 'LORE_T3' },
    ],
}).table;

function newBattle(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.historicalPairs = TABLE;
    ctrl.tallyInfoOf = (tallyId) => ({ sourceTemplateId: tallyId, star: 1, templateId: null } as unknown as TallyBattleInfo);
    return ctrl;
}

function deploy(ctrl: BattleController, id: string, lane: number, tallyId: string): TroopUnit {
    const troop = new TroopUnit(id, TroopType.Infantry, Faction.Player, { hp: 1000, attack: 60, defense: 10, moveRange: 0, attackRange: 1 });
    troop.moveTo(lane, 0);
    troop.tallyId = tallyId;
    ctrl.state.addUnit(troop);
    return troop;
}

export function createRelationEventsMultiBattleE2ESuite(): TestSuite {
    const suite = new TestSuite('RelationEventsMultiBattleE2E (戰場關係事件跨場次 PROG-2-0693)');

    suite.test('同場多次部署：新配對各觸發一次，陣亡後補位同一對不重播', () => {
        const ctrl = newBattle();
        const events: RelationEventHit[] = [];
        const off = services().event.on(EVENT_NAMES.RelationEventTriggered, (d?: { hit: RelationEventHit }) => { if (d) events.push(d.hit); }) as () => void;
        const liu = deploy(ctrl, 'u1', 0, 'liu-bei');
        assert.equals(0, ctrl.checkBattleRelationEvents().length);
        const guan = deploy(ctrl, 'u2', 1, 'guan-yu');
        assert.equals(1, ctrl.checkBattleRelationEvents().length, '劉關合攻');
        deploy(ctrl, 'u3', 2, 'zhang-fei');
        assert.equals(1, ctrl.checkBattleRelationEvents().length, '劉張為另一對，只多一筆');
        for (let turn = 0; turn < 3; turn++) assert.equals(0, ctrl.checkBattleRelationEvents().length, `第 ${turn} 次再檢查不重播`);
        guan.currentHp = 0;
        deploy(ctrl, 'u4', 3, 'guan-yu');
        assert.equals(0, ctrl.checkBattleRelationEvents().length, '關羽陣亡後補位，同一對不重播');
        assert.isTrue(liu.currentHp > 0);
        assert.equals(2, ctrl.relationEventHits.length);
        assert.equals(2, events.length);
        off();
    });

    suite.test('新的一場：新 BattleController 同樣組合可再觸發，且互不影響', () => {
        const first = newBattle();
        deploy(first, 'a1', 0, 'liu-bei');
        deploy(first, 'a2', 1, 'guan-yu');
        assert.equals(1, first.checkBattleRelationEvents().length);
        const second = newBattle();
        deploy(second, 'b1', 0, 'liu-bei');
        deploy(second, 'b2', 1, 'guan-yu');
        assert.equals(1, second.checkBattleRelationEvents().length, '第二場重新觸發');
        assert.equals(0, first.checkBattleRelationEvents().length, '第一場仍不重播');
        assert.equals(1, first.relationEventHits.length);
        assert.equals(1, second.relationEventHits.length);
    });

    return suite;
}
