/**
 * AiDifficultyTable.test.ts — AI 難度表載入與驗證 headless 測試（AIS-01 / PROG-2-1314）
 *
 * 鎖住：實際的 ai-difficulty.json 含五個難度且全欄位可解析；縮放、SP 倍率、單挑閾值依規格；
 * 缺列或範圍外的值會回報錯誤且不產生表。
 *
 * Unity 對照：Difficulty 表的 OnValidate，缺列或超界就不讓遊戲載入。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { aiDifficultyEntryOf, parseAiDifficultyTable } from '../assets/scripts/core/systems/AiDifficultyTable';

function loadRawTable(): unknown {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function createAiDifficultyTableSuite(): TestSuite {
    const suite = new TestSuite('AiDifficultyTable (AI 難度表 AIS-01 / PROG-2-1314)');

    suite.test('實際資料檔含五個難度，全部解析通過', () => {
        const result = parseAiDifficultyTable(loadRawTable());
        assert.equals(0, result.errors.length);
        assert.isTrue(result.table !== null);
    });

    suite.test('屬性縮放、SP 倍率、單挑閾值與 IQ 依規格', () => {
        const table = parseAiDifficultyTable(loadRawTable()).table!;
        const hell = aiDifficultyEntryOf(table, 'hell');
        assert.equals(2.0, hell.statScale);
        assert.equals(1.5, hell.spGainModifier);
        assert.equals('PERFECT', hell.aiIq);
        assert.equals(2, hell.difficultyBonus);
        const easy = aiDifficultyEntryOf(table, 'easy');
        assert.equals(0.45, easy.duelAcceptThreshold);
        assert.isFalse(easy.canUseUltimate);
    });

    suite.test('缺列或範圍外的值回報錯誤，不產生表', () => {
        const raw = loadRawTable() as { difficulties: Array<Record<string, unknown>> };
        const missing = { difficulties: raw.difficulties.filter((row) => row.difficultyId !== 'hell') };
        const missingResult = parseAiDifficultyTable(missing);
        assert.isTrue(missingResult.table === null);
        assert.isTrue(missingResult.errors.some((e) => e.startsWith('hell')));

        const outOfRange = { difficulties: raw.difficulties.map((row) => (row.difficultyId === 'easy' ? { ...row, statScale: 3 } : row)) };
        const rangeResult = parseAiDifficultyTable(outOfRange);
        assert.isTrue(rangeResult.table === null);
        assert.isTrue(rangeResult.errors.some((e) => e.startsWith('easy') && e.includes('statScale')));
    });

    return suite;
}
