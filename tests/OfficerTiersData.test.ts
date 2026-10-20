/**
 * OfficerTiersData — 官職階位資料檔（OFC-01）的 headless 測試
 *
 * 鎖住：5 階齊全且代碼連續、晉升門檻對上規格 F-2（100 / 260 / 520 / 920）、
 * 每階都有解鎖代碼，且任務上限依序對應 basic → hell。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

interface OfficerTierRow {
    tier: number;
    code: string;
    title: string;
    expToReach: number;
    questCap: string;
    unlockedFeatures: string[];
}

interface OfficerTiersFile {
    version: number;
    tiers: OfficerTierRow[];
}

const DATA_PATH = path.resolve(__dirname, '..', 'assets/resources/data/officer-tiers.json');

export function createOfficerTiersDataSuite(): TestSuite {
    const suite = new TestSuite('OfficerTiersData (官職階位資料檔 OFC-01)');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as OfficerTiersFile;

    suite.test('資料檔為 5 階，階位與代碼連續', () => {
        assert.equals(5, data.tiers.length);
        data.tiers.forEach((row, index) => {
            assert.equals(index + 1, row.tier);
            assert.equals(`OFFICER_TIER_${index + 1}`, row.code);
        });
    });

    suite.test('晉升門檻對上規格 F-2：0 / 100 / 260 / 520 / 920', () => {
        const expected = [0, 100, 260, 520, 920];
        data.tiers.forEach((row, index) => {
            assert.equals(expected[index], row.expToReach);
        });
    });

    suite.test('每階都有名稱與至少一個解鎖代碼', () => {
        data.tiers.forEach((row) => {
            assert.isTrue(row.title.length > 0);
            assert.isTrue(row.unlockedFeatures.length > 0);
        });
    });

    suite.test('任務上限依階位由 basic 升到 hell', () => {
        const caps = data.tiers.map((row) => row.questCap);
        assert.equals('basic', caps[0]);
        assert.equals('hell', caps[4]);
        assert.equals(new Set(caps).size, caps.length);
    });

    return suite;
}
