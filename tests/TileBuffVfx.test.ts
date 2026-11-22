// PROG-2-9734：buff 格靜態光圈分級、部隊腳下特效時間軸與插槽表的純邏輯測試
import { PickupSlotTable, pickupEnvelope, tileBuffFactorFromText, tileBuffTierIndex } from '../assets/scripts/battle/shared/TileBuffVfxMath';
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/tile-buff-vfx.json'), 'utf8'));

export function createTileBuffVfxSuite(): TestSuite {
    const suite = new TestSuite('TileBuffVfx');

    suite.test('疊層分級：×2、×3、×5 分在三個不同級，圈數、刻度、亮度依序變多', () => {
        const [a, b, c] = [2, 3, 5].map(f => cfg.stackTiers[tileBuffTierIndex(cfg.stackTiers, f)]);
        assert.isTrue(a !== b && b !== c && a !== c);
        assert.isTrue(a.rings < b.rings && b.rings < c.rings);
        assert.isTrue(a.ticks < b.ticks && b.ticks < c.ticks);
        assert.isTrue(a.glow < b.glow && b.glow < c.glow);
        assert.isTrue(tileBuffTierIndex(cfg.stackTiers, 4) === tileBuffTierIndex(cfg.stackTiers, 3));
        assert.isTrue(tileBuffTierIndex(cfg.stackTiers, NaN) === 0);
    });

    suite.test('倍數文字解析：×3、÷5、×2.3，壞字串回 1', () => {
        assert.isTrue(tileBuffFactorFromText('×3') === 3);
        assert.isTrue(tileBuffFactorFromText('÷5') === 5);
        assert.isTrue(tileBuffFactorFromText('×2.3') === 2.3);
        assert.isTrue(tileBuffFactorFromText('') === 1);
    });

    suite.test('火星寬度：180px 單位高度下最細處仍至少 2px（總 PM 標準）', () => {
        const widest = cfg.attack.sparkWidthPx * 2;
        const thinnest = cfg.attack.sparkWidthPx * (1 - 0.4) * 2;
        assert.isTrue(widest >= 2 && thinnest >= 2, `${widest} ${thinnest}`);
    });

    suite.test('腳下特效時間軸：淡入、持續、淡出，2.5 秒後歸零', () => {
        const P = cfg.pickup;
        assert.isTrue(P.durationSec === 2.5);
        assert.isTrue(pickupEnvelope(0, P.durationSec, P.fadeInSec, P.fadeOutSec) === 0 || pickupEnvelope(0, P.durationSec, P.fadeInSec, P.fadeOutSec) < 0.01);
        assert.isTrue(pickupEnvelope(1.2, P.durationSec, P.fadeInSec, P.fadeOutSec) === 1);
        const tail = pickupEnvelope(P.durationSec - 0.1, P.durationSec, P.fadeInSec, P.fadeOutSec);
        assert.isTrue(tail > 0 && tail < 0.3, `${tail}`);
        assert.isTrue(pickupEnvelope(2.5, P.durationSec, P.fadeInSec, P.fadeOutSec) === 0);
        assert.isTrue(pickupEnvelope(NaN, P.durationSec, P.fadeInSec, P.fadeOutSec) === 0);
    });

    suite.test('插槽表：同部隊重複吃到只重啟不疊加；到期自動釋放並計數', () => {
        const t = new PickupSlotTable(4, 2.5);
        const s1 = t.start('u1');
        t.step(1);
        const s1b = t.start('u1');
        assert.isTrue(s1 === s1b && s1b.elapsed === 0 && t.activeCount() === 1);
        t.start('u2');
        assert.isTrue(t.activeCount() === 2);
        assert.isTrue(t.step(2.4).length === 0);
        const done = t.step(0.2);
        assert.isTrue(done.length === 2 && t.activeCount() === 0);
        assert.isTrue(t.started === 3 && t.expired === 2);
    });

    suite.test('插槽表：滿了回收播最久的；releaseAll 全部清空', () => {
        const t = new PickupSlotTable(2, 2.5);
        const a = t.start('a');
        t.step(1);
        t.start('b');
        const c = t.start('c');
        assert.isTrue(c === a && t.activeCount() === 2, 'steals oldest');
        t.releaseAll();
        assert.isTrue(t.activeCount() === 0);
    });

    return suite;
}
