/**
 * FirstBattlePace.test.ts — 首戰節奏（PROG-2-10072，總PM 2026-11-26 裁決）
 * 首戰預設 x2（可切回 x1）、首戰縮短敵方回合固定等待；一般戰鬥不動；回合上限維持 10。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { BATTLE_TURN_FLOW_TIMING } from '../assets/scripts/battle/views/BattlePresentationTiming';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createFirstBattlePaceSuite(): TestSuite {
    const suite = new TestSuite('FirstBattlePace (首戰節奏 PROG-2-10072)');

    suite.test('資料：預設 x2、等待縮短且不得長於一般戰鬥、回合上限維持 10', () => {
        assert.equals(2, GAME_CONFIG.tutorialDefaultBattleSpeed);
        assert.isTrue(GAME_CONFIG.tutorialEnemyThinkingLeadInSec > 0);
        assert.isTrue(GAME_CONFIG.tutorialEnemyThinkingLeadInSec < BATTLE_TURN_FLOW_TIMING.enemyThinkingLeadInSec);
        assert.isTrue(GAME_CONFIG.tutorialPostSubturnVisualBufferSec > 0);
        assert.isTrue(GAME_CONFIG.tutorialPostSubturnVisualBufferSec < BATTLE_TURN_FLOW_TIMING.postSubturnVisualBufferSec);
        assert.equals(10, GAME_CONFIG.TUTORIAL_TURN_LIMIT);
    });

    suite.test('接線：縮短等待只在 tutorialBattle 時套用；一般戰鬥仍用 BATTLE_TURN_FLOW_TIMING', () => {
        const flow = read('assets/scripts/battle/views/TurnFlowManager.ts');
        assert.isTrue(flow.includes('this.ctx.ctrl?.tutorialBattle ? GAME_CONFIG.tutorialEnemyThinkingLeadInSec : BATTLE_TURN_FLOW_TIMING.enemyThinkingLeadInSec'));
        assert.isTrue(flow.includes('this.ctx.ctrl?.tutorialBattle ? GAME_CONFIG.tutorialPostSubturnVisualBufferSec : BATTLE_TURN_FLOW_TIMING.postSubturnVisualBufferSec'));
    });

    suite.test('接線：只有首戰設預設倍速，兩個戰報面板都有 setSpeed 同步按鈕', () => {
        const scene = read('assets/scripts/battle/views/BattleScene.ts');
        assert.isTrue(/if \(battleParams\.tutorial\) \{\s+const speed = GAME_CONFIG\.tutorialDefaultBattleSpeed;\s+setBattleTimeScale\(speed\)/.test(scene));
        for (const rel of ['assets/scripts/ui/components/BattleLogPanel.ts', 'assets/scripts/ui/components/BattleLogComposite.ts']) {
            assert.isTrue(read(rel).includes('public setSpeed(speed: 1 | 2)'), rel);
        }
    });

    suite.test('i18n：四語系都有首戰 x2 提示', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = JSON.parse(read(`assets/resources/i18n/${lang}.json`));
            assert.isTrue(typeof dict['ui.battle.tutorial.speed_x2'] === 'string' && dict['ui.battle.tutorial.speed_x2'].length > 0, lang);
        }
    });

    return suite;
}
