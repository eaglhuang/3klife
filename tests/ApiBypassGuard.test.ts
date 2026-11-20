/**
 * ApiBypassGuard.test.ts — check-api-bypass 偵測器與棘輪比較（PROG-2-9201；總綱 doc_spec_1182 §5.10）
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const guard = require('../tools_node/check-api-bypass.js') as {
    scanSource(source: string): Record<string, number>;
    compare(current: Record<string, Record<string, number>>, baseline: { perFile: Record<string, Record<string, number>> }): { increases: unknown[]; decreases: unknown[] };
};

export function createApiBypassGuardSuite(): TestSuite {
    const suite = new TestSuite('ApiBypassGuard (防繞過共通 API 棘輪 PROG-2-9201)');

    suite.test('偵測庫存寫入、貨幣寫入、localStorage、受保護欄位賦值、存檔後端', () => {
        const counts = guard.scanSource([
            'session.addItem(ITEM_X, 1, "SHOP");',
            'this._inventory = consumeItem(this._inventory, id, 1);',
            'gacha.spendCurrency("gems", 10);',
            'sys.localStorage.setItem("k", "v");',
            'this._fame += 5;',
            'const s = new PlayerSaveService(adapter);',
        ].join('\n'));
        assert.equals(2, counts['inventory-write']);
        assert.equals(1, counts['currency-write']);
        assert.equals(1, counts['local-storage']);
        assert.equals(2, counts['protected-assign']);
        assert.equals(1, counts['save-write']);
    });

    suite.test('註解、字串內的文字、函式與方法定義、介面簽名都不算繞過點', () => {
        const counts = guard.scanSource([
            '// session.addItem(ITEM_X, 1);',
            '/* gacha.spendCurrency("gems", 1); */',
            'const text = "請勿呼叫 addItem( 與 localStorage";',
            'export function addItem(inv: Inv, id: string, n: number): Inv { return inv; }',
            'public async addItem(itemId: string, quantity: number): Promise<void> {',
            '    spendCurrency(currencyKey: string, amount: number): boolean;',
        ].join('\n'));
        assert.equals(0, Object.keys(counts).length);
    });

    suite.test('呼叫端寫在 lambda 裡仍會被算到（spendGold: (n) => gacha.spendCurrency(...)）', () => {
        const counts = guard.scanSource('spendGold: (amount) => gacha.spendCurrency("gold", amount),');
        assert.equals(1, counts['currency-write']);
    });

    suite.test('棘輪：新增或增加視為 increases，減少視為 decreases，持平無事', () => {
        const baseline = { perFile: { 'ui/A.ts': { 'currency-write': 2 }, 'ui/B.ts': { 'local-storage': 1 } } };
        const same = guard.compare({ 'ui/A.ts': { 'currency-write': 2 }, 'ui/B.ts': { 'local-storage': 1 } }, baseline);
        assert.equals(0, same.increases.length + same.decreases.length);
        const worse = guard.compare({ 'ui/A.ts': { 'currency-write': 3 }, 'ui/C.ts': { 'inventory-write': 1 }, 'ui/B.ts': { 'local-storage': 1 } }, baseline);
        assert.equals(2, worse.increases.length);
        const better = guard.compare({ 'ui/A.ts': { 'currency-write': 1 } }, baseline);
        assert.equals(0, better.increases.length);
        assert.equals(2, better.decreases.length);
    });

    suite.test('目前的專案程式通過棘輪（node tools_node/check-api-bypass.js exit 0）', () => {
        const script = path.join(__dirname, '..', 'tools_node', 'check-api-bypass.js');
        const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });
        assert.equals(0, run.status ?? -1, run.stderr);
    });

    return suite;
}
