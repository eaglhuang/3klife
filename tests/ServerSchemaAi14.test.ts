/**
 * ServerSchemaAi14.test.ts — battle_ai_log 列驗證（AIS-14）
 *
 * 鎖住：合法列通過；難度、結果列舉外的值擋下；自適應倍率超出 0.7~2.5 擋下；
 * 非負整數欄位不接受負數或小數。
 *
 * Unity 對照：像存檔前的欄位檢查，列舉欄位只能是下拉選單的值。
 */
import { assert, TestSuite } from './TestRunner';
import { validateBattleAiLogRow, type BattleAiLogRow } from '../server/schema/ai14-row-validators';

function validRow(): BattleAiLogRow {
    return {
        battle_ai_log_id: 'ai-log-0001',
        player_id: 'player-1',
        chapter_id: 3,
        difficulty: 'HARD',
        ai_template_id: 'AI_LVBU',
        ai_power_score: 1200,
        player_power_score: 1100,
        result: 'WIN',
        adaptive_scale: 1.1,
        turns: 12,
        created_at: '2026-10-28T08:00:00Z',
    };
}

export function createServerSchemaAi14Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaAi14 (battle_ai_log 列驗證 AIS-14)');

    suite.test('合法列沒有問題', () => {
        assert.equals(0, validateBattleAiLogRow(validRow()).length);
    });

    suite.test('難度與結果不在列舉內會被擋下', () => {
        const issues = validateBattleAiLogRow({ ...validRow(), difficulty: 'hard', result: 'TIE' });
        assert.isTrue(issues.some(i => i.path === 'difficulty'));
        assert.isTrue(issues.some(i => i.path === 'result'));
    });

    suite.test('自適應倍率超出 0.7~2.5 會被擋下', () => {
        assert.isTrue(validateBattleAiLogRow({ ...validRow(), adaptive_scale: 0.69 }).some(i => i.path === 'adaptive_scale'));
        assert.isTrue(validateBattleAiLogRow({ ...validRow(), adaptive_scale: 2.51 }).some(i => i.path === 'adaptive_scale'));
        assert.equals(0, validateBattleAiLogRow({ ...validRow(), adaptive_scale: 2.5 }).length);
    });

    suite.test('戰力與回合數不接受負數或小數', () => {
        assert.isTrue(validateBattleAiLogRow({ ...validRow(), ai_power_score: -1 }).some(i => i.path === 'ai_power_score'));
        assert.isTrue(validateBattleAiLogRow({ ...validRow(), turns: 1.5 }).some(i => i.path === 'turns'));
    });

    return suite;
}
