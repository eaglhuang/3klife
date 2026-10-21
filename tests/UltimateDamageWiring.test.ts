/**
 * UltimateDamageWiring — 奧義攻擊基準接進派發流程（PROG-2-0927）
 *
 * 派發器在施放奧義時，依奧義槽位的 base_power 與施放者主屬性算出 ultimateAttack，交給傷害解析。
 * 這裡用假的執行器（spy）攔下送進來的 request，確認欄位有被帶入、也確認查不到定義時不帶入。
 *
 * Unity 對照：像在 Animator 的 StateMachine 進入點先算好一個 damage 參數，再交給 Combat 元件使用。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { ultimateAttackOf } from '../assets/scripts/core/systems/UltimateDamage';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { seedUltimateDataForHeadless } from '../assets/scripts/battle/views/BattleSceneLoader';
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

function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
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

    suite.test('真實多回合流程：奧義經派發後造成的傷害與精力扣減，與無奧義資料的對照組不同', () => {
        const dataDir = join(__dirname, '..', 'assets', 'resources', 'data');
        const ultimates = JSON.parse(readFileSync(join(dataDir, 'master', 'ultimate-definitions.json'), 'utf8')).data;
        const basePower = JSON.parse(readFileSync(join(dataDir, 'numerical-config.json'), 'utf8')).NumericalConfig.Ult_Base_Power;

        /** 同一場景：玩家關羽在前排，敵方三隊步兵在同一縱列；回傳奧義造成的敵方總掉血量與精力扣減量 */
        const castAndMeasure = (seed: { ultimates: unknown[]; basePower: Record<string, number> }) => {
            services().initialize();
            services().session.setRandomSource(() => 0.99);
            seedUltimateDataForHeadless(seed.ultimates as never, seed.basePower);
            const ctrl = new BattleController();
            const player = general('guan-yu', Faction.Player);
            ctrl.initBattle(player, general('enemy', Faction.Enemy));
            ctrl.placeGeneralOnBoard(2, 2);
            const enemies: TroopUnit[] = [];
            for (let i = 0; i < 3; i += 1) {
                const troop = new TroopUnit(`e-${i}`, TroopType.Infantry, Faction.Enemy, {
                    hp: 100000, attack: 1, defense: 0, moveRange: 1, attackRange: 1,
                });
                troop.moveTo(2, 4 + i);
                ctrl.state.addUnit(troop);
                enemies.push(troop);
            }
            // 施放奧義需要滿 SP（canUseSkill）；initBattle 會把武將 SP 歸零
            player.currentSp = player.maxSp;
            const hpBefore = enemies.reduce((sum, troop) => sum + troop.currentHp, 0);
            const vitalityBefore = player.vitality;
            const applied = ctrl.triggerPlayerBattleSkill('guan-yu-slash', SkillSourceType.Ultimate, {
                ultimateId: 'ult-guan-yu-1',
                targetMode: BattleSkillTargetMode.Line,
            });
            const hpAfter = enemies.reduce((sum, troop) => sum + troop.currentHp, 0);
            return {
                applied,
                damage: hpBefore - hpAfter,
                vitalityDrop: vitalityBefore - player.vitality,
                maxVitality: player.maxVitality,
                ctrl,
            };
        };

        try {
            const withUlt = castAndMeasure({ ultimates, basePower });
            const control = castAndMeasure({ ultimates: [], basePower: {} });

            assert.isTrue(withUlt.applied, '奧義應該成功施放（真實流程）');
            assert.isTrue(withUlt.damage > 0, '奧義應造成傷害');
            assert.isTrue(withUlt.damage !== control.damage, `有奧義資料與無資料的傷害應不同：${withUlt.damage} vs ${control.damage}`);
            // 精力扣減：ult-guan-yu-1 的 vitalityCostPct = 0.05，成本 = round(maxVitality × 0.05)
            assert.equals(Math.round(withUlt.maxVitality * 0.05), withUlt.vitalityDrop);

            // 之後幾個完整回合（玩家、敵方、收尾）要能跑完，不會卡住或丟例外
            for (let turn = 0; turn < 3; turn += 1) fullTurn(withUlt.ctrl);
        } finally {
            seedUltimateDataForHeadless([], {});
        }
    });

    return suite;
}
