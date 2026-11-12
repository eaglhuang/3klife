/**
 * GachaLines.test.ts — 轉蛋登場台詞（PROG-2-2244）
 *
 * 驗證：台詞表每位武將都有一句、id 都對得上 generals.json、讀表與格式化、讀不到退回空表、
 * 結果畫面主角下方用台詞。
 */
import { TestSuite, assert } from './TestRunner';
import { formatGachaLine, GACHA_LINES_PATH, loadGachaLines, parseGachaLines, resetGachaLinesCache } from '../assets/scripts/ui/core/GachaLines';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createGachaLinesSuite(): TestSuite {
    const suite = new TestSuite('GachaLines (轉蛋登場台詞 PROG-2-2244)');

    suite.test('台詞表涵蓋 generals.json 每位武將，且沒有多出來的 id', () => {
        const table = parseGachaLines(JSON.parse(read('assets/resources/data/general-gacha-lines.json')));
        const raw = JSON.parse(read('assets/resources/data/generals.json'));
        const rows: Array<{ id: string }> = Array.isArray(raw) ? raw : (raw.generals ?? Object.values(raw));
        const ids = rows.map((row) => row.id);
        assert.equals(0, ids.filter((id) => !table[id]).length);
        assert.equals(0, Object.keys(table).filter((id) => !ids.includes(id)).length);
    });

    suite.test('格式化加引號；沒有台詞回 null；空字串與非字串略過', () => {
        const table = parseGachaLines({ lines: { a: ' 嗨 ', b: '', c: 3 } });
        assert.equals('「嗨」', formatGachaLine(table, 'a'));
        assert.equals(null, formatGachaLine(table, 'b'));
        assert.equals(null, formatGachaLine(table, 'c'));
        assert.equals(0, Object.keys(parseGachaLines(null)).length);
    });

    suite.test('讀表只讀一次；讀不到回空表', async () => {
        resetGachaLinesCache();
        let calls = 0;
        const loader = async (p: string): Promise<unknown> => { calls += 1; assert.equals(GACHA_LINES_PATH, p); return { lines: { x: '來了' } }; };
        assert.equals('來了', (await loadGachaLines(loader)).x);
        await loadGachaLines(loader);
        assert.equals(1, calls);
        resetGachaLinesCache();
        assert.equals(0, Object.keys(await loadGachaLines(async () => { throw new Error('missing'); })).length);
        resetGachaLinesCache();
    });

    suite.test('共用結果畫面主角下方顯示台詞（所有池共用）', () => {
        const flow = read('assets/scripts/ui/core/GachaFlowCoordinator.ts');
        assert.isTrue(flow.includes('formatGachaLine(await loadGachaLines(), topResult.general.id)'));
        assert.isTrue(flow.includes('GachaPullResult_hero_desc: heroLine ??'));
    });

    return suite;
}
