/**
 * lore id 對齊（PROG-2-0417）
 *
 * 規則：id 以 base 為準；別名與棄用由 lore-id-aliases.json 指定；lore 條目只新增欄位，不刪除。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveLoreMap } = require('../tools_node/lore-id-resolver.js') as {
    resolveLoreMap: (list: Array<Record<string, unknown>>, doc?: Record<string, unknown>) => Map<string, Record<string, unknown>>;
};

const MASTER = 'assets/resources/data/master';
const readJson = (p: string): any => JSON.parse(fs.readFileSync(p, 'utf8'));

export function createLoreIdAlignmentSuite(): TestSuite {
    const suite = new TestSuite('LoreIdAlignment (lore id 對齊 PROG-2-0417)');

    suite.test('解析：別名把舊 id 指向 base id', () => {
        const map = resolveLoreMap([{ id: 'old-id', historicalAnecdote: 'x' }], { aliases: { 'old-id': 'new-id' } });
        assert.isTrue(map.has('new-id'));
        assert.isFalse(map.has('old-id'));
        assert.equals('new-id', map.get('new-id')!.id as string);
    });

    suite.test('解析：棄用條目略過', () => {
        const map = resolveLoreMap([{ id: 'dup', historicalAnecdote: 'x' }], { deprecated: { dup: '重複' } });
        assert.equals(0, map.size);
    });

    suite.test('解析：同一 base id 時真實內容優先於 draft，與順序無關', () => {
        const draftFirst = resolveLoreMap([
            { id: 't', historicalAnecdote: '模板', draft: true },
            { id: 'r', historicalAnecdote: '真實' },
        ], { aliases: { r: 't' } });
        assert.equals('真實', draftFirst.get('t')!.historicalAnecdote as string);

        const realFirst = resolveLoreMap([
            { id: 'r', historicalAnecdote: '真實' },
            { id: 't', historicalAnecdote: '模板', draft: true },
        ], { aliases: { r: 't' } });
        assert.equals('真實', realFirst.get('t')!.historicalAnecdote as string);
    });

    suite.test('資料：別名與棄用清單的 key 都存在於 lore 主檔，別名目標都存在於 base', () => {
        const lore = readJson(`${MASTER}/generals-lore.json`).data as Array<{ id: string; deprecated?: boolean }>;
        const base = readJson(`${MASTER}/generals-base.json`).data as Array<{ id: string }>;
        const aliasDoc = readJson(`${MASTER}/lore-id-aliases.json`);
        const loreIds = new Set(lore.map(x => x.id));
        const baseIds = new Set(base.map(x => x.id));
        for (const [from, to] of Object.entries(aliasDoc.aliases as Record<string, string>)) {
            assert.isTrue(loreIds.has(from), `別名來源不存在: ${from}`);
            assert.isTrue(baseIds.has(to), `別名目標不在 base: ${to}`);
        }
        for (const id of Object.keys(aliasDoc.deprecated as Record<string, string>)) {
            assert.isTrue(loreIds.has(id), `棄用 id 不存在: ${id}`);
            const entry = lore.find(x => x.id === id)!;
            assert.isTrue(entry.deprecated === true, `棄用條目未標 deprecated: ${id}`);
        }
    });

    suite.test('資料：解析後每位 base 武將都有 lore，且無重複 id', () => {
        const lore = readJson(`${MASTER}/generals-lore.json`).data as Array<{ id: string }>;
        const base = readJson(`${MASTER}/generals-base.json`).data as Array<{ id: string }>;
        const aliasDoc = readJson(`${MASTER}/lore-id-aliases.json`);
        const ids = lore.map(x => x.id);
        assert.equals(ids.length, new Set(ids).size, '原始 lore 有重複 id');
        const resolved = resolveLoreMap(lore, aliasDoc);
        const missing = base.filter(g => !resolved.has(g.id)).map(g => g.id);
        assert.equals(0, missing.length, `缺 lore: ${missing.join(',')}`);
    });

    suite.test('資料：lore 主檔只增不減（不少於 235 筆，且含 PROG-2-0417 之前的所有 id）', () => {
        const lore = readJson(`${MASTER}/generals-lore.json`).data as Array<{ id: string }>;
        assert.isTrue(lore.length >= 235, `lore 條目數少於 235：${lore.length}`);
        assert.isTrue(lore.some(x => x.id === 'cao-cao-pi'), '舊 id cao-cao-pi 不應被刪除');
    });

    return suite;
}
