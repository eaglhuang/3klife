/**
 * AwakeningReveal.test.ts — 戰後覺醒結算窗揭示（PROG-2-1133）
 */
import { TestSuite, assert } from './TestRunner';
import { formatAwakeningReveal } from '../assets/scripts/battle/views/AwakeningReveal';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

export function createAwakeningRevealSuite(): TestSuite {
    const suite = new TestSuite('AwakeningReveal (戰後覺醒揭示 PROG-2-1133)');

    suite.test('每個覺醒一行鎖頭碎裂；無覺醒回空陣列', () => {
        assert.equals(0, formatAwakeningReveal([]).length);
        const lines = formatAwakeningReveal([{ displayName: '武勇 Lv2' }, { displayName: '鐵壁' }]);
        assert.equals(2, lines.length);
        assert.equals('🔓 鎖頭碎裂！【覺醒】武勇 Lv2', lines[0]);
    });

    suite.test('戰場結算接到結算窗追加行', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
        assert.isTrue(src.includes('formatAwakeningReveal(settlement.awakenings)'));
        assert.isTrue(src.includes('appendDetails'));
    });

    return suite;
}
