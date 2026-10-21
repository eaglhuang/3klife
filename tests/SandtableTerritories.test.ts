/**
 * SandtableTerritories.test.ts — 沙盤領地清單的驗證與資料檔一致性（PROG-2-0965）
 *
 * 鎖住：十三州內建清單、資料檔與內建清單一致、格式錯誤（非拼音、重複、空 nameKey）會被擋下。
 *
 * Unity 對照：ScriptableObject 的 OnValidate 測試，格式錯就不套用。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    isSandtableTerritory,
    parseSandtableTerritories,
    sandtableTerritories,
} from '../assets/scripts/core/systems/SandtableTerritories';

export function createSandtableTerritoriesSuite(): TestSuite {
    const suite = new TestSuite('SandtableTerritories (沙盤領地 PROG-2-0965)');

    suite.test('內建清單為東漢十三州，且可用 id 查到', () => {
        assert.equals(13, sandtableTerritories().length);
        assert.isTrue(isSandtableTerritory('sili'));
        assert.isFalse(isSandtableTerritory('luoyang'));
    });

    suite.test('資料檔的 id 與內建清單完全一致', () => {
        const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'sandtable-territories.json');
        const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
        const result = parseSandtableTerritories(raw);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(sandtableTerritories().map(t => t.id).join(','), result.rows.map(t => t.id).join(','));
    });

    suite.test('格式錯誤會被擋下：非拼音、重複、空名稱鍵、缺陣列', () => {
        assert.isFalse(parseSandtableTerritories({ territories: [{ id: 'Sili', nameKey: 'k' }] }).ok);
        assert.isFalse(parseSandtableTerritories({ territories: [{ id: 'yu', nameKey: 'k' }, { id: 'yu', nameKey: 'k2' }] }).ok);
        assert.isFalse(parseSandtableTerritories({ territories: [{ id: 'yu', nameKey: '' }] }).ok);
        assert.isFalse(parseSandtableTerritories({}).ok);
        assert.isFalse(parseSandtableTerritories({ territories: [] }).ok);
    });

    return suite;
}
