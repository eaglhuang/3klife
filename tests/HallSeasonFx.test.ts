/**
 * HallSeasonFx.test.ts — 幕府大廳季節粒子（UI-2-0143，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import {
    HALL_FX_MOBILE_MAX_COUNT,
    HALL_FX_REDRAW_INTERVAL_SEC,
    HallSeasonFxConfig,
    hallSeasonDrawsGlow,
    hallSeasonParticleCount,
    hallSeasonParticleX,
    spawnHallSeasonParticles,
    stepHallSeasonParticles,
} from '../assets/scripts/core/systems/HallSeasonFx';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const CONFIG = loadJson<HallSeasonFxConfig>('assets/resources/data/hall-map/hall-season-fx.json');

export function createHallSeasonFxSuite(): TestSuite {
    const suite = new TestSuite('HallSeasonFx');

    suite.test('照設計稿數量撒在畫布內，大小與透明度在範圍內', () => {
        const ps = spawnHallSeasonParticles(CONFIG, 'spring');
        assert.lengthEquals(CONFIG.count, ps, '數量');
        for (const p of ps) {
            assert.inRange(p.baseX, -960, 960, 'x');
            assert.inRange(p.y, -540, 540, 'y');
            assert.inRange(p.width, CONFIG.size.min, CONFIG.size.max, '寬');
            assert.inRange(p.opacity, CONFIG.opacity.min, CONFIG.opacity.max, '透明度');
        }
    });

    suite.test('固定種子：兩次撒出相同結果', () => {
        const a = spawnHallSeasonParticles(CONFIG, 'winter').map(p => p.baseX.toFixed(3)).join(',');
        const b = spawnHallSeasonParticles(CONFIG, 'winter').map(p => p.baseX.toFixed(3)).join(',');
        assert.equals(a, b, '可重現');
    });

    suite.test('夏季螢火使用固定尺寸', () => {
        const fixed = CONFIG.seasons.summer.fixedSize!;
        for (const p of spawnHallSeasonParticles(CONFIG, 'summer')) {
            assert.equals(p.width, fixed, '寬');
            assert.equals(p.height, fixed, '高');
        }
    });

    suite.test('秋葉往下落、夏螢往上飄', () => {
        const autumn = spawnHallSeasonParticles(CONFIG, 'autumn');
        const y0 = autumn[0].y;
        stepHallSeasonParticles(autumn, CONFIG, 'autumn', 0.1);
        assert.isTrue(autumn[0].y < y0 || autumn[0].y > 540, '秋葉下落（或已繞回頂端）');
        const summer = spawnHallSeasonParticles(CONFIG, 'summer');
        const s0 = summer[0].y;
        stepHallSeasonParticles(summer, CONFIG, 'summer', 0.1);
        assert.isTrue(summer[0].y > s0 || summer[0].y < -540, '夏螢上飄（或已繞回底端）');
    });

    suite.test('長時間推進後粒子仍留在畫布附近，數量不變', () => {
        const ps = spawnHallSeasonParticles(CONFIG, 'autumn');
        for (let i = 0; i < 600; i++) stepHallSeasonParticles(ps, CONFIG, 'autumn', 0.1);
        assert.lengthEquals(CONFIG.count, ps, '數量');
        const style = CONFIG.seasons.autumn;
        for (const p of ps) {
            assert.inRange(p.y, -540 - p.height * 2, 540 + p.height * 2, 'y 循環');
            assert.inRange(hallSeasonParticleX(p, style), -960 - p.width * 2 - style.swayPx * 3, 960 + p.width * 2 + style.swayPx * 3, 'x 循環');
        }
    });

    suite.test('手機粒子數封頂、桌機照設計稿（PROG-2-9175）', () => {
        assert.equals(CONFIG.count, hallSeasonParticleCount(CONFIG, false));
        assert.equals(Math.min(CONFIG.count, HALL_FX_MOBILE_MAX_COUNT), hallSeasonParticleCount(CONFIG, true));
        assert.isTrue(hallSeasonParticleCount(CONFIG, true) < CONFIG.count, '手機粒子數要比桌機少');
        const mobile = spawnHallSeasonParticles(CONFIG, 'winter', hallSeasonParticleCount(CONFIG, true));
        assert.equals(HALL_FX_MOBILE_MAX_COUNT, mobile.length);
        assert.equals(CONFIG.count, spawnHallSeasonParticles(CONFIG, 'winter').length);
        // 要求數量超過設定時不超撒
        assert.equals(CONFIG.count, spawnHallSeasonParticles(CONFIG, 'winter', CONFIG.count + 500).length);
    });

    suite.test('只有夏螢大光暈才多畫光暈橢圓；冬雪不畫（PROG-2-9175）', () => {
        assert.isTrue(hallSeasonDrawsGlow(CONFIG.seasons.summer));
        assert.isTrue(!hallSeasonDrawsGlow(CONFIG.seasons.winter));
        assert.isTrue(!hallSeasonDrawsGlow(CONFIG.seasons.spring));
        assert.isTrue(!hallSeasonDrawsGlow(CONFIG.seasons.autumn));
    });

    suite.test('降頻重畫間隔約 30Hz；累積時間推進的位移與逐幀推進相同（PROG-2-9175）', () => {
        assert.isTrue(HALL_FX_REDRAW_INTERVAL_SEC > 1 / 61 && HALL_FX_REDRAW_INTERVAL_SEC < 1 / 20);
        const a = spawnHallSeasonParticles(CONFIG, 'winter');
        const b = spawnHallSeasonParticles(CONFIG, 'winter');
        for (let i = 0; i < 10; i++) stepHallSeasonParticles(a, CONFIG, 'winter', 1 / 60);
        stepHallSeasonParticles(b, CONFIG, 'winter', 10 / 60);
        for (let i = 0; i < a.length; i++) {
            assert.isTrue(Math.abs(a[i].y - b[i].y) < 1e-6, '落下位移一致');
        }
    });

    return suite;
}
