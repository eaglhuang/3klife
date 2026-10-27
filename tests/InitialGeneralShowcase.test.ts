/**
 * InitialGeneralShowcase.test.ts — 六位初始名將展示卡與登場台詞（PROG-2-1210，OPEN-06）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { INITIAL_SHOWCASE_ENTRIES, initialShowcaseEntries, initialShowcaseOf } from '../assets/scripts/core/systems/InitialGeneralShowcase';

const GENERALS_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'generals.json');
const LINE_MAX_CHARS = 40;

interface GeneralRow {
    id: string;
    name: string;
}

export function createInitialGeneralShowcaseSuite(): TestSuite {
    const suite = new TestSuite('InitialGeneralShowcase (PROG-2-1210 六位初始名將)');

    suite.test('六位名將依規格順序：張飛、魏延、夏侯惇、張郃、孫策、甘寧', () => {
        assert.equals('張飛,魏延,夏侯惇,張郃,孫策,甘寧', INITIAL_SHOWCASE_ENTRIES.map((e) => e.name).join(','));
    });

    suite.test('每位名將的 generalId 與名稱都能在 generals.json 對上', () => {
        const generals = JSON.parse(fs.readFileSync(GENERALS_PATH, 'utf8')) as GeneralRow[];
        for (const entry of INITIAL_SHOWCASE_ENTRIES) {
            const row = generals.find((g) => g.id === entry.generalId);
            assert.isTrue(row !== undefined);
            assert.equals(entry.name, row!.name);
        }
    });

    suite.test('每位名將都有非空台詞，且長度適合對話框', () => {
        for (const entry of INITIAL_SHOWCASE_ENTRIES) {
            assert.isTrue(entry.line.length > 0);
            assert.isTrue(entry.line.length <= LINE_MAX_CHARS);
        }
    });

    suite.test('每位名將都有稱號與至少三個因子標籤', () => {
        for (const entry of INITIAL_SHOWCASE_ENTRIES) {
            assert.isTrue(entry.title.length > 0);
            assert.isTrue(entry.factorTags.length >= 3);
        }
    });

    suite.test('每位名將有出生地，主因子是因子標籤之一', () => {
        for (const entry of INITIAL_SHOWCASE_ENTRIES) {
            assert.isTrue(entry.originRegion.length > 0);
            assert.isTrue(entry.factorTags.includes(entry.coreFactorTag));
        }
    });

    suite.test('依 generalId 查詢：六位內回傳資料，之外回傳 null', () => {
        assert.equals('孫策', initialShowcaseOf('sun-ce')!.name);
        assert.isTrue(initialShowcaseOf('cao-cao') === null);
    });

    suite.test('回傳的資料是複本，改動不會回寫到常數', () => {
        const entries = initialShowcaseEntries();
        (entries[0].factorTags as string[]).push('HACKED');
        assert.equals(3, INITIAL_SHOWCASE_ENTRIES[0].factorTags.length);
    });

    return suite;
}
