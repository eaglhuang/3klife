/**
 * AiEnemyLinkedUltimateFlow.test.ts — 敵方施放「綁定戰法」的奧義接進真實回合流程（PROG-2-1339）
 *
 * 用 BattleController 真實的「玩家階段 → 敵方階段 → 收尾」跑回合，鎖住：
 * - 奧義定義綁定了已實作的戰法：敵方施放的是該戰法（GeneralSkillUsed 的 skillId），不是武將主技能。
 * - 綁定的戰法沒有實作或沒綁定：沿用武將主技能（舊路徑），行為不變。
 * - 多回合：精力清空後不會重複施放（同一回合條件成立也只放一次）。
 *
 * 注意：綁定戰法用 master 上已實作的 lian-huan-chain（連環），不依賴尚未合併的奧義 PR（#1336）。
 *
 * Unity 對照：像 AI 角色的技能表：技能槽綁定的 Ability 是哪個，就施放那個 Ability，而不是角色預設的普攻腳本。
 */
import * as fs from 'fs';
import * as path from 'path';
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { seedUltimateDataForHeadless } from '../assets/scripts/battle/views/BattleSceneLoader';
import { TestSuite, assert } from './TestRunner';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const GENERAL_SKILL_ID = 'diao-chan-charm';
const LINKED_SKILL_ID = 'lian-huan-chain';
const ULTIMATE_ID = 'test-linked-ultimate';
const PLAYER_TROOP_LANES = [0, 1, 3, 4];

function normalEntry(): AiDifficultyEntry {
    const { table } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    return aiDifficultyEntryOf(table!, 'normal');
}

function enemyGeneral(): GeneralUnit {
    return new GeneralUnit({
        id: 'e', name: 'e', faction: Faction.Enemy, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: GENERAL_SKILL_ID, battlePrimarySkillId: GENERAL_SKILL_ID, tacticSlots: [],
        ultimateSlots: [{ slot: 1, ultimateId: ULTIMATE_ID, unlockReincarnation: 1 }],
        rebirthCount: 1,
    });
}

function playerTroop(lane: number): TroopUnit {
    const unit = new TroopUnit(`p-troop-${lane}`, TroopType.Infantry, Faction.Player, {
        hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, 1);
    return unit;
}

/** 戰場：敵將帶綁定（或未綁定）的奧義、精力滿，玩家 4 支兵（與 AiEnemyUltimateFlow 的 NORMAL 案例同條件） */
function battle(linkedSkill: string | null): BattleController {
    seedUltimateDataForHeadless([{ id: ULTIMATE_ID, name: 'test', slot: 1, unlockReincarnation: 1, battleSkillId: linkedSkill }], {});
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(new GeneralUnit({
        id: 'p', name: 'p', faction: Faction.Player, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
    }), enemyGeneral());
    ctrl.configureAiDifficulty(normalEntry());
    ctrl.placeGeneralOnBoard(2, 2);
    ctrl.state.getGeneral(Faction.Enemy)!.currentSp = 100;
    PLAYER_TROOP_LANES.forEach(lane => ctrl.state.addUnit(playerTroop(lane)));
    return ctrl;
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

/** 監聽敵方奧義施放，回傳施放的 skillId 清單與取消函式 */
function watchEnemyUltimates(): { skillIds: string[]; off: () => void } {
    const skillIds: string[] = [];
    const off = services().event.on(EVENT_NAMES.GeneralSkillUsed, (data?: { faction?: Faction; sourceType?: SkillSourceType; skillId?: string }) => {
        if (data?.faction === Faction.Enemy && data.sourceType === SkillSourceType.Ultimate && data.skillId) skillIds.push(data.skillId);
    });
    return { skillIds, off };
}

export function createAiEnemyLinkedUltimateFlowSuite(): TestSuite {
    const suite = new TestSuite('AiEnemyLinkedUltimateFlow (敵方綁定戰法奧義接進回合流程 PROG-2-1339)');

    suite.test('奧義綁定已實作戰法：敵方施放該戰法，不是武將主技能', () => {
        const ctrl = battle(LINKED_SKILL_ID);
        const { skillIds, off } = watchEnemyUltimates();
        runCycle(ctrl);
        off();
        assert.equals(1, skillIds.length);
        assert.equals(LINKED_SKILL_ID, skillIds[0]);
    });

    suite.test('奧義綁定的戰法未實作：沿用武將主技能（舊路徑）', () => {
        const ctrl = battle('not-an-implemented-skill');

        const { skillIds, off } = watchEnemyUltimates();
        runCycle(ctrl);
        off();
        assert.equals(1, skillIds.length);
        assert.equals(GENERAL_SKILL_ID, skillIds[0]);
    });

    suite.test('多回合：施放一次後精力清空，後續回合不重複施放', () => {
        const ctrl = battle(LINKED_SKILL_ID);
        const { skillIds, off } = watchEnemyUltimates();
        for (let cycle = 0; cycle < 3; cycle++) runCycle(ctrl);
        off();
        assert.equals(1, skillIds.length);
        assert.equals(0, ctrl.state.getGeneral(Faction.Enemy)!.currentSp);
    });

    return suite;
}
