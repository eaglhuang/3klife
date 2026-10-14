/**
 * RedFaceShowcase.test.ts — 紅顏池展示列資料（OPEN-10，PROG-2-0466）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { buildRedFaceShowcase } from '../assets/scripts/core/systems/RedFaceShowcase';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

export function createRedFaceShowcaseSuite(): TestSuite {
    const suite = new TestSuite('RedFaceShowcase (OPEN-10 紅顏池展示)');

    suite.test('核心三位置頂，其餘保持池內順序', () => {
        const rows = buildRedFaceShowcase(
            { candidateIds: ['x-1', 'zhen-mi', 'da-qiao', 'xiao-qiao'] },
            [
                { id: 'x-1', name: '甲', previewLine: '一', effectTags: ['a'], portraitKey: 'p1' },
                { id: 'zhen-mi', name: '甄姬', previewLine: '二', effectTags: ['b'], portraitKey: 'p2' },
                { id: 'da-qiao', name: '大喬', previewLine: '三', effectTags: ['c'], portraitKey: 'p3' },
                { id: 'xiao-qiao', name: '小喬', previewLine: '四', effectTags: ['d'], portraitKey: 'p4' },
            ],
            [],
        );
        assert.equals('zhen-mi,da-qiao,xiao-qiao,x-1', rows.map((r) => r.id).join(','));
        assert.isTrue(rows[0].isCore);
        assert.isFalse(rows[3].isCore);
    });

    suite.test('與名將池重疊的武將不出現在紅顏展示', () => {
        const rows = buildRedFaceShowcase(
            { candidateIds: ['da-qiao', 'xiao-qiao'] },
            [{ id: 'da-qiao' }, { id: 'xiao-qiao' }],
            ['da-qiao'],
        );
        assert.equals('xiao-qiao', rows.map((r) => r.id).join(','));
    });

    suite.test('找不到卡資料的候選略過；缺名稱時用 id 代替，不丟錯', () => {
        const rows = buildRedFaceShowcase({ candidateIds: ['ghost', 'mystery'] }, [{ id: 'mystery' }], []);
        assert.equals(1, rows.length);
        assert.equals('mystery', rows[0].name);
        assert.equals('', rows[0].previewLine);
    });

    suite.test('真實資料：紅顏池 support 候選都能產生展示列，且核心三位在前', () => {
        const pools: any[] = readJson('assets/resources/data/gacha-config.json');
        const supportPool = pools.find((p) => p.poolType === 'support');
        const heroPool = pools.find((p) => p.poolType === 'hero');
        assert.isTrue(!!supportPool);
        const rows = buildRedFaceShowcase(
            supportPool,
            readJson('assets/resources/data/support-cards.json'),
            heroPool?.candidateIds ?? [],
        );
        assert.isTrue(rows.length > 0);
        assert.isTrue(rows[0].isCore);
    });

    return suite;
}
