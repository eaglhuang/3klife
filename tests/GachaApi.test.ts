/**
 * GachaApi.test.ts — 轉蛋標準 API 純函式與限定池每週輪替（PROG-2-9024）
 *
 * Unity 對照：EditMode Test，檢查 Banner 輪替表與扣款／機率／保底計算。
 */
import { assert, TestSuite } from './TestRunner';
import { gachaCostOf, gachaPityOf, gachaRatesOf, parseGachaMainPools, pickPullCurrency } from '../assets/scripts/core/gacha/GachaApi';
import { gachaApiView } from '../assets/scripts/ui/core/GachaApiTexts';
import { GACHA_NODES, GACHA_POOLS, GACHA_POOL_INDEX } from '../assets/scripts/ui/core/GachaScreenNodes';
import type { GachaPoolDto } from '../assets/scripts/core/gacha/GachaApi';
import { DAY_MS, expandLimitedPoolRotations, parseLimitedPoolRotations, rotationPeriodIndex, rotationWindowAt } from '../assets/scripts/core/systems/LimitedPoolRotation';

const ANCHOR = Date.UTC(2026, 10, 8, 16);
const ROT = { poolId: 'limited-pool', anchorMs: ANCHOR, periodDays: 7, generalIds: ['lu-bu', 'zhao-yun', 'zhuge-liang'] };

export function createGachaApiSuite(): TestSuite {
    const suite = new TestSuite('GachaApi (轉蛋標準 API / 限定池每週輪替)');

    suite.test('輪替：每 7 天換一位焦點武將，名單輪完從頭', () => {
        const at = (days: number) => rotationWindowAt(ROT, rotationPeriodIndex(ROT, ANCHOR + days * DAY_MS)).featuredGeneralIds[0];
        assert.equals('lu-bu', at(0));
        assert.equals('lu-bu', at(6.9));
        assert.equals('zhao-yun', at(7));
        assert.equals('zhuge-liang', at(14));
        assert.equals('lu-bu', at(21));
        assert.equals('zhuge-liang', at(-1), 'anchor 之前照名單倒推');
    });

    suite.test('輪替：時間窗剛好一週且連續', () => {
        const w = expandLimitedPoolRotations([ROT], ANCHOR + 3 * DAY_MS, 3);
        assert.lengthEquals(3, w);
        assert.equals(ANCHOR, w[0].startMs);
        assert.equals(7 * DAY_MS, w[0].endMs - w[0].startMs);
        assert.equals(w[0].endMs, w[1].startMs);
    });

    suite.test('輪替：格式不對的項目略過，預設 7 天', () => {
        const r = parseLimitedPoolRotations({ rotations: [{ poolId: 'a', anchorMs: 0, generalIds: ['x'] }, { poolId: 'b', anchorMs: 0, generalIds: [] }, null] });
        assert.lengthEquals(1, r);
        assert.equals(7, r[0].periodDays);
    });

    suite.test('池清單：解析設定檔並略過缺費用的項目', () => {
        const pools = parseGachaMainPools({ pools: [
            { key: 'g', poolId: 'hero-pool', theme: 'wood', currencies: ['bronze', 'gems'], singleCost: 150, tenCost: 1500 },
            { key: 'x', poolId: 'p', currencies: ['gems'], singleCost: 0, tenCost: 10 },
        ] });
        assert.lengthEquals(1, pools);
        assert.equals('SSR 保底進度', pools[0].pityLabel);
    });

    suite.test('扣款：依貨幣順序挑第一個夠付的；不足回報差額', () => {
        const pool = { currencies: ['bronze', 'gems'] as const, singleCost: 150, tenCost: 1500 };
        const p = { ...pool, currencies: [...pool.currencies] };
        assert.equals(1500, gachaCostOf(p, 10));
        const a = pickPullCurrency(p, 1, { bronze: 100, gems: 200 });
        assert.isTrue(a.ok && a.currency === 'gems');
        const b = pickPullCurrency(p, 10, { bronze: 1500, gems: 0 });
        assert.isTrue(b.ok && b.currency === 'bronze');
        const c = pickPullCurrency(p, 10, { bronze: 200, gems: 1000 });
        assert.isTrue(!c.ok && c.error === 'INSUFFICIENT_CURRENCY' && c.shortfall === 500);
        const d = pickPullCurrency(p, 1, { tickets: 99 }, 'tickets');
        assert.isTrue(!d.ok && d.error === 'CURRENCY_NOT_ALLOWED');
    });

    suite.test('機率：限定池拆出 UP，總和 100%', () => {
        const r = gachaRatesOf({ SSR: 0.03, SR: 0.1, R: 0.87 }, 0.7, true);
        assert.equals('UP', r[0].rarity);
        assert.equals(2.1, r[0].percent);
        const sum = r.reduce((s, x) => s + x.percent, 0);
        assert.inRange(sum, 99.99, 100.01);
        assert.lengthEquals(3, gachaRatesOf({ SSR: 0.03, SR: 0.1, R: 0.87 }, 0.7, false));
    });

    suite.test('保底：距上次 SSR 的抽數與天命值', () => {
        const p = gachaPityOf('SSR 保底進度', 230, 210, 50, 200);
        assert.equals(20, p.current);
        assert.equals(30, p.destinyCurrent);
    });

    suite.test('右側面板：限定池顯示天命值、機率依高到低、空格藏起來、原價同價不顯示（PROG-2-9025）', () => {
        const dto = {
            key: 'limited', poolId: 'limited-pool', theme: 'black-gold', name: '限定召喚', sub: '本期限定名將，期滿下架', badge: '期間限定',
            series: '★ 本期限定', brief: '僅限靈玉召喚，銅錢符不可用\n本期焦點武將機率提升', showcaseGeneralId: null,
            featuredGeneralIds: ['lu-bu'], endsAtMs: 3 * DAY_MS, currencies: ['gems'], singleCost: 150, tenCost: 1500,
            rates: [{ rarity: 'R', percent: 80 }, { rarity: 'UP', percent: 2.1 }, { rarity: 'SSR', percent: 0.9 }, { rarity: 'SR', percent: 17 }],
            pity: { label: 'SSR 保底進度', current: 10, max: 50, destinyCurrent: 87, destinyMax: 200 },
        } as unknown as GachaPoolDto;
        const pool = GACHA_POOLS[GACHA_POOL_INDEX.limited];
        const view = gachaApiView(pool, dto, { gems: 340 } as any, () => '呂布', 0);
        assert.equals('天命值', view.texts[GACHA_NODES.pityTitle]);
        assert.equals('113', view.texts[GACHA_NODES.pityRemain]);
        assert.equals('87 / 200', view.texts[GACHA_NODES.pityFillLabel]);
        assert.equals('UP', view.texts.RateRarity0);
        assert.equals('2.1%', view.texts.RatePct0);
        assert.equals('R', view.texts.RateRarity3);
        assert.equals('呂 布', view.texts[pool.heroName]);
        assert.equals('▸ 限定池說明', view.texts[GACHA_NODES.briefTag]);
        assert.isFalse(view.actives[GACHA_NODES.pullTenOriginalCost]);
        assert.equals(0.435, view.pityRatio);
        const fewer = gachaApiView(pool, { ...dto, rates: dto.rates.slice(0, 2) }, { gems: 0 } as any, () => '呂布', 0);
        assert.isFalse(fewer.actives.RateItem2);
    });

    return suite;
}
