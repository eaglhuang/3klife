/**
 * SeasonTexts.test.ts — 大廳季節文案（PROG-2-0730）headless 測試
 *
 * 鎖住：語系表查不到時，輸出與 GameClock.formatSeasonLabel 一致；語系表有值時採用語系表並代入年與季。
 */
import { assert, TestSuite } from './TestRunner';
import { formatSeasonLabel } from '../assets/scripts/core/systems/GameClock';
import { SEASON_DISPLAY_KEY, seasonDisplayText, seasonEffectHintText } from '../assets/scripts/ui/core/SeasonTexts';

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

    suite.test('季節效果提示：未查到語系表時退回 zh-TW，只列已接線效果', () => {
        const missingLookup = (key: string) => key;
        assert.equals('本季無特殊效果', seasonEffectHintText(missingLookup, 1));
        assert.equals('訓練體力消耗 ×1.25', seasonEffectHintText(missingLookup, 2));
        assert.equals('糧草補給 ×1.5', seasonEffectHintText(missingLookup, 3));
        assert.equals('趕路 +1 回合 · 受孕率 ×1.1', seasonEffectHintText(missingLookup, 4));
    });

    suite.test('季節效果提示：春季的稅收與夏季的建設尚未接線，不顯示', () => {
        const missingLookup = (key: string) => key;
        assert.isTrue(!seasonEffectHintText(missingLookup, 1).includes('稅'));
        assert.isTrue(!seasonEffectHintText(missingLookup, 2).includes('建設'));
    });

    suite.test('季節效果提示：語系表有值時採用語系表並代入數值', () => {
        const lookup = (key: string, ...args: string[]) => (key.startsWith('ui.season.effect.') ? `${key}:${args.join(',')}` : key);
        assert.equals('ui.season.effect.training:1.25', seasonEffectHintText(lookup, 2));
        assert.equals('ui.season.effect.none:', seasonEffectHintText(lookup, 1));
    });

    return suite;
}
