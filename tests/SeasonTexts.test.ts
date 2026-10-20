/**
 * SeasonTexts.test.ts — 大廳季節文案（PROG-2-0730）headless 測試
 *
 * 鎖住：語系表查不到時，輸出與 GameClock.formatSeasonLabel 一致；語系表有值時採用語系表並代入年與季。
 */
import { assert, TestSuite } from './TestRunner';
import { formatSeasonLabel } from '../assets/scripts/core/systems/GameClock';
import { SEASON_DISPLAY_KEY, seasonDisplayText } from '../assets/scripts/ui/core/SeasonTexts';

export function createSeasonTextsSuite(): TestSuite {
    const suite = new TestSuite('SeasonTexts (大廳季節文案 PROG-2-0730)');

    suite.test('語系表查不到時與 formatSeasonLabel 一致', () => {
        const missingLookup = (key: string) => key;
        for (const [currentYear, currentSeason] of [[1, 1], [2, 3], [12, 4]] as const) {
            const state = { currentYear, currentSeason };
            assert.equals(formatSeasonLabel(state), seasonDisplayText(missingLookup, state));
        }
    });

    suite.test('語系表有值時採用語系表並代入年與季', () => {
        const lookup = (key: string, ...args: string[]) => (key === SEASON_DISPLAY_KEY ? `Year ${args[0]} Season ${args[1]}` : key);
        assert.equals('Year 2 Season 3', seasonDisplayText(lookup, { currentYear: 2, currentSeason: 3 }));
    });

    return suite;
}
