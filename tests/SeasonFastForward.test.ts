/**
 * SeasonFastForward.test.ts — 快進至下個事件（PROG-2-1090）headless 測試
 *
 * 驗證：遇開獎／離世／成年即停、達上限停、推進失敗中斷、內政畫面有入口。
 */
import { TestSuite, assert } from './TestRunner';
import { FAST_FORWARD_MAX_SEASONS, fastForwardSeasons, type FastForwardStep } from '../assets/scripts/core/systems/SeasonFastForward';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const QUIET: FastForwardStep = { unveilings: [], agingEvents: [] };

function script(steps: Record<number, FastForwardStep>) {
    let count = 0;
    return {
        get count() { return count; },
        advance: async () => { count += 1; return steps[count] ?? QUIET; },
    };
}

export function createSeasonFastForwardSuite(): TestSuite {
    const suite = new TestSuite('SeasonFastForward (快進至下個事件 PROG-2-1090)');

    suite.test('第 3 季有子嗣開獎就停在第 3 季', async () => {
        const s = script({ 3: { unveilings: [{}], agingEvents: [] } });
        const result = await fastForwardSeasons(s.advance);
        assert.equals('unveiling', result.reason);
        assert.equals(3, result.seasons);
        assert.equals(3, s.count);
    });

    suite.test('武將離世停；退休年齡不停', async () => {
        const s = script({ 1: { unveilings: [], agingEvents: [{ type: 'reached-retirement-age' }] }, 2: { unveilings: [], agingEvents: [{ type: 'died' }] } });
        const result = await fastForwardSeasons(s.advance);
        assert.equals('death', result.reason);
        assert.equals(2, result.seasons);
    });

    suite.test('有人剛成年停；都沒事件則推滿上限', async () => {
        let n = 0;
        const grown = await fastForwardSeasons(script({}).advance, () => { n += 1; return n === 5; });
        assert.equals('came-of-age', grown.reason);
        assert.equals(5, grown.seasons);
        const s = script({});
        const full = await fastForwardSeasons(s.advance);
        assert.equals('limit', full.reason);
        assert.equals(FAST_FORWARD_MAX_SEASONS, s.count);
    });

    suite.test('推進失敗中斷並回報已推進季數；內政畫面有快進入口', async () => {
        let n = 0;
        const result = await fastForwardSeasons(async () => { n += 1; if (n === 2) throw new Error('x'); return QUIET; });
        assert.equals('error', result.reason);
        assert.equals(1, result.seasons);
        const layout = fs.readFileSync(path.join(__dirname, '..', 'assets/resources/ui-spec/layouts/domestic-main.json'), 'utf8');
        assert.equals(true, layout.includes('"btnFastForward"'));
    });

    return suite;
}
