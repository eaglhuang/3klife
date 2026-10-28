/**
 * AiDuelInitiate.test.ts — HARD 以上敵將只在有利時發起單挑（AI武將強度 E-7，PROG-2-1470）
 *
 * 鎖住：LOW／MEDIUM／未套難度表一律發起；HIGH 以上只在我方防守分數 ≤ 0.5 時發起；
 * BattleController.shouldEnemyInitiateDuel 讀難度表的 aiIq 與真實單挑評估。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { AiDifficulty } from '../assets/scripts/core/systems/AiSpCharge';
import { aiDifficultyEntryOf, parseAiDifficultyTable } from '../assets/scripts/core/systems/AiDifficultyTable';
import { AI_DUEL_INITIATE_MAX_DEFENDER_SCORE, aiShouldInitiateDuel } from '../assets/scripts/core/systems/AiDuelDecision';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    unit.moveTo(lane, depth);
    return unit;
}

/** 3 對 3 兵力；我方主將血量比由呼叫端指定，敵將半血 */
function battle(difficulty: AiDifficulty | null, playerHpRatio: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.5);
    const ctrl = new BattleController();
    const player = general('player', Faction.Player);
    const enemy = general('enemy', Faction.Enemy);
    ctrl.initBattle(player, enemy);
    player.currentHp = player.maxHp * playerHpRatio;
    enemy.currentHp = enemy.maxHp / 2;
    if (difficulty) {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json'), 'utf8'));
        const table = parseAiDifficultyTable(raw).table;
        if (!table) throw new Error('ai-difficulty.json 解析失敗');
        ctrl.configureAiDifficulty(aiDifficultyEntryOf(table, difficulty));
    }
    for (let i = 0; i < 3; i += 1) ctrl.state.addUnit(troop(`p-${i}`, Faction.Player, 2, 1 + i));
    for (let i = 0; i < 3; i += 1) ctrl.state.addUnit(troop(`e-${i}`, Faction.Enemy, 2, 6 - i));
    return ctrl;
}

export function createAiDuelInitiateSuite(): TestSuite {
    const suite = new TestSuite('AiDuelInitiate (HARD 以上有利才發起單挑 E-7 PROG-2-1470)');

    suite.test('LOW、MEDIUM、未套難度表：分數再高也發起', () => {
        assert.isTrue(aiShouldInitiateDuel('LOW', 0.99));
        assert.isTrue(aiShouldInitiateDuel('MEDIUM', 0.99));
        assert.isTrue(aiShouldInitiateDuel(null, 0.99));
    });

    suite.test('HIGH 以上：我方防守分數 ≤ 0.5 才發起', () => {
        assert.equals(0.5, AI_DUEL_INITIATE_MAX_DEFENDER_SCORE);
        for (const iq of ['HIGH', 'EXTREME', 'PERFECT']) {
            assert.isTrue(aiShouldInitiateDuel(iq, 0.5));
            assert.isTrue(aiShouldInitiateDuel(iq, 0.3));
            assert.isTrue(!aiShouldInitiateDuel(iq, 0.51));
        }
    });

    suite.test('BattleController：困難難度、我將滿血（敵方不利）時不發起；我將殘血時發起', () => {
        assert.isTrue(!battle('hard', 1).shouldEnemyInitiateDuel());
        assert.isTrue(battle('hard', 0.1).shouldEnemyInitiateDuel());
    });

    suite.test('BattleController：普通難度與未套難度表，我將滿血仍發起', () => {
        assert.isTrue(battle('normal', 1).shouldEnemyInitiateDuel());
        assert.isTrue(battle(null, 1).shouldEnemyInitiateDuel());
    });

    return suite;
}
