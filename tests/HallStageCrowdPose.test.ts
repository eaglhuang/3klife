/**
 * HallStageCrowdPose.test.ts — 幕府大廳 Q 版武將節點姿態（UI-2-0137，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { HallStageDecor, hallStageCrowdPose } from '../assets/scripts/core/systems/HallStageCrowdPose';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const DECOR = loadJson<HallStageDecor>('assets/resources/data/hall-map/hall-stage-decor.json');

function near(expected: number, actual: number, msg: string): void {
    assert.inRange(actual, expected - 0.001, expected + 0.001, `${msg}: 期望 ${expected}，得到 ${actual}`);
}

export function createHallStageCrowdPoseSuite(): TestSuite {
    const suite = new TestSuite('HallStageCrowdPose');

    suite.test('依顯示高度等比縮放，腳底對齊站位', () => {
        const p = hallStageCrowdPose({ stageX: -160, stageY: -332, height: 262, flip: false }, 433, DECOR, 0);
        near(262 / 433, p.body.scaleX, 'scaleX');
        near(262 / 433, p.body.scaleY, 'scaleY');
        assert.equals(p.body.x, -160, 'x');
        assert.equals(p.body.y, -332, 'y');
    });

    suite.test('翻面只反轉 scaleX', () => {
        const p = hallStageCrowdPose({ stageX: 320, stageY: -326, height: 282, flip: true }, 467, DECOR, 0);
        near(-282 / 467, p.body.scaleX, 'scaleX 為負');
        near(282 / 467, p.body.scaleY, 'scaleY 不變');
    });

    suite.test('名牌在腳底下、標記在頭頂上（設計稿偏移）', () => {
        const p = hallStageCrowdPose({ stageX: 0, stageY: -332, height: 262, flip: false }, 433, DECOR, 0);
        assert.equals(p.tag.y, -332 - DECOR.tagBelowFootPx, '名牌 y');
        assert.equals(p.mark.y, -332 + 262 + DECOR.markAboveHeadPx, '標記 y');
        assert.equals(p.tag.x, 0, '名牌置中');
    });

    suite.test('idle 相位依繪製順序錯開且落在一個週期內', () => {
        const delays = [0, 1, 2, 3, 4, 9].map(i => hallStageCrowdPose({ stageX: 0, stageY: 0, height: 1, flip: false }, 1, DECOR, i).idleDelaySec);
        for (const d of delays) assert.inRange(d, 0, DECOR.idle.periodSec, '相位範圍');
        assert.equals(new Set(delays.slice(0, 5).map(d => d.toFixed(3))).size, 5, '前五人相位互不相同');
    });

    suite.test('圖檔高度無效時以 1:1 處理', () => {
        const p = hallStageCrowdPose({ stageX: 0, stageY: 0, height: 200, flip: false }, 0, DECOR, 0);
        assert.equals(p.body.scaleY, 1, '無效高度');
    });

    return suite;
}
