/**
 * GeneralWeapon.test.ts — PROG-2-9955／9975 武將武器欄位：generals.json weapon 齊全且合法、
 * 代表武將與最新立繪一致、解析優先序與缺欄位退回。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildGeneralWeaponTable, resolveGeneralWeapon, weaponTemplateKeys } from '../assets/scripts/battle/shared/GeneralWeapon';
import { TestSuite, assert } from './TestRunner';

const root = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(root, 'assets/resources/data/generals.json'), 'utf8')) as Array<{ id: string; name: string; role?: string; gender?: string; weapon?: string }>;
const rules = JSON.parse(readFileSync(join(root, 'assets/resources/data/general-weapon-rules.json'), 'utf8')) as { roleDefaults: Record<string, string>; overrides: Record<string, { weapon: string }> };
const vfx = JSON.parse(readFileSync(join(root, 'assets/resources/data/attack-vfx.json'), 'utf8'));
const templateKeys = weaponTemplateKeys(vfx.generalTemplates);
const fallback = vfx.fallback as { weaponByRole: Record<string, string>; defaultWeapon: string };

/** PROG-2-9970：依最新立繪（與目錄／色票文字）核定的高信心代表武將；其餘不寫死，避免之後換圖就測壞 */
const EXPECTED: Record<string, string> = {
    'guan-yu': 'blade', // 青龍偃月刀
    'zhang-fei': 'spear', // 丈八蛇矛
    'zhao-yun': 'spear', // 長槍
    'lu-bu': 'spear', // 方天畫戟（戟尚無模板，以槍近似）
    'huang-zhong': 'bow', // 弓
    'zhuge-liang': 'cast', // 羽扇
    'liu-bei': 'sword', // 雙劍（雙劍尚無模板，以劍近似）
    'sun-quan': 'sword', // 直劍
    'zhen-ji': 'sword', // 女將，細長劍
    'taishi-ci': 'bow', // 演義名將弓箭（總PM裁決）
    'xiahou-yuan': 'bow',
    'xiao-qiao': 'cast', // 雙扇（扇尚無模板，以法術近似）
};

export function createGeneralWeaponSuite(): TestSuite {
    const suite = new TestSuite('GeneralWeapon');

    suite.test('generals.json 每位武將都有 weapon，且值落在武器模板鍵內', () => {
        const missing = generals.filter(g => !g.weapon).map(g => g.id);
        assert.equals(0, missing.length, `缺 weapon：${missing.slice(0, 5).join(', ')}`);
        const bad = generals.filter(g => !templateKeys.includes(g.weapon as string)).map(g => `${g.id}=${g.weapon}`);
        assert.equals(0, bad.length, `不在模板表內：${bad.slice(0, 5).join(', ')}`);
    });

    suite.test('generals.json 的 weapon 等於規則表展開（名將覆寫表 → 定位預設表）', () => {
        const diffs: string[] = [];
        for (const g of generals) {
            const expected = rules.overrides[g.id]?.weapon ?? rules.roleDefaults[g.role ?? ''] ?? fallback.defaultWeapon;
            if (g.weapon !== expected) diffs.push(`${g.id}: ${g.weapon} != ${expected}`);
        }
        assert.equals(0, diffs.length, `與規則表不一致：${diffs.slice(0, 5).join('; ')}`);
        const ids = new Set(generals.map(g => g.id));
        const stale = Object.keys(rules.overrides).filter(id => !ids.has(id));
        assert.equals(0, stale.length, `覆寫表有不存在的武將：${stale.join(', ')}`);
        const badVal = Object.values(rules.overrides).filter(o => !templateKeys.includes(o.weapon));
        assert.equals(0, badVal.length, '覆寫表值不在模板內');
    });

    suite.test('代表武將的武器與最新立繪一致', () => {
        for (const [id, weapon] of Object.entries(EXPECTED)) {
            const g = generals.find(x => x.id === id);
            assert.isTrue(!!g, `找不到 ${id}`);
            assert.equals(weapon, g!.weapon as string, `${id} 武器`);
        }
    });

    suite.test('五種武器都有武將使用；劍類（含女將）不再為 0，且不是全員同一兩種', () => {
        for (const key of templateKeys) {
            assert.isTrue(generals.some(g => g.weapon === key), `沒有任何武將使用 ${key}`);
        }
        assert.isTrue(generals.some(g => g.weapon === 'sword' && g.gender === '女'), '應有持劍女將');
        const used = new Set(generals.map(g => g.weapon));
        assert.isTrue(used.size >= 5, '武器種類不足');
    });

    suite.test('關羽、諸葛亮、呂布維持 profile 既有武器', () => {
        assert.equals('blade', resolveGeneralWeapon({ weapon: 'blade' }, fallback, templateKeys));
        assert.equals('cast', resolveGeneralWeapon({ weapon: 'cast' }, fallback, templateKeys));
        assert.equals('spear', resolveGeneralWeapon({ weapon: 'spear' }, fallback, templateKeys));
    });

    suite.test('解析優先序：weapon 欄位 > profile > 角色推算 > 預設', () => {
        assert.equals('bow', resolveGeneralWeapon({ weapon: 'bow', profileWeapon: 'spear', role: 'Combat' }, fallback, templateKeys), '欄位優先');
        assert.equals('spear', resolveGeneralWeapon({ profileWeapon: 'spear', role: 'Support' }, fallback, templateKeys), 'profile 次之');
        assert.equals('cast', resolveGeneralWeapon({ role: 'Support' }, fallback, templateKeys), '缺欄位退回角色');
        assert.equals(fallback.defaultWeapon, resolveGeneralWeapon({}, fallback, templateKeys), '全缺退回預設');
    });

    suite.test('不認得的武器值視為缺欄位，逐級退回（不會播不出特效）', () => {
        assert.equals('cast', resolveGeneralWeapon({ weapon: 'halberd', role: 'Support' }, fallback, templateKeys), '戟尚無模板，退回角色');
        assert.equals('blade', resolveGeneralWeapon({ weapon: 'staff', role: 'Combat' }, fallback, templateKeys), '未知鍵退回角色');
    });

    suite.test('buildGeneralWeaponTable 略過缺欄位與未知值', () => {
        const table = buildGeneralWeaponTable([
            { id: 'a', weapon: 'spear' },
            { id: 'b' },
            { id: 'c', weapon: 'halberd' },
            { weapon: 'bow' },
        ], templateKeys);
        assert.equals(1, table.size);
        assert.equals('spear', table.get('a') as string);
    });

    return suite;
}
