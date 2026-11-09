/**
 * BloodlineVisualTable — 血脈視覺對照表（BVC-02／BSS-04）的 headless 測試
 *
 * 鎖住：資料檔涵蓋六色與八種插槽、佔位圖真的存在、沒有專屬圖時退回佔位圖、壞資料會被擋下。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    BLOODLINE_SLOT_IDS,
    factorVisualOf,
    parseBloodlineVisualTable,
    prioritySlotsFor,
    slotUiOf,
    type BloodlineVisualTable,
} from '../assets/scripts/core/systems/BloodlineVisualTable';
import { ALL_FACTOR_COLORS } from '../assets/scripts/core/systems/FactorInheritance';

const ROOT = path.resolve(__dirname, '..', 'assets/resources');
const readRaw = (): Record<string, any> => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/bloodline-visual-table.json'), 'utf8'));
const readTable = (): BloodlineVisualTable => readRaw() as unknown as BloodlineVisualTable;

export function createBloodlineVisualTableSuite(): TestSuite {
    const suite = new TestSuite('BloodlineVisualTable');

    suite.test('資料檔通過驗證，涵蓋六色與八種插槽', () => {
        const result = parseBloodlineVisualTable(readRaw());
        assert.equals(true, result.ok, result.ok ? '' : result.issues.join('；'));
        assert.equals(6, ALL_FACTOR_COLORS.length);
        assert.equals(8, readTable().slots.length);
    });

    suite.test('佔位圖路徑對應的圖檔都存在', () => {
        for (const sprite of Object.values(readTable().placeholder)) {
            assert.equals(true, fs.existsSync(path.join(ROOT, `${sprite}.png`)), sprite);
        }
    });

    suite.test('六色靈獸依 doc_spec_0670 §1', () => {
        const table = readTable();
        const rows = ALL_FACTOR_COLORS.map((color) => `${color}:${table.factors[color].beastFamily}`);
        assert.equals(
            ['blue:玄武', 'pink:朱雀', 'green:麒麟', 'white:白虎', 'red:青龍', 'purple:應龍'].sort().join(),
            rows.sort().join(),
        );
    });

    suite.test('缺少三層材質會被擋下', () => {
        const missing = readRaw();
        delete missing.materialLayers.inlay;
        assert.equals(false, parseBloodlineVisualTable(missing).ok);
    });

    suite.test('任一顏色缺欄或跨色重複都會被擋下', () => {
        const missing = readRaw();
        delete missing.factors.red.beastFamily;
        assert.equals(false, parseBloodlineVisualTable(missing).ok);
        const duplicated = readRaw();
        duplicated.factors.red.pattern = duplicated.factors.blue.pattern;
        assert.equals(false, parseBloodlineVisualTable(duplicated).ok);
    });

    suite.test('插槽缺項、換序或層級不符都會被擋下', () => {
        const missing = readRaw();
        missing.slots.pop();
        assert.equals(false, parseBloodlineVisualTable(missing).ok);
        const swapped = readRaw();
        swapped.slots.reverse();
        assert.equals(false, parseBloodlineVisualTable(swapped).ok);
        const tier = readRaw();
        tier.slots[0].tier = 'extended';
        assert.equals(false, parseBloodlineVisualTable(tier).ok);
        assert.equals(false, parseBloodlineVisualTable(null).ok);
    });

    suite.test('因子視覺查詢：未知色回 null', () => {
        const table = readTable();
        assert.equals(table.factors.blue.pattern, factorVisualOf(table, 'blue')!.pattern);
        assert.equals(null, factorVisualOf(table, 'gold'));
        assert.equals(null, factorVisualOf(table, undefined));
    });

    suite.test('沒有專屬圖時每個插槽都退回佔位圖，有專屬圖才覆蓋', () => {
        const table = readTable();
        for (const id of BLOODLINE_SLOT_IDS) {
            assert.equals(table.placeholder.crest, slotUiOf(table, id).crest);
        }
        assert.equals(table.placeholder.icon, slotUiOf(table, 'UNKNOWN').icon);
        const custom = { ...table, slots: table.slots.map((s) => (s.id === 'CHEST_CORE' ? { ...s, ui: { crest: 'sprites/x' } } : s)) };
        assert.equals('sprites/x', slotUiOf(custom, 'CHEST_CORE').crest);
        assert.equals(table.placeholder.badge, slotUiOf(custom, 'CHEST_CORE').badge);
    });

    suite.test('優先強化的插槽符合契約落地原則', () => {
        const table = readTable();
        assert.equals('CHEST_CORE,WAIST_CORE,SHOULDER_CLASP,WEAPON_CHARM', prioritySlotsFor(table, 'male').join());
        assert.equals('CHEST_CORE,WAIST_CORE,HAIR_ORNAMENT,JADE_PENDANT,SHOULDER_CLASP', prioritySlotsFor(table, 'female').join());
    });

    return suite;
}
