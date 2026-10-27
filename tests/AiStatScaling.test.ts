/**
 * AiStatScaling.test.ts — AI 武將屬性、EP、精力與轉生次數縮放 headless 測試（AIS-02 / PROG-2-1315）
 *
 * 鎖住：章節修正（Ch1=1.0、每章 +0.1）、年齡修正（壯年 1.1 最強）、難度縮放相乘、
 * EP 亂數區間 0.9~1.1、精力與轉生上限（5）；並用實際的 ai-difficulty.json 驗證難度縮放值來源。
 *
 * Unity 對照：Stat Scaler 的單元測試，固定 Random seed（這裡是固定 roll），逐個係數驗算。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { parseAiDifficultyTable } from '../assets/scripts/core/systems/AiDifficultyTable';
import {
    aiChapterModifierOf,
    aiEpOf,
    aiReincarnationOf,
    aiStatOf,
    aiVitalityOf,
} from '../assets/scripts/core/systems/AiStatScaling';

const NORMAL = { statScale: 1.0, difficultyBonus: 0 };
const HARD = { statScale: 1.3, difficultyBonus: 1 };
const HELL = { statScale: 2.0, difficultyBonus: 2 };

export function createAiStatScalingSuite(): TestSuite {
    const suite = new TestSuite('AiStatScaling (AI 武將屬性縮放 AIS-02 / PROG-2-1315)');

    suite.test('章節修正：Ch1 為 1.0，之後每章 +0.1；章節小於 1 視為 Ch1', () => {
        assert.equals(1, aiChapterModifierOf(1));
        assert.equals(1.1, aiChapterModifierOf(2));
        assert.equals(1.2, aiChapterModifierOf(3));
        assert.equals(1.5, aiChapterModifierOf(6));
        assert.equals(1, aiChapterModifierOf(0));
    });

    suite.test('屬性 = 基礎值 × 難度 × 章節 × 年齡；壯年（巔峰）1.1 高於青年 1.0，少年與超齡較低', () => {
        assert.equals(143, aiStatOf(100, HARD, 1, 'Peak'));
        assert.equals(110, aiStatOf(100, NORMAL, 1, 'Peak'));
        assert.equals(100, aiStatOf(100, NORMAL, 1, 'Prime'));
        assert.equals(60, aiStatOf(100, NORMAL, 1, 'Youth'));
        assert.equals(50, aiStatOf(100, NORMAL, 1, 'Over'));
        assert.equals(100, aiStatOf(100, HELL, 1, 'Over'));
    });

    suite.test('章節越後屬性越高（同難度同年齡）', () => {
        const ch1 = aiStatOf(100, NORMAL, 1, 'Prime');
        const ch3 = aiStatOf(100, NORMAL, 3, 'Prime');
        assert.isTrue(ch3 > ch1);
        assert.equals(120, ch3);
    });

    suite.test('EP 亂數區間 0.9~1.1；roll 超出 0~1 時夾回', () => {
        assert.equals(90, aiEpOf(100, NORMAL, 0));
        assert.equals(100, aiEpOf(100, NORMAL, 0.5));
        assert.equals(110, aiEpOf(100, NORMAL, 1));
        assert.equals(90, aiEpOf(100, NORMAL, -3));
        assert.equals(110, aiEpOf(100, NORMAL, 9));
    });

    suite.test('精力 = 100 × 難度縮放；轉生次數 = min(5, floor(章節 / 3) + 難度加成)', () => {
        assert.equals(100, aiVitalityOf(NORMAL));
        assert.equals(200, aiVitalityOf(HELL));
        assert.equals(0, aiReincarnationOf(1, NORMAL));
        assert.equals(1, aiReincarnationOf(3, NORMAL));
        assert.equals(2, aiReincarnationOf(3, HARD));
        assert.equals(5, aiReincarnationOf(15, HELL));
        assert.equals(5, aiReincarnationOf(12, { difficultyBonus: 1 }));
    });

    suite.test('難度縮放取自實際的 ai-difficulty.json（HELL 為 2.0）', () => {
        const raw = JSON.parse(
            fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json'), 'utf8'),
        );
        const { table, errors } = parseAiDifficultyTable(raw);
        assert.isTrue(table !== null && errors.length === 0);
        assert.equals(200, aiStatOf(100, table!.hell, 1, 'Over') * 2);
        assert.equals(200, aiVitalityOf(table!.hell));
    });

    return suite;
}
