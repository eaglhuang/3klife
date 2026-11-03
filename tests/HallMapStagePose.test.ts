/**
 * HallMapStagePose.test.ts — 勢力圖每一站的畫面姿態換算（UI-2-0131，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { computeHallMapFocus, HallMapLayout, readProvinceCentroids } from '../assets/scripts/core/systems/HallMapFocusPlanner';
import { hallMapStagePose } from '../assets/scripts/core/systems/HallMapStagePose';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const CANVAS = { width: 1920, height: 1080 };

function near(expected: number, actual: number, msg: string): void {
    assert.inRange(actual, expected - 0.01, expected + 0.01, `${msg}: 期望 ${expected}，得到 ${actual}`);
}

export function createHallMapStagePoseSuite(): TestSuite {
    const suite = new TestSuite('HallMapStagePose');
    const layout = loadJson<HallMapLayout>('assets/resources/data/hall-map/hall-map-layout.json');
    const centroids = readProvinceCentroids(loadJson<{ provinces: { id: string; centroid?: number[] }[] }>(
        'assets/resources/data/hall-map/han13-provinces.json',
    ).provinces);

    suite.test('mini：視窗換成中心原點、y 向上，地圖不放大且與視窗重合', () => {
        const r = layout.modes.mini;
        const pose = hallMapStagePose('mini', null, layout, CANVAS);
        near(r.x + r.width / 2 - 960, pose.viewport.x, 'viewport.x');
        near(540 - (r.y + r.height / 2), pose.viewport.y, 'viewport.y');
        near(0, pose.content.x, 'content.x');
        near(0, pose.content.y, 'content.y');
        near(r.width, pose.content.width, 'content.width');
        assert.isTrue(pose.viewport.visible);
        assert.isFalse(pose.ping.visible);
    });

    suite.test('focus：事件標記換算後回到設計座標，與規劃結果一致', () => {
        for (const id of Object.keys(centroids)) {
            const focus = computeHallMapFocus(id, centroids, layout)!;
            const pose = hallMapStagePose('focus', focus, layout, CANVAS);
            near(focus.pingX, pose.ping.x + 960, `${id} ping.x`);
            near(focus.pingY, 540 - pose.ping.y, `${id} ping.y`);
            assert.isTrue(pose.ping.visible);
        }
    });

    suite.test('focus：放大後的地圖永遠蓋滿視窗，不露出空白', () => {
        for (const id of Object.keys(centroids)) {
            const pose = hallMapStagePose('focus', computeHallMapFocus(id, centroids, layout), layout, CANVAS);
            const halfVW = pose.viewport.width / 2;
            const halfVH = pose.viewport.height / 2;
            assert.isTrue(pose.content.x - pose.content.width / 2 <= -halfVW + 0.01, `${id} 左緣`);
            assert.isTrue(pose.content.x + pose.content.width / 2 >= halfVW - 0.01, `${id} 右緣`);
            assert.isTrue(pose.content.y + pose.content.height / 2 >= halfVH - 0.01, `${id} 上緣`);
            assert.isTrue(pose.content.y - pose.content.height / 2 <= -halfVH + 0.01, `${id} 下緣`);
        }
    });

    suite.test('focus 沒有目標時置中放大，不顯示標記', () => {
        const pose = hallMapStagePose('focus', null, layout, CANVAS);
        near(0, pose.content.x, 'content.x');
        near(0, pose.content.y, 'content.y');
        assert.isFalse(pose.ping.visible);
    });

    suite.test('hidden：視窗與標記都不顯示', () => {
        const pose = hallMapStagePose('hidden', null, layout, CANVAS);
        assert.isFalse(pose.viewport.visible);
        assert.isFalse(pose.ping.visible);
    });

    return suite;
}
