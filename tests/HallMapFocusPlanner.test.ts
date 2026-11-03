/**
 * HallMapFocusPlanner.test.ts — 大廳勢力圖縮放聚焦規劃（UI-2-0128，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import {
    computeHallMapFocus,
    HallMapLayout,
    planHallMapTurn,
    readProvinceCentroids,
} from '../assets/scripts/core/systems/HallMapFocusPlanner';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

export function createHallMapFocusPlannerSuite(): TestSuite {
    const suite = new TestSuite('HallMapFocusPlanner');
    const layout = loadJson<HallMapLayout>('assets/resources/data/hall-map/hall-map-layout.json');
    const provinces = loadJson<{ provinces: { id: string; centroid?: number[] }[] }>(
        'assets/resources/data/hall-map/han13-provinces.json',
    ).provinces;
    const centroids = readProvinceCentroids(provinces);
    const focusRect = layout.modes.focus;

    suite.test('十三州都有落在 0~1 內的中心點', () => {
        assert.equals(13, Object.keys(centroids).length);
        for (const id of Object.keys(centroids)) {
            assert.inRange(centroids[id][0], 0, 1, `${id} x`);
            assert.inRange(centroids[id][1], 0, 1, `${id} y`);
        }
    });

    suite.test('聚焦兗州：與設計稿相同，標記落在視窗中央、圖層不露空白', () => {
        const f = computeHallMapFocus('yan', centroids, layout)!;
        assert.inRange(f.pingX, focusRect.x + focusRect.width / 2 - 1, focusRect.x + focusRect.width / 2 + 1);
        assert.inRange(f.contentOffsetX, focusRect.width * (1 - focusRect.zoom), 0);
        // 兗州偏北，垂直方向被夾在頂端：位移為 0，標記高於視窗中線。
        assert.equals(0, f.contentOffsetY);
        assert.isTrue(f.pingY < focusRect.y + focusRect.height / 2);
    });

    suite.test('每一州的事件標記都留在聚焦視窗內', () => {
        for (const id of Object.keys(centroids)) {
            const f = computeHallMapFocus(id, centroids, layout)!;
            assert.inRange(f.pingX, focusRect.x, focusRect.x + focusRect.width, `${id} pingX`);
            assert.inRange(f.pingY, focusRect.y, focusRect.y + focusRect.height, `${id} pingY`);
        }
    });

    suite.test('偏西的州標籤放右邊，偏東的放左邊', () => {
        const edges = { west: [0.02, 0.5], east: [0.98, 0.5] } as const;
        assert.equals('right', computeHallMapFocus('west', edges, layout)!.labelSide);
        assert.equals('left', computeHallMapFocus('east', edges, layout)!.labelSide);
        assert.equals('left', computeHallMapFocus('xu', centroids, layout)!.labelSide);
    });

    suite.test('查不到的州回傳 null', () => {
        assert.equals(null, computeHallMapFocus('nowhere', centroids, layout));
    });

    suite.test('換季序列：逐州聚焦、依停留秒數排時間、最後回到 mini', () => {
        const steps = planHallMapTurn([
            { provinceId: 'yan', label: '烏巢告急 · 兗州', glyph: '戰' },
            { provinceId: 'jing', label: '劉表屯兵 · 荊州', glyph: '兵' },
        ], centroids, layout);
        assert.lengthEquals(3, steps);
        assert.equals('focus', steps[0].mode);
        assert.equals(0, steps[0].startSec);
        assert.equals('jing', steps[1].focus!.provinceId);
        assert.equals(layout.seasonTurn.dwellSec, steps[1].startSec);
        assert.equals('mini', steps[2].mode);
        assert.equals(layout.seasonTurn.dwellSec * 2, steps[2].startSec);
    });

    suite.test('換季序列略過未知州並遵守事件上限', () => {
        const many = ['nowhere', 'yan', 'jing', 'yang', 'yi', 'xu', 'qing'].map(id => ({ provinceId: id, label: id, glyph: '事' }));
        const steps = planHallMapTurn(many, centroids, layout);
        assert.lengthEquals(layout.seasonTurn.maxEvents + 1, steps);
        assert.equals('yan', steps[0].event!.provinceId);
    });

    suite.test('沒有事件時只回一站 mini', () => {
        const steps = planHallMapTurn([], centroids, layout);
        assert.lengthEquals(1, steps);
        assert.equals('mini', steps[0].mode);
    });

    return suite;
}
