/**
 * ingest-generals-wiki.js 的純邏輯（GDP-01 / PROG-2-0415）
 *
 * 只測種子清單、--limit 解析、欄位映射與 EP 計算；不觸發網路與檔案寫入。
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ingest = require('../tools_node/ingest-generals-wiki.js') as {
    SEED_GENERALS: Array<{ id: string; name: string; faction: string; role: string }>;
    parseLimit: (argv: string[]) => number;
    calcEp: (stats: Record<'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk', number>) => number;
    mapToGeneralBase: (seed: { id: string; name: string; faction: string; role?: string }, extract: string | null) => Record<string, unknown>;
};

export function createIngestGeneralsWikiSuite(): TestSuite {
    const suite = new TestSuite('IngestGeneralsWiki (武將 Wiki 爬取純邏輯 GDP-01)');

    suite.test('種子清單：id 與姓名皆不重複，且陣營與定位在允許值內', () => {
        const ids = new Set<string>();
        const names = new Set<string>();
        const factions = ['wei', 'shu', 'wu', 'enemy', 'neutral'];
        const roles = ['Combat', 'Commander', 'Support'];
        for (const seed of ingest.SEED_GENERALS) {
            assert.isFalse(ids.has(seed.id), `重複 id: ${seed.id}`);
            assert.isFalse(names.has(seed.name), `重複姓名: ${seed.name}`);
            assert.isTrue(factions.includes(seed.faction), `未知陣營: ${seed.id}=${seed.faction}`);
            assert.isTrue(roles.includes(seed.role), `未知定位: ${seed.id}=${seed.role}`);
            ids.add(seed.id);
            names.add(seed.name);
        }
        assert.isTrue(ingest.SEED_GENERALS.length >= 50);
    });

    suite.test('--limit：未給、缺值、非數字、零或負數一律回退 50', () => {
        assert.equals(50, ingest.parseLimit([]));
        assert.equals(50, ingest.parseLimit(['--limit']));
        assert.equals(50, ingest.parseLimit(['--limit', 'abc']));
        assert.equals(50, ingest.parseLimit(['--limit', '0']));
        assert.equals(50, ingest.parseLimit(['--limit', '-3']));
    });

    suite.test('--limit：正整數照用，且與其他旗標並存時仍正確', () => {
        assert.equals(10, ingest.parseLimit(['--limit', '10']));
        assert.equals(7, ingest.parseLimit(['--dry-run', '--limit', '7']));
    });

    suite.test('EP 為六維平均四捨五入', () => {
        const stats = { str: 70, int: 65, lea: 72, pol: 68, cha: 65, luk: 60 };
        assert.equals(67, ingest.calcEp(stats));
        assert.equals(100, ingest.calcEp({ str: 100, int: 100, lea: 100, pol: 100, cha: 100, luk: 100 }));
    });

    suite.test('映射：有摘要時 historicalAnecdote 截斷至 200 字，並帶來源標記', () => {
        const longText = '甲'.repeat(300);
        const row = ingest.mapToGeneralBase({ id: 'x', name: '甲某', faction: 'wei', role: 'Support' }, longText);
        assert.equals('x', row.id as string);
        assert.equals('wei', row.faction as string);
        assert.equals('Support', row.role as string);
        assert.equals('男', row.gender as string);
        assert.equals(200, (row.historicalAnecdote as string).length);
        assert.equals('wiki', row._source as string);
        assert.isTrue(typeof row._fetchedAt === 'string');
    });

    suite.test('映射：無摘要時使用佔位文字；缺 role 預設 Combat；六維數值落在 1~99', () => {
        const row = ingest.mapToGeneralBase({ id: 'y', name: '乙某', faction: 'enemy' }, null);
        assert.equals('乙某，三國時期著名人物。（詳細資料待補）', row.historicalAnecdote as string);
        assert.equals('Combat', row.role as string);
        for (const key of ['str', 'int', 'lea', 'pol', 'cha', 'luk']) {
            const v = row[key] as number;
            assert.isTrue(v >= 1 && v <= 99, `${key}=${v} 超出範圍`);
        }
        const ep = row.ep as number;
        assert.equals(ingest.calcEp(row as Record<'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk', number>), ep);
    });

    return suite;
}
