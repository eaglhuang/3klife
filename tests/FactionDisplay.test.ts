/**
 * FactionDisplay.test.ts — 武將列表陣營欄顯示（PROG-2-1642）
 */
import { TestSuite, assert } from './TestRunner';
import { factionDisplayName } from '../assets/scripts/ui/core/FactionDisplay';

export function createFactionDisplaySuite(): TestSuite {
    const suite = new TestSuite('FactionDisplay (陣營顯示名稱 PROG-2-1642)');
    suite.test('三國陣營與敵我代碼轉中文，未知原樣、空值破折號', () => {
        assert.equals('蜀,魏,吳,群,敵軍', ['shu', 'wei', 'wu', 'neutral', 'enemy'].map(factionDisplayName).join(','));
        assert.equals('jin', factionDisplayName('jin'));
        assert.equals('—', factionDisplayName(undefined));
    });
    return suite;
}
