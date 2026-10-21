/**
 * UltimateDamageWiring — 奧義攻擊基準接進派發流程（PROG-2-0927）
 *
 * 派發器在施放奧義時，依奧義槽位的 base_power 與施放者主屬性算出 ultimateAttack，交給傷害解析。
 * 這裡用假的執行器（spy）攔下送進來的 request，確認欄位有被帶入、也確認查不到定義時不帶入。
 *
 * Unity 對照：像在 Animator 的 StateMachine 進入點先算好一個 damage 參數，再交給 Combat 元件使用。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { ultimateAttackOf } from '../assets/scripts/core/systems/UltimateDamage';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType, type BattleSkillRequest } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

const BASE_POWER_TABLE: Readonly<Record<string, number>> = { '1': 200, '2': 300, '3': 400, '4': 500, '5': 700 };

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 90, int: 60, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

type Definition = { slot?: number; scalingStat?: string | null } | undefined;

/** 只接派發器的奧義相關依賴，執行器換成 spy，回傳被攔下的 request */
function dispatcherWith(ctrl: BattleController, def: Definition, table: Readonly<Record<string, number>> | undefined) {
    const dispatcher = new BattleSkillDispatcher(
        {
            state: ctrl.state,
            combatResolver: ctrl['combatResolver'],
            getPlayerGeneralUnitId: () => null,
            getEnemyGeneralUnitId: () => null,
            getUltimateDamageDef: () => def,
            getUltBasePowerTable: () => table,
        },
        ctrl['skillSourceTranslator'],
    );
    const captured: { request: BattleSkillRequest | null } = { request: null };
    (dispatcher as unknown as { skillExecutor: unknown }).skillExecutor = {
        execute: (request: BattleSkillRequest) => {
            captured.request = request;
            return { requestId: 'spy', battleSkillId: request.battleSkillId, applied: false, blockedReason: 'spy', deltas: [], battleLogLines: [] };
        },
    };
    return { dispatcher, captured };
}

function ultimateRequest(): BattleSkillRequest {
    return {
        sourceType: SkillSourceType.Ultimate,
        ownerUid: Faction.Player,
        battleSkillId: 'test-ult-skill',
        ultimateId: 'test-ult-1',
        targetMode: BattleSkillTargetMode.EnemyAll,
        timing: BattleSkillTiming.ActiveCast,
    };
}

export function createUltimateDamageWiringSuite(): TestSuite {
    const suite = new TestSuite('UltimateDamageWiring (奧義攻擊基準派發 PROG-2-0927)');

    suite.test('奧義（STR 物理型）：派發時帶入 ultimateAttack，數值與公式一致', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        const { dispatcher, captured } = dispatcherWith(ctrl, { slot: 1, scalingStat: 'str' }, BASE_POWER_TABLE);

        dispatcher.executeBattleSkillRequest(ultimateRequest());

        const expected = ultimateAttackOf(1, BASE_POWER_TABLE, 'str', { str: 90, int: 60 });
        assert.isDefined(captured.request, '執行器應收到 request');
        assert.equals(expected, captured.request!.ultimateAttack);
    });

    suite.test('奧義（INT 謀略型）：以 INT 計算，與 STR 結果不同', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        const { dispatcher, captured } = dispatcherWith(ctrl, { slot: 2, scalingStat: 'int' }, BASE_POWER_TABLE);

        dispatcher.executeBattleSkillRequest(ultimateRequest());

        assert.equals(ultimateAttackOf(2, BASE_POWER_TABLE, 'int', { str: 90, int: 60 }), captured.request!.ultimateAttack);
    });

    suite.test('查不到定義、表未載入或主屬性未定時不帶入 ultimateAttack（沿用一般傷害路徑）', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));

        const noDef = dispatcherWith(ctrl, undefined, BASE_POWER_TABLE);
        noDef.dispatcher.executeBattleSkillRequest(ultimateRequest());
        assert.equals(undefined, noDef.captured.request!.ultimateAttack);

        const noTable = dispatcherWith(ctrl, { slot: 1, scalingStat: 'str' }, undefined);
        noTable.dispatcher.executeBattleSkillRequest(ultimateRequest());
        assert.equals(undefined, noTable.captured.request!.ultimateAttack);

        const unknownStat = dispatcherWith(ctrl, { slot: 1, scalingStat: 'cha' }, BASE_POWER_TABLE);
        unknownStat.dispatcher.executeBattleSkillRequest(ultimateRequest());
        assert.equals(undefined, unknownStat.captured.request!.ultimateAttack);
    });

    suite.test('非奧義來源（戰法）不帶入 ultimateAttack', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        const { dispatcher, captured } = dispatcherWith(ctrl, { slot: 1, scalingStat: 'str' }, BASE_POWER_TABLE);

        dispatcher.executeBattleSkillRequest({ ...ultimateRequest(), sourceType: SkillSourceType.SeedTactic, ultimateId: null });

        assert.equals(undefined, captured.request!.ultimateAttack);
    });

    return suite;
}
