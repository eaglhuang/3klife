/**
 * AiDeployCount.test.ts — AI 每回合部署數（AIS-05 第一段 / PROG-2-1324）
 *
 * 鎖住：min(3, 1 + floor(回合/5) + 難度加成)；每 5 回合 +1；上限 3；回合小於 1 視為 0；
 * 難度加成以實際難度表為準（EASY 0、NORMAL 0、HARD 1、NIGHTMARE 1、HELL 2）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { getAIDeployCount } from '../assets/scripts/core/systems/AiDeployCount';
import { parseAiDifficultyTable } from '../assets/scripts/core/systems/AiDifficultyTable';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');

export function createAiDeployCountSuite(): TestSuite {
    const suite = new TestSuite('AiDeployCount (AI 每回合部署數 AIS-05 / PROG-2-1324)');
    const normal = { difficultyBonus: 0 };

    suite.test('每 5 回合增加 1：第 1~4 回合 1 支，第 5~9 回合 2 支，第 10 回合起 3 支', () => {
        assert.equals(1, getAIDeployCount(normal, 1));
        assert.equals(1, getAIDeployCount(normal, 4));
        assert.equals(2, getAIDeployCount(normal, 5));
        assert.equals(2, getAIDeployCount(normal, 9));
        assert.equals(3, getAIDeployCount(normal, 10));
    });

    suite.test('上限 3：回合再多也不超過 3', () => {
        assert.equals(3, getAIDeployCount(normal, 100));
    });

    suite.test('難度加成直接加上：HARD（+1）第 1 回合就 2 支，HELL（+2）第 1 回合 3 支（已達上限）', () => {
        assert.equals(2, getAIDeployCount({ difficultyBonus: 1 }, 1));
        assert.equals(3, getAIDeployCount({ difficultyBonus: 2 }, 1));
    });

    suite.test('回合小於 1 視為 0：第 0 回合與負數回合都是 1 支基礎部署', () => {
        assert.equals(1, getAIDeployCount(normal, 0));
        assert.equals(1, getAIDeployCount(normal, -3));
    });

    suite.test('與實際難度表一致：各難度加成套用後，結果符合規格 F-2', () => {
        const { table, errors } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
        assert.isTrue(table !== null && errors.length === 0);
        assert.equals(1, getAIDeployCount(table!.easy, 1));
        assert.equals(1, getAIDeployCount(table!.normal, 1));
        assert.equals(2, getAIDeployCount(table!.hard, 1));
        assert.equals(2, getAIDeployCount(table!.nightmare, 1));
        assert.equals(3, getAIDeployCount(table!.hell, 1));
    });

    return suite;
}
