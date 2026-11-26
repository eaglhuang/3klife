/**
 * AiDelegateUltimateFlow.test.ts — 委任代打自動放奧義（PROG-2-9723）
 *
 * 委任代打（玩家方自動代打）主將 SP 滿時，與敵方共用同一套奧義判斷（IQ 比例門檻＋家族審批）：
 * - 符合門檻（HIGH 落後且精力 > 30%）：SP 滿就放一次奧義。
 * - 不符合（HIGH 未落後、擊殺不足）：SP 滿也不放，SP 留著。
 * - MEDIUM（委任智力 50~69）：精力 50% 以下不放、超過才放（與敵方同比例）。
 * - 沒有難度表（ultimateRules 未設定）：不放。
 * - 委任 LOW（PROG-2-9728，總PM 11/22 裁決）：ultimateRules.delegateMinIq＝MEDIUM，LOW 以 MEDIUM 判斷（精力 > 50% 即放）；敵方 LOW 維持不放。
 *
 * Unity 對照：像玩家角色的自動戰鬥 AI 跟敵人的 AI 用同一組 Ability 條件，只是 IQ 來源不同。
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
import { TestSuite, assert } from './TestRunner';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const TEST_BATTLE_SKILL_ID = 'cao-cao-tactics';
const TEST_ULTIMATE_ID = 'test-ultimate';
const PLAYER_TROOP_LANES = [0, 1, 3, 4];
const ENEMY_TROOP_LANES = [0, 1, 3, 4];

function tableEntry(difficulty: 'normal' | 'hard'): AiDifficultyEntry {
    const { table, errors } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    assert.equals(0, errors.length);
    return aiDifficultyEntryOf(table!, difficulty);
}

/** 主將：int 決定委任品質（90 → EXPERT 對 EXTREME，60 → MEDIUM）；精力預設滿（上限 100） */
function general(id: string, faction: Faction, int: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int, lea: 90,
        skillId: TEST_BATTLE_SKILL_ID, battlePrimarySkillId: TEST_BATTLE_SKILL_ID, tacticSlots: [],
        ultimateSlots: [{ slot: 1, ultimateId: TEST_ULTIMATE_ID, unlockReincarnation: 1 }],
        rebirthCount: 1,
    });
}

function troop(id: string, faction: Faction, lane: number, row: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, row);
    return unit;
}

/** 委任代打戰場：玩家主將 SP 滿、雙方兵力數由參數決定；difficulty 為 null 時不設難度表 */
function delegateBattle(opts: { int: number; playerTroops: number; enemyTroops: number; difficulty: 'normal' | 'hard' | null }): { ctrl: BattleController; player: GeneralUnit } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const player = general('p', Faction.Player, opts.int);
    const ctrl = new BattleController();
    ctrl.initBattle(player, general('e', Faction.Enemy, 50));
    if (opts.difficulty) ctrl.configureAiDifficulty(tableEntry(opts.difficulty));
    ctrl.placeGeneralOnBoard(2, 2);
    player.currentSp = player.maxSp;
    PLAYER_TROOP_LANES.slice(0, opts.playerTroops).forEach(lane => ctrl.state.addUnit(troop(`p-${lane}`, Faction.Player, lane, 1)));
    ENEMY_TROOP_LANES.slice(0, opts.enemyTroops).forEach(lane => ctrl.state.addUnit(troop(`e-${lane}`, Faction.Enemy, lane, 6)));
    ctrl.enableDelegateFromGeneral();
    return { ctrl, player };
}

/** 跑一次委任代打放招，回傳玩家奧義施放次數 */
function runDelegateCountingUltimates(ctrl: BattleController): number {
    let casts = 0;
    const off = services().event.on(EVENT_NAMES.GeneralSkillUsed, (data?: { faction?: Faction; sourceType?: SkillSourceType }) => {
        if (data?.faction === Faction.Player && data.sourceType === SkillSourceType.Ultimate) casts++;
    });
    ctrl.runDelegateSkillPhase();
    off();
    return casts;
}

export function createAiDelegateUltimateFlowSuite(): TestSuite {
    const suite = new TestSuite('AiDelegateUltimateFlow (委任代打自動放奧義 PROG-2-9723)');

    suite.test('HIGH（EXPERT 智力 90）落後且精力 > 30%：SP 滿就代打放奧義', () => {
        // 我方 1 支、敵方 3 支 → 落後；精力 100/100 > 30%
        const { ctrl } = delegateBattle({ int: 90, playerTroops: 1, enemyTroops: 3, difficulty: 'hard' });
        assert.equals(1, runDelegateCountingUltimates(ctrl));
    });

    suite.test('HIGH：未落後且擊殺不足 2，SP 滿也不放', () => {
        // 我方 3 支、敵方 2 支 → 未落後；敵兵滿血擊殺 0
        const { ctrl } = delegateBattle({ int: 90, playerTroops: 3, enemyTroops: 2, difficulty: 'hard' });
        assert.equals(0, runDelegateCountingUltimates(ctrl));
    });

    suite.test('HIGH：落後但精力未過 30%（精力 30/100 邊界），不放', () => {
        const { ctrl, player } = delegateBattle({ int: 90, playerTroops: 1, enemyTroops: 3, difficulty: 'hard' });
        player.vitality = 30;
        assert.equals(0, runDelegateCountingUltimates(ctrl));
    });

    suite.test('MEDIUM（智力 60）：精力 50/100 邊界不放、51/100 且敵方 > 3 才放', () => {
        const low = delegateBattle({ int: 60, playerTroops: 2, enemyTroops: 4, difficulty: 'normal' });
        low.player.vitality = 50;
        assert.equals(0, runDelegateCountingUltimates(low.ctrl));

        const high = delegateBattle({ int: 60, playerTroops: 2, enemyTroops: 4, difficulty: 'normal' });
        high.player.vitality = 51;
        assert.equals(1, runDelegateCountingUltimates(high.ctrl));
    });

    suite.test('委任 LOW（智力 40）精力 51/100：以 MEDIUM 判斷，SP 滿就放（PROG-2-9728）', () => {
        const { ctrl, player } = delegateBattle({ int: 40, playerTroops: 2, enemyTroops: 4, difficulty: 'normal' });
        player.vitality = 51;
        assert.equals(1, runDelegateCountingUltimates(ctrl));
    });

    suite.test('委任 LOW（智力 40）精力 49/100：未過 50%，不放（PROG-2-9728）', () => {
        const { ctrl, player } = delegateBattle({ int: 40, playerTroops: 2, enemyTroops: 4, difficulty: 'normal' });
        player.vitality = 49;
        assert.equals(0, runDelegateCountingUltimates(ctrl));
    });

    suite.test('敵方 LOW 行為不變：精力滿、敵方 > 3 也不放（PROG-2-9728）', () => {
        const { ctrl } = delegateBattle({ int: 40, playerTroops: 2, enemyTroops: 4, difficulty: 'normal' });
        ctrl.state.aiIq = 'LOW';
        const enemy = ctrl.state.getGeneral(Faction.Enemy)!;
        enemy.vitality = enemy.maxVitality;
        assert.equals(null, ctrl.chooseEnemyUltimate());
    });

    suite.test('沒有難度表（ultimateRules 未設定）：即使條件成立也不放', () => {
        const { ctrl } = delegateBattle({ int: 90, playerTroops: 1, enemyTroops: 3, difficulty: null });
        assert.equals(0, runDelegateCountingUltimates(ctrl));
    });

    suite.test('教學戰旁路（PROG-2-10074）：IQ／敵方隊數不符（MEDIUM、敵 2 隊），教學戰 SP 滿仍放；一般戰不放', () => {
        const normal = delegateBattle({ int: 60, playerTroops: 2, enemyTroops: 2, difficulty: 'normal' });
        assert.equals(0, runDelegateCountingUltimates(normal.ctrl), '一般戰條件不符不放');
        const tutorial = delegateBattle({ int: 60, playerTroops: 2, enemyTroops: 2, difficulty: 'normal' });
        tutorial.ctrl.tutorialBattle = true;
        assert.equals(1, runDelegateCountingUltimates(tutorial.ctrl), '教學戰 SP 滿就放');
    });

    return suite;
}
