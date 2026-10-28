/**
 * RedFaceCopy.test.ts — 紅顏趕路與商業化提示文案表（COPY-04，PROG-2-0450）
 *
 * 鎖住：配置表四段齊全、文字與《正式版劇本文案》§5、§6 一致；缺段、空白段落、非字串項目都拒收；
 * 取得段落時回傳新陣列。
 *
 * Unity 對照：EditMode Test 驗證 ScriptableObject 的欄位與內容沒有被改壞。
 */
import { assert, TestSuite } from './TestRunner';
import {
    parseRedFaceCopy,
    redFaceCopyLines,
    redFaceTravelCopy,
    RED_FACE_COPY_SEGMENTS,
} from '../assets/scripts/core/systems/RedFaceCopy';
import { createCountdown, OPENING_TRAVEL_DURATION_MS, OPENING_TRAVEL_TARGET_ID } from '../assets/scripts/core/systems/CountdownManager';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readConfig(): unknown {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/copy/red-face-copy.json'), 'utf8'));
}

export function createRedFaceCopySuite(): TestSuite {
    const suite = new TestSuite('RedFaceCopy (紅顏趕路與商業化提示文案 COPY-04)');

    suite.test('配置表四段齊全，且解析成功', () => {
        const result = parseRedFaceCopy(readConfig());
        assert.isTrue(result.ok === true);
        if (result.ok !== true) return;
        for (const key of RED_FACE_COPY_SEGMENTS) {
            assert.isTrue(result.table[key].length > 0, key);
        }
    });

    suite.test('趕路段落為三段，與規格 §5 一致', () => {
        const result = parseRedFaceCopy(readConfig());
        if (result.ok !== true) throw new Error(result.reason);
        const lines = redFaceCopyLines(result.table, 'travel');
        assert.equals(3, lines.length);
        assert.equals('主公，妾身正在路上。', lines[0]);
        assert.equals('只要一點盤纏，便能縮短這段旅途。', lines[2]);
    });

    suite.test('0.99、29.99、倒數三段文字與規格 §6 一致', () => {
        const result = parseRedFaceCopy(readConfig());
        if (result.ok !== true) throw new Error(result.reason);
        assert.equals('只差一步，便能讓你的陣容更完整。', redFaceCopyLines(result.table, 'price099')[0]);
        assert.equals('若要一次補齊文武核心，這是最直接的選擇。', redFaceCopyLines(result.table, 'price2999')[0]);
        assert.equals('她正在趕來。請給她一點時間；若不想等待，也可以立即相見。', redFaceCopyLines(result.table, 'countdown')[0]);
    });

    suite.test('缺段、空段落、空白字串都拒收，並說明原因', () => {
        const config = readConfig() as { segments: Record<string, { lines: string[] }> };
        const missing = parseRedFaceCopy({ segments: { travel: config.segments.travel } });
        assert.isTrue(missing.ok === false);
        const empty = parseRedFaceCopy({ segments: { ...config.segments, countdown: { lines: [] } } });
        assert.isTrue(empty.ok === false);
        const blank = parseRedFaceCopy({ segments: { ...config.segments, price099: { lines: ['   '] } } });
        assert.isTrue(blank.ok === false);
        const notText = parseRedFaceCopy({ segments: { ...config.segments, price2999: { lines: [42] } } });
        assert.isTrue(notText.ok === false);
    });

    suite.test('取得段落回傳新陣列，改動不影響表內資料', () => {
        const result = parseRedFaceCopy(readConfig());
        if (result.ok !== true) throw new Error(result.reason);
        const lines = redFaceCopyLines(result.table, 'countdown');
        lines.push('被改動');
        assert.equals(1, redFaceCopyLines(result.table, 'countdown').length);
    });

    suite.test('開場趕路倒數進行中：回傳趕路段落與倒數提示；到達、非開場倒數、沒有倒數都回傳 null', () => {
        const result = parseRedFaceCopy(readConfig());
        if (result.ok !== true) throw new Error(result.reason);
        const start = 1_000_000;
        const traveling = createCountdown(OPENING_TRAVEL_TARGET_ID, start, OPENING_TRAVEL_DURATION_MS, true);
        const copy = redFaceTravelCopy(result.table, traveling, start + 1);
        assert.isTrue(copy !== null);
        assert.equals(redFaceCopyLines(result.table, 'travel').join('\n\n'), copy!.travel);
        assert.equals(redFaceCopyLines(result.table, 'countdown')[0], copy!.countdown);

        const arrived = redFaceTravelCopy(result.table, traveling, start + OPENING_TRAVEL_DURATION_MS);
        assert.isTrue(arrived === null, '到點後不再顯示趕路文案');
        const other = createCountdown('guan-yu', start, OPENING_TRAVEL_DURATION_MS, true);
        assert.isTrue(redFaceTravelCopy(result.table, other, start + 1) === null, '非開場趕路目標不顯示');
        assert.isTrue(redFaceTravelCopy(result.table, null, start + 1) === null, '沒有倒數不顯示');
    });

    return suite;
}
