/**
 * GeneralWeapon.test.ts — PROG-2-9955 武將武器欄位：generals.json weapon 齊全且合法、
 * 除校正項外與改前（profile → 角色推算）一致、解析優先序與缺欄位退回。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildGeneralWeaponTable, resolveGeneralWeapon, weaponTemplateKeys } from '../assets/scripts/battle/shared/GeneralWeapon';
import { TestSuite, assert } from './TestRunner';

const root = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(root, 'assets/resources/data/generals.json'), 'utf8')) as Array<{ id: string; name: string; role?: string; weapon?: string }>;
const vfx = JSON.parse(readFileSync(join(root, 'assets/resources/data/attack-vfx.json'), 'utf8'));
const templateKeys = weaponTemplateKeys(vfx.generalTemplates);
const fallback = vfx.fallback as { weaponByRole: Record<string, string>; defaultWeapon: string };

/** 改前的推算：profile → 角色 → defaultWeapon（與舊版 resolveGeneralVfx 相同） */
function legacyWeapon(id: string, role?: string): string {
    const prof = vfx.generalProfiles[id];
    if (prof) return prof.weapon;
    return (role && fallback.weaponByRole[role]) || fallback.defaultWeapon;
}

/** PROG-2-9955 校正項：歷史典故改武器，其餘一律維持改前推算 */
const CORRECTIONS: Record<string, string> = {
    'zhang-fei': 'spear', // 丈八蛇矛
    'zhao-yun': 'spear', // 長槍
    'huang-zhong': 'bow', // 黃忠以弓箭聞名
};

export function createGeneralWeaponSuite(): TestSuite {
    const suite = new TestSuite('GeneralWeapon');

    suite.test('generals.json 每位武將都有 weapon，且值落在武器模板鍵內', () => {
        const missing = generals.filter(g => !g.weapon).map(g => g.id);
        assert.equals(0, missing.length, `缺 weapon：${missing.slice(0, 5).join(', ')}`);
        const bad = generals.filter(g => !templateKeys.includes(g.weapon as string)).map(g => `${g.id}=${g.weapon}`);
        assert.equals(0, bad.length, `不在模板表內：${bad.slice(0, 5).join(', ')}`);
    });

    suite.test('除校正項外，每位武將的武器與改前推算一致（攻擊風格不變）', () => {
        const diffs: string[] = [];
        for (const g of generals) {
            const expected = CORRECTIONS[g.id] ?? legacyWeapon(g.id, g.role);
            if (g.weapon !== expected) diffs.push(`${g.id}: ${g.weapon} != ${expected}`);
        }
        assert.equals(0, diffs.length, `非校正項有差異：${diffs.join('; ')}`);
    });

    suite.test('校正項存在於資料，且確實改為指定武器', () => {
        for (const [id, weapon] of Object.entries(CORRECTIONS)) {
            const g = generals.find(x => x.id === id);
            assert.isTrue(!!g, `找不到 ${id}`);
            assert.equals(weapon, g!.weapon as string, `${id} 校正後武器`);
        }
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
