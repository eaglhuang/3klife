/**
 * DeployHoverCell.test.ts — 拖曳部署時懸停格綠色高亮（主戰場UI規格書 §3.3，PROG-2-1880）
 *
 * Unity 對照：DeployGridHighlighter 依游標所在格切換 Selected overlay。
 */
import { deployCellStyle } from '../assets/scripts/battle/shared/DeployCellHint';
import { TestSuite, assert } from './TestRunner';

export function createDeployHoverCellSuite(): TestSuite {
    const suite = new TestSuite('DeployHoverCell (拖曳懸停格高亮 PROG-2-1880)');

    suite.test('可部署格被懸停時改用選中高亮', () => {
        assert.equals('selected', deployCellStyle('open', true));
    });

    suite.test('可部署格沒被懸停時維持一般綠色', () => {
        assert.equals('open', deployCellStyle('open', false));
    });

    suite.test('被占或被擋的格子懸停時仍是紅色', () => {
        assert.equals('blocked', deployCellStyle('blocked', true));
        assert.equals('blocked', deployCellStyle('blocked', false));
    });

    return suite;
}
