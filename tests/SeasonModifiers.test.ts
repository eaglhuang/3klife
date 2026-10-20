/**
 * 四季特色修正（TIME-08 / PROG-2-0812）
 *
 * 鎖住：預設表的四季數值、設定檔缺欄位與壞值的退回、設定檔與預設一致、
 * 秋季糧草倍率接到季末補給（且不超過上限）、冬季趕路與受孕加成的數值。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import {
    DEFAULT_SEASON_MODIFIERS,
    normalizeSeasonModifiers,
    seasonModifiersOf,
    setActiveSeasonModifiers,
} from '../assets/scripts/core/systems/SeasonModifiers';
import { FOOD_PER_SEASON, regenMilitaryOneSeason, type MilitaryReserve } from '../assets/scripts/core/systems/MilitaryReserve';

const CONFIG_PATH = path.join('assets', 'resources', 'data', 'season-modifiers.json');

function reserve(overrides: Partial<MilitaryReserve> = {}): MilitaryReserve {
    return { cityTroops: 100, cityTroopsCap: 200, recruitRegen: 10, food: 100, foodCap: 1000, ...overrides };
}

export function createSeasonModifiersSuite(): TestSuite {
    const suite = new TestSuite('SeasonModifiers (四季特色修正 TIME-08)');

    suite.test('預設表：夏建設 ×2、秋糧草 ×1.5、冬受孕 ×1.1 且趕路 +1，其餘為中性', () => {
        assert.equals(2, seasonModifiersOf(2).constructionMultiplier);
        assert.equals(1.5, seasonModifiersOf(3).foodMultiplier);
        assert.equals(1.1, seasonModifiersOf(4).conceptionMultiplier);
        assert.equals(1, seasonModifiersOf(4).travelTurnsDelta);
        assert.equals(1, seasonModifiersOf(1).taxMultiplier);
        assert.equals(0, seasonModifiersOf(1).travelTurnsDelta);
        assert.equals(1, seasonModifiersOf(2).conceptionMultiplier);
    });

    suite.test('設定檔與程式內預設一致（缺檔不影響遊戲）', () => {
        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        assert.equals(JSON.stringify(DEFAULT_SEASON_MODIFIERS), JSON.stringify(normalizeSeasonModifiers(raw)));
    });

    suite.test('舊檔或壞值：缺季、缺欄位、負數、非數字皆退回該欄預設', () => {
        const config = normalizeSeasonModifiers({
            seasons: {
                '4': { conceptionMultiplier: 'bad', travelTurnsDelta: 2 },
                '3': { foodMultiplier: -1 },
            },
        });
        assert.equals(1.1, config[4].conceptionMultiplier);
        assert.equals(2, config[4].travelTurnsDelta);
        assert.equals(1.5, config[3].foodMultiplier);
        assert.equals(2, config[2].constructionMultiplier);
        assert.equals(JSON.stringify(DEFAULT_SEASON_MODIFIERS), JSON.stringify(normalizeSeasonModifiers(null)));
    });

    suite.test('秋季補給：糧草 ×1.5 進帳，仍不超過糧草上限', () => {
        const normal = regenMilitaryOneSeason(reserve());
        assert.equals(100 + FOOD_PER_SEASON, normal.food);
        const autumn = regenMilitaryOneSeason(reserve(), 1, seasonModifiersOf(3).foodMultiplier);
        assert.equals(100 + Math.floor(FOOD_PER_SEASON * 1.5), autumn.food);
        const capped = regenMilitaryOneSeason(reserve({ food: 990 }), 1, 1.5);
        assert.equals(1000, capped.food);
    });

    suite.test('執行中的修正表：載入後換上，預設查詢跟著變，重設後回到預設', () => {
        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        const custom = normalizeSeasonModifiers({ seasons: { '4': { conceptionMultiplier: 1.5 } } });
        setActiveSeasonModifiers(custom);
        try {
            assert.equals(1.5, seasonModifiersOf(4).conceptionMultiplier);
        } finally {
            setActiveSeasonModifiers(normalizeSeasonModifiers(raw));
        }
        assert.equals(1.1, seasonModifiersOf(4).conceptionMultiplier);
    });

    return suite;
}
