/**
 * RelationEventLedgerBattle.test.ts — 戰場關係事件帳本隨存檔保存（KIN-08 戰場端 / PROG-2-1415）
 *
 * Unity 對照：把戰場的 OneShot 紀錄放進存檔；讀檔重進同一關，事件不會再播一次。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import type { TallyBattleInfo } from '../assets/scripts/core/systems/TigerTallyStar';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const TABLE = HistoricalPairTable.load({
    relations: [
        { relationId: 'T_SWORN', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', epBonus: 15, extraEffects: {}, loreKey: 'LORE_T' },
    ],
}).table;

function sworn(ctrl: BattleController): void {
    ctrl.historicalPairs = TABLE;
    ctrl.tallyInfoOf = (tallyId) => ({ sourceTemplateId: tallyId, star: 1, templateId: null } as unknown as TallyBattleInfo);
    for (const [id, tally, lane] of [['a', 'liu-bei', 0], ['b', 'guan-yu', 1]] as const) {
        const troop = new TroopUnit(id, TroopType.Infantry, Faction.Player, { hp: 1000, attack: 60, defense: 10, moveRange: 0, attackRange: 1 });
        troop.moveTo(lane, 0);
        troop.tallyId = tally;
        ctrl.state.addUnit(troop);
    }
}

/** 進入一場戰役：綁定帳本後部署時判定；回傳這場新觸發的事件數 */
function enterBattle(ledger: GameSession['relationEvents'], encounterId: string): number {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.bindRelationEvents(`battle:${encounterId}`, ledger);
    sworn(ctrl);
    return ctrl.checkBattleRelationEvents().length;
}

export function createRelationEventLedgerBattleSuite(): TestSuite {
    const suite = new TestSuite('RelationEventLedgerBattle (戰場關係事件帳本存檔 PROG-2-1415)');

    suite.test('同一關重進不重播；換關照播', () => {
        const ledger = new GameSession(1).relationEvents;
        assert.equals(1, enterBattle(ledger, 'stage-a'));
        assert.equals(0, enterBattle(ledger, 'stage-a'), '同一關只播一次');
        assert.equals(1, enterBattle(ledger, 'stage-b'), '不同關是新的實例');
    });

    suite.test('已播紀錄經真實 JSON 存檔，讀回後重進同一關不再觸發', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = new GameSession(2);
        source.setSaveService(new PlayerSaveService(adapter));
        assert.equals(1, enterBattle(source.relationEvents, 'stage-a'));
        await source.save();
        const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
        await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));

        const restored = new GameSession(2);
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(0, enterBattle(restored.relationEvents, 'stage-a'), '讀檔後同一關不重播');
        assert.equals(1, enterBattle(restored.relationEvents, 'stage-c'), '讀檔後新關仍會播');
    });

    suite.test('未綁定時維持戰場內建的一場一份帳本', () => {
        services().initialize();
        const ctrl = new BattleController();
        sworn(ctrl);
        assert.equals(1, ctrl.checkBattleRelationEvents().length);
        const again = new BattleController();
        sworn(again);
        assert.equals(1, again.checkBattleRelationEvents().length, '另一場戰役仍會播');
    });

    return suite;
}
