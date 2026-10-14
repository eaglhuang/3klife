/**
 * build-generals-runtime.js 的欄位保留（PROG-2-0418）
 *
 * 規則：白名單欄位以 master 為準；白名單外與 undefined 的既有欄位從 legacy 保留，建置不丟欄位。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildRuntimeRecord } = require('../tools_node/build-generals-runtime.js') as {
    buildRuntimeRecord: (base: Record<string, unknown>, lore: Record<string, unknown>, story: Record<string, unknown>, legacy: Record<string, unknown>) => Record<string, unknown>;
};

const MASTER = 'assets/resources/data/master';
const BASE_ONE = { id: 't', name: '甲', faction: 'wei', str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50, ep: 50, role: 'Combat', gender: '男' };

export function createBuildGeneralsRuntimeSuite(): TestSuite {
    const suite = new TestSuite('BuildGeneralsRuntime (欄位保留 PROG-2-0418)');

    suite.test('白名單外的 legacy 欄位會保留（originRegion、element、introLine）', () => {
        const r = buildRuntimeRecord(BASE_ONE, {}, {}, { originRegion: '沛郡', element: 'metal', introLine: '治世之能臣' });
        assert.equals('沛郡', r.originRegion as string);
        assert.equals('metal', r.element as string);
        assert.equals('治世之能臣', r.introLine as string);
    });

    suite.test('白名單欄位以 master 為準，legacy 不覆寫', () => {
        const r = buildRuntimeRecord(BASE_ONE, {}, {}, { name: '舊名', str: 1 });
        assert.equals('甲', r.name as string);
        assert.equals(50, r.str as number);
    });

    suite.test('白名單欄位在 master 為 undefined 時，從 legacy 補值', () => {
        const r = buildRuntimeRecord(BASE_ONE, {}, {}, { rarityTier: 'rare' });
        assert.equals('rare', r.rarityTier as string);
    });

    suite.test('回歸：以目前提交的 generals.json 為 legacy，重建後每筆的欄位都是超集', () => {
        const legacy = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8'));
        const legacyList = (Array.isArray(legacy) ? legacy : legacy.data) as Array<Record<string, unknown>>;
        const base = JSON.parse(fs.readFileSync(`${MASTER}/generals-base.json`, 'utf8')).data as Array<Record<string, unknown>>;
        const lore = JSON.parse(fs.readFileSync(`${MASTER}/generals-lore.json`, 'utf8')).data as Array<Record<string, unknown>>;
        const loreById = new Map(lore.map(x => [x.id as string, x]));
        const legacyById = new Map(legacyList.map(x => [x.id as string, x]));
        const dropped: string[] = [];
        for (const b of base) {
            const old = legacyById.get(b.id as string);
            if (!old) continue;
            const rebuilt = buildRuntimeRecord(b, loreById.get(b.id as string) || {}, {}, old);
            for (const key of Object.keys(old)) {
                if (rebuilt[key] === undefined) dropped.push(`${b.id}.${key}`);
            }
        }
        assert.equals(0, dropped.length, `仍丟失欄位: ${dropped.slice(0, 10).join(', ')}`);
    });

    return suite;
}
