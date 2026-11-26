/**
 * FactionDisplay.test.ts — 武將列表陣營欄顯示（PROG-2-1642）
 */
import { TestSuite, assert } from './TestRunner';
import { factionDisplayName, rosterFactionDisplayName } from '../assets/scripts/ui/core/FactionDisplay';

export function createFactionDisplaySuite(): TestSuite {
    const suite = new TestSuite('FactionDisplay (陣營顯示名稱 PROG-2-1642)');
    suite.test('三國陣營與敵我代碼轉中文，未知原樣、空值破折號', () => {
        assert.equals('蜀,魏,吳,群,敵軍', ['shu', 'wei', 'wu', 'neutral', 'enemy'].map(factionDisplayName).join(','));
        assert.equals('jin', factionDisplayName('jin'));
        assert.equals('—', factionDisplayName(undefined));
    });
    suite.test('名冊列表陣營欄：模板 enemy 標記改標「在野」，其餘照舊（PROG-2-10115）', () => {
        assert.equals('在野', rosterFactionDisplayName('enemy'));
        assert.equals('蜀,魏,吳,群,我軍,—', ['shu', 'wei', 'wu', 'neutral', 'player', undefined].map(rosterFactionDisplayName).join(','));
        assert.equals('敵軍', factionDisplayName('enemy'));
    });
    return suite;
}
