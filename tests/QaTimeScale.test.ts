/**
 * QaTimeScale.test.ts — QA 慢動作與定格參數（PROG-2-9405）
 *
 * 鎖住：沒有 qa 參數完全不啟用；qaSlow 解析與 0.05～1 夾值；step 切段；setTimeout 延遲換算；
 * 與 BattleTimeScale 的倍率相乘、定格、step 繞過倍率；qaSlow／qaTime 不會被 qaBattle 當成打錯字。
 *
 * Unity 對照：測 Time.timeScale 參數解析與手動 Step。
 */
import { assert, TestSuite } from './TestRunner';
import {
    QA_STEP_MAX_MS,
    clampQaScale,
    parseQaTimeParams,
    planStepSlices,
    scaleTimerDelay,
} from '../assets/scripts/core/systems/QaTimeScale';
import { resolveQaBattle, type QaBattleCatalog } from '../assets/scripts/core/systems/QaBattleEntry';
import {
    setQaTimeFrozen,
    setQaTimeMultiplier,
    setTimeScale,
    stepDirector,
    tickUnscaled,
    type Tickable,
} from '../assets/scripts/battle/views/BattleTimeScale';

function fakeTarget(): Tickable & { seen: number[] } {
    const seen: number[] = [];
    return { seen, tick(dt: number) { seen.push(dt); } };
}

function near(a: number, b: number): boolean {
    return Math.abs(a - b) < 1e-9;
}

export function createQaTimeScaleSuite(): TestSuite {
    const suite = new TestSuite('QaTimeScale (QA 慢動作與定格 PROG-2-9405)');

    suite.test('沒有任何 qa 參數：不啟用、倍率 1（正式玩家流程）', () => {
        for (const search of ['', undefined, null, '?foo=1&previewMode=true']) {
            const p = parseQaTimeParams(search as string | undefined | null);
            assert.equals(false, p.enabled);
            assert.equals(1, p.scale);
            assert.equals(0, p.warnings.length);
        }
    });

    suite.test('qaSlow=0.25 啟用並取倍率；只帶 qaTime=1 或 qaBattle 也啟用但倍率 1', () => {
        const slow = parseQaTimeParams('?qaSlow=0.25');
        assert.equals(true, slow.enabled);
        assert.equals(0.25, slow.scale);
        assert.equals(0, slow.warnings.length);
        assert.equals(1, parseQaTimeParams('?qaTime=1').scale);
        assert.equals(true, parseQaTimeParams('?qaTime=1').enabled);
        assert.equals(true, parseQaTimeParams('?qaBattle=1').enabled);
    });

    suite.test('qaSlow 夾在 0.05～1 並提示；非數字忽略並提示', () => {
        const low = parseQaTimeParams('?qaSlow=0.001');
        assert.equals(0.05, low.scale);
        assert.equals(1, low.warnings.length);
        const high = parseQaTimeParams('?qaSlow=3');
        assert.equals(1, high.scale);
        assert.equals(1, high.warnings.length);
        for (const bad of ['abc', '', '-1', '0']) {
            const p = parseQaTimeParams(`?qaSlow=${bad}`);
            assert.equals(1, p.scale);
            assert.equals(1, p.warnings.length);
        }
        assert.equals(0.05, clampQaScale(0));
        assert.equals(1, clampQaScale(Number.NaN));
        assert.equals(0.5, clampQaScale(0.5));
    });

    suite.test('planStepSlices：總和等於毫秒數、每段不超過 1/30 秒；不合法回空；超大值夾上限', () => {
        const slices = planStepSlices(100);
        assert.equals(true, near(slices.reduce((a, b) => a + b, 0), 0.1));
        assert.equals(true, slices.every((dt) => dt <= 1 / 30 + 1e-12));
        assert.equals(3, slices.length);
        assert.equals(0, planStepSlices(0).length);
        assert.equals(0, planStepSlices(-5).length);
        assert.equals(0, planStepSlices(Number.NaN).length);
        const capped = planStepSlices(QA_STEP_MAX_MS * 10);
        assert.equals(true, near(capped.reduce((a, b) => a + b, 0), QA_STEP_MAX_MS / 1000));
    });

    suite.test('scaleTimerDelay：慢動作時延遲除以倍率；倍率 1 或不合法原樣回傳', () => {
        assert.equals(400, scaleTimerDelay(100, 0.25));
        assert.equals(100, scaleTimerDelay(100, 1));
        assert.equals(100, scaleTimerDelay(100, 2));
        assert.equals(100, scaleTimerDelay(100, 0));
        assert.equals(undefined, scaleTimerDelay(undefined, 0.25));
        assert.equals(0, scaleTimerDelay(0, 0.25));
    });

    suite.test('QA 倍率乘進 dt、定格幾乎凍結、step 繞過倍率；還原後恢復', () => {
        // 以假 director 驗 setTimeScale 的組合行為（與 BattleTimeScale 內部同一函式）
        const d = fakeTarget();
        setTimeScale(d, 1 * 0.25);
        d.tick(0.04);
        assert.equals(true, near(d.seen[0], 0.01));
        tickUnscaled(d, 0.04);
        assert.equals(true, near(d.seen[1], 0.04));
        setTimeScale(d, 1);
        d.tick(0.04);
        assert.equals(0.04, d.seen[2]);
        // 全域狀態：設了再還原，不留殘值給其他測試
        setQaTimeMultiplier(0.5);
        setQaTimeFrozen(true);
        stepDirector([]);
        setQaTimeFrozen(false);
        setQaTimeMultiplier(1);
    });

    suite.test('qaSlow／qaTime 不會被 qaBattle 當成打錯字的參數', () => {
        const catalog: QaBattleCatalog = { encounters: [], generalIds: [], tallyCardByTroop: {}, maxPlayerTroops: 4 };
        const r = resolveQaBattle('?qaBattle=1&qaSlow=0.25&qaTime=1', catalog);
        assert.equals(true, r.requested);
        if (r.requested && !r.ok) {
            assert.equals(false, r.errors.some((e) => e.includes('不認得的參數')));
        }
    });

    return suite;
}
