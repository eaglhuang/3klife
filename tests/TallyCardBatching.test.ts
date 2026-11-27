/**
 * TallyCardBatching.test.ts — 虎符卡面板合批（PROG-2-9714）
 * 實機量測：卡上文字改點陣快取後，面板繪製次數 48 → 20（每卡 12 → 5）。這裡鎖住接線，避免日後被改回。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createTallyCardBatchingSuite(): TestSuite {
    const suite = new TestSuite('TallyCardBatching (虎符卡面板合批 PROG-2-9714)');

    suite.test('卡上文字只從 NONE 改成點陣快取（不用 CHAR），且在字串設好之後才切', () => {
        const src = read('assets/scripts/ui/components/TigerTallyComposite.ts');
        assert.isTrue(src.includes('if (label.cacheMode === Label.CacheMode.NONE) label.cacheMode = Label.CacheMode.BITMAP;'));
        assert.isFalse(src.includes('Label.CacheMode.CHAR'), '字元圖集是全專案稀缺預算，卡面不可用 CHAR');
        const populate = src.slice(src.indexOf('private _populateCards'));
        const starsAt = populate.indexOf('this._applyFaceTexts(slot, face);');
        const switchAt = populate.indexOf('useBitmapCacheForCardLabels(cardNode);');
        assert.isTrue(starsAt > 0 && switchAt > starsAt, '要在最後一個字串設好之後才切快取模式');
    });

    return suite;
}
