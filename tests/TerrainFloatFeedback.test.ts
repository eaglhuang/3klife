/**
 * TerrainFloatFeedback — 地形適性飄字與台詞戰報（doc_spec_0327；PROG-2-2002）
 */
import { assert, TestSuite } from './TestRunner';
import {
    aptitudeLogEntry, floatOffsetAt, scheduleTerrainFloats, terrainFloatSpecOf,
} from '../assets/scripts/core/systems/TerrainFloatFeedback';

export function createTerrainFloatFeedbackSuite(): TestSuite {
    const suite = new TestSuite('TerrainFloatFeedback (地形適性飄字 doc_spec_0327 PROG-2-2002)');

    suite.test('S/A/D 三色飄字；B/C 不飄字', () => {
        assert.equals('【地利優勢】', terrainFloatSpecOf('S')!.text);
        assert.equals('#3273DC', terrainFloatSpecOf('A')!.color);
        assert.equals('shake', terrainFloatSpecOf('D')!.effect);
        assert.equals(null, terrainFloatSpecOf('B'));
        assert.equals(null, terrainFloatSpecOf('C'));
    });

    suite.test('上浮 35px／0.85 秒，單調上升並淡出', () => {
        assert.equals(0, floatOffsetAt(0).y);
        assert.equals(35, floatOffsetAt(0.85).y);
        assert.equals(0, floatOffsetAt(0.85).opacity);
        assert.equals(1, floatOffsetAt(0.2).opacity);
        let prev = 0;
        for (let t = 0.05; t < 0.85; t += 0.05) {
            const y = floatOffsetAt(t).y;
            assert.isTrue(y >= prev);
            prev = y;
        }
    });

    suite.test('錯峰 120ms（不飄字者不佔間隔）與日誌標籤', () => {
        const s = scheduleTerrainFloats([
            { unitId: 'a', grade: 'S' }, { unitId: 'b', grade: 'B' }, { unitId: 'c', grade: 'D' },
        ]);
        assert.equals(2, s.length);
        assert.equals(0, s[0].delayMs);
        assert.equals('c', s[1].unitId);
        assert.equals(120, s[1].delayMs);
        assert.equals('[適性機略] 天助我也', aptitudeLogEntry('天助我也'));
    });

    return suite;
}
