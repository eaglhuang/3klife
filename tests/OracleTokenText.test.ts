/**
 * OracleTokenText.test.ts — 結緣面板求籤令數量與底部占卜入口（ORAC-05，PROG-2-1140）headless 測試
 *
 * 鎖住：求籤令標籤格式、負數與非有限數當 0、小數捨去；結緣版面有數量標籤，占卜入口在底部。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { oracleTokenText } from '../assets/scripts/ui/core/BondingSetupController';

function layoutNodes(): Array<Record<string, any>> {
    const file = path.join(__dirname, '../assets/resources/ui-spec/layouts/bonding-setup-main.json');
    const flat: Array<Record<string, any>> = [];
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.id === 'string') flat.push(node);
        for (const child of node.children ?? []) walk(child);
    };
    walk(JSON.parse(fs.readFileSync(file, 'utf8')).root);
    return flat;
}

export function createOracleTokenTextSuite(): TestSuite {
    const suite = new TestSuite('OracleTokenText (求籤令數量與占卜入口 ORAC-05 PROG-2-1140)');

    suite.test('求籤令標籤顯示數量', () => {
        assert.equals('求籤令 ×3', oracleTokenText(3));
        assert.equals('求籤令 ×0', oracleTokenText(0));
    });

    suite.test('負數、非有限數當 0，小數捨去', () => {
        assert.equals('求籤令 ×0', oracleTokenText(-2));
        assert.equals('求籤令 ×0', oracleTokenText(Number.NaN));
        assert.equals('求籤令 ×0', oracleTokenText(Number.POSITIVE_INFINITY));
        assert.equals('求籤令 ×2', oracleTokenText(2.9));
    });

    suite.test('結緣版面有求籤令數量標籤；占卜入口在底部', () => {
        const nodes = layoutNodes();
        assert.isTrue(nodes.some((node) => node.id === 'oracleTokenLabel'));
        const button = nodes.find((node) => node.id === 'btnOpenOracle');
        assert.equals(12, button!.widget.bottom);
        assert.equals(undefined, button!.widget.top);
    });

    return suite;
}
