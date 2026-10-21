/**
 * EnemyTacticTurnE2E.test.ts — 敵方選技接進敵方回合（PROG-2-0918）
 *
 * 用真實回合流程（玩家階段 → 敵方階段 → 收尾）確認：敵方帶戰法槽時，會挑出戰法來施放；
 * 沒有戰法槽時維持原本的武將主技能。
 *
 * Unity 對照：像 PlayMode 測試把敵方 AI 跑幾回合，看它是不是真的每回合從技能清單挑一招出手。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const TEST_TACTIC_ID = 'test-ranged-tactic';
const TEST_BATTLE_SKILL_ID = 'cao-cao-tactics';

function general(id: string, faction: Faction, tacticSlots: GeneralUnit['tacticSlots'] = []): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: TEST_BATTLE_SKILL_ID, battlePrimarySkillId: TEST_BATTLE_SKILL_ID, tacticSlots,
    });
}

function battle(enemyTacticSlots: GeneralUnit['tacticSlots']): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy, enemyTacticSlots));
    ctrl.placeGeneralOnBoard(2, 2);
    // 我方一隊步兵當作敵方戰法的目標（單體傷害估算需要至少一個活著的我方單位）
    const target = new TroopUnit('player-foot', TroopType.Infantry, Faction.Player, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    target.moveTo(2, 3);
    ctrl.state.addUnit(target);
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 2000 });
    // 戰法庫查表：測試用一招遠程戰法，指向既有的戰法技能
    (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap.set(TEST_TACTIC_ID, {
        id: TEST_TACTIC_ID,
        displayName: '測試遠程',
        category: 'ranged',
        battleSkillId: TEST_BATTLE_SKILL_ID,
    });
    return ctrl;
}

function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createEnemyTacticTurnE2ESuite(): TestSuite {
    const suite = new TestSuite('EnemyTacticTurnE2E (敵方選技接進回合 PROG-2-0918)');

    suite.test('沒有戰法槽時 chooseEnemyTactic 回 null，敵方維持武將主技能', () => {
        const ctrl = battle([]);
        assert.equals(null, ctrl.chooseEnemyTactic());
    });

    suite.test('有戰法槽且玩家有單位時，挑出戰法並回傳其 battleSkillId', () => {
        const ctrl = battle([{ slotId: 's1', tacticId: TEST_TACTIC_ID, source: 'bloodline' }]);
        const picked = ctrl.chooseEnemyTactic();
        assert.isDefined(picked);
        assert.equals(TEST_TACTIC_ID, picked!.tacticId);
        assert.equals(TEST_BATTLE_SKILL_ID, picked!.battleSkillId);
    });

    suite.test('真實回合跑 6 回合：敵方會以挑中的戰法施放（tacticId 帶進 castBattleSkill）', () => {
        const ctrl = battle([{ slotId: 's1', tacticId: TEST_TACTIC_ID, source: 'bloodline' }]);
        const calls: Array<{ faction: Faction; options: { battleSkillId?: string | null; tacticId?: string | null } }> = [];
        const original = ctrl.castBattleSkill.bind(ctrl);
        ctrl.castBattleSkill = (faction, options, sourceType) => {
            calls.push({ faction, options: options ?? {} });
            return original(faction, options, sourceType);
        };

        // initBattle 會把敵將 SP 歸零；這裡補滿，讓敵方武將能在回合中出招
        ctrl.state.enemyGeneral!.currentSp = ctrl.state.enemyGeneral!.maxSp;
        for (let turn = 0; turn < 6; turn += 1) fullTurn(ctrl);

        const enemyCasts = calls.filter(call => call.faction === Faction.Enemy);
        assert.isTrue(enemyCasts.length >= 1, '6 回合內敵方應至少施放一次');
        assert.equals(TEST_TACTIC_ID, enemyCasts[0].options.tacticId);
        assert.equals(TEST_BATTLE_SKILL_ID, enemyCasts[0].options.battleSkillId);
    });

    suite.test('真實回合：玩家施放路徑不受影響（玩家 castBattleSkill 不帶敵方戰法）', () => {
        const ctrl = battle([{ slotId: 's1', tacticId: TEST_TACTIC_ID, source: 'bloodline' }]);
        const playerCalls: Array<Faction> = [];
        const original = ctrl.castBattleSkill.bind(ctrl);
        ctrl.castBattleSkill = (faction, options, sourceType) => {
            if (faction === Faction.Player) playerCalls.push(faction);
            return original(faction, options, sourceType);
        };
        for (let turn = 0; turn < 3; turn += 1) fullTurn(ctrl);
        assert.equals(0, playerCalls.length, '玩家沒有主動施放時不應進入戰法分派');
    });

    return suite;
}
