/**
 * audit-generals-report.js 的純邏輯（GDP-08 / PROG-2-0805）
 *
 * 以 inline fixture 鎖住各檢查項；另以正式 master 資料做煙霧測試（不寫檔）。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const audit = require('../tools_node/audit-generals-report.js') as {
    buildAuditReport: (input: { base: Array<Record<string, unknown>>; lore?: Array<Record<string, unknown>>; stories?: Array<Record<string, unknown>>; keyCount?: number }) => Record<string, any>;
    formatAuditMarkdown: (report: Record<string, any>) => string;
    auditHasFindings: (report: Record<string, any>) => boolean;
    isTruncated: (text: string) => boolean;
    garbledFieldsOf: (record: Record<string, unknown>, fields: string[]) => string[];
    TOP_COUNT: number;
};

function general(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { id, name: id, ep: 50, str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50, rarityTier: 'rare', characterCategory: 'general', ...overrides };
}

const SIX_CELLS = ['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'].map(slot => ({ slot, text: '字' }));

export function createGeneralAuditReportSuite(): TestSuite {
    const suite = new TestSuite('GeneralAuditReport (武將審核清單 GDP-08)');

    suite.test('Top 與屬性最大值：依 ep 排序，各屬性取最高者', () => {
        const base = [
            general('a', { ep: 60, str: 99 }),
            general('b', { ep: 90, int: 95 }),
            general('c', { ep: 70, str: 10 }),
        ];
        const report = audit.buildAuditReport({ base });
        assert.equals('b', report.topByEp[0].id);
        assert.equals('a', report.statMax.str.id);
        assert.equals(99, report.statMax.str.value);
        assert.equals('b', report.statMax.int.id);
    });

    suite.test('tier 與 category 分布：缺值歸為 (缺)', () => {
        const base = [
            general('a', { rarityTier: 'legendary', characterCategory: 'titled' }),
            general('b', { rarityTier: 'legendary' }),
            general('c', { rarityTier: undefined }),
        ];
        const report = audit.buildAuditReport({ base });
        assert.equals(2, report.rarityTierDistribution.legendary);
        assert.equals(1, report.rarityTierDistribution['(缺)']);
        assert.equals(1, report.categoryDistribution.titled);
    });

    suite.test('重複 id：跨 base / lore / stories 各自回報', () => {
        const report = audit.buildAuditReport({
            base: [general('a'), general('a'), general('b')],
            lore: [{ id: 'b', historicalAnecdote: '甲。', bloodlineRumor: '乙。' }, { id: 'b', historicalAnecdote: '甲。', bloodlineRumor: '乙。' }],
            stories: [{ id: 'c', storyStripCells: SIX_CELLS }],
        });
        assert.equals(1, report.duplicateIds.base.length);
        assert.equals(2, report.duplicateIds.base[0].count);
        assert.equals(1, report.duplicateIds.lore.length);
        assert.equals(0, report.duplicateIds.stories.length);
    });

    suite.test('亂碼：U+FFFD、控制字元、連續問號皆命中；正常中文不命中', () => {
        assert.equals('historicalAnecdote', audit.garbledFieldsOf({ historicalAnecdote: '曹操\uFFFD字' }, ['historicalAnecdote'])[0]);
        assert.equals('bloodlineRumor', audit.garbledFieldsOf({ bloodlineRumor: 'abc\u0001' }, ['bloodlineRumor'])[0]);
        assert.equals('name', audit.garbledFieldsOf({ name: '???' }, ['name'])[0]);
        assert.equals(0, audit.garbledFieldsOf({ name: '曹操，字孟德。' }, ['name']).length);
    });

    suite.test('截斷：未以句末標點結尾者命中；空字串不算截斷', () => {
        assert.isTrue(audit.isTruncated('借漢水暴漲水淹七'));
        assert.isFalse(audit.isTruncated('父親曹嵩。\n'));
        assert.isFalse(audit.isTruncated('   '));
    });

    suite.test('關鍵 25 位（ep 最高）缺 lore 或故事條格數異常時列出', () => {
        const base = [general('a', { ep: 90 }), general('b', { ep: 80 })];
        const lore = [{ id: 'a', historicalAnecdote: '甲。', bloodlineRumor: '乙。' }];
        const stories = [{ id: 'a', storyStripCells: SIX_CELLS.slice(0, 5) }];
        const report = audit.buildAuditReport({ base, lore, stories, keyCount: 2 });
        assert.equals(2, report.keyGaps.length);
        assert.equals('a', report.keyGaps[0].id);
        assert.isTrue(report.keyGaps[0].problems.includes('storyStripCells 非 6 格'));
        assert.isTrue(report.keyGaps[1].problems.includes('缺 lore'));
    });

    suite.test('Markdown 含各區段標題，且有發現時 auditHasFindings 為 true', () => {
        const clean = audit.buildAuditReport({ base: [general('a')], lore: [], stories: [], keyCount: 0 });
        const md = audit.formatAuditMarkdown(clean);
        assert.isTrue(md.includes('## Top 10'));
        assert.isTrue(md.includes('## 重複 id（0 組）'));
        assert.isFalse(audit.auditHasFindings(clean));
        const dirty = audit.buildAuditReport({ base: [general('a'), general('a')], keyCount: 0 });
        assert.isTrue(audit.auditHasFindings(dirty));
    });

    suite.test('煙霧測試：正式 master 資料無重複 id、無亂碼，Top 10 齊全', () => {
        const dir = path.join('assets', 'resources', 'data', 'master');
        const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8')).data as Array<Record<string, unknown>>;
        const report = audit.buildAuditReport({ base: read('generals-base'), lore: read('generals-lore'), stories: read('generals-stories') });
        assert.equals(audit.TOP_COUNT, report.topByEp.length);
        assert.equals(0, report.duplicateIds.base.length);
        assert.equals(0, report.duplicateIds.stories.length);
        assert.equals(0, report.garbled.length);
    });

    return suite;
}
