// PROG-2-10100：洪流漂流姿態（沉浮＋傾斜）與水花粒子的純邏輯測試
import { FLOOD_DRIFT_TUNING, FLOOD_SPLASH_SPEC, dustCountFor, floodDriftSample, rollDustParticle } from '../assets/scripts/battle/shared/MoveFeedback';
import { TestSuite, assert } from './TestRunner';

export function createFloodDriftSuite(): TestSuite {
    const suite = new TestSuite('FloodDrift');

    suite.test('漂流沉浮不超過幅度且會上下擺動（有正有負）', () => {
        let min = Infinity, max = -Infinity, tiltMax = 0;
        for (let t = 0; t < 3; t += 0.05) {
            const s = floodDriftSample(t);
            min = Math.min(min, s.dy); max = Math.max(max, s.dy); tiltMax = Math.max(tiltMax, Math.abs(s.angle));
        }
        assert.isTrue(max <= FLOOD_DRIFT_TUNING.bobPx + 1e-9 && min >= -FLOOD_DRIFT_TUNING.bobPx - 1e-9, '沉浮超出幅度');
        assert.isTrue(max > 0 && min < 0, '沉浮沒有上下擺動');
        assert.isTrue(tiltMax > 1 && tiltMax <= FLOOD_DRIFT_TUNING.tiltDeg + 1e-9, `傾斜 ${tiltMax}`);
    });

    suite.test('相位不同的隊員姿態不同步；非法時鐘回正', () => {
        const a = floodDriftSample(0.3, 0), b = floodDriftSample(0.3, 0.35);
        assert.isTrue(Math.abs(a.dy - b.dy) > 0.1, '隊員沉浮同步');
        const bad = floodDriftSample(Number.NaN);
        assert.isTrue(bad.dy === 0 && bad.angle === 0, 'NaN 應回正');
        const neg = floodDriftSample(-1);
        assert.isTrue(neg.dy === 0 && neg.angle === 0, '負時鐘應回正');
    });

    suite.test('水花粒子：濁水色、壽命短、有數量，並共用揚塵的擲點函式', () => {
        assert.isTrue(FLOOD_SPLASH_SPEC.kind === 'splash', '種類');
        const n = dustCountFor(FLOOD_SPLASH_SPEC, true, () => 0);
        assert.isTrue(n === FLOOD_SPLASH_SPEC.particleMin && n > 0, '帶頭者數量');
        const p = rollDustParticle(FLOOD_SPLASH_SPEC, () => 0.5);
        assert.isTrue(p.lifeSec < 0.8 && p.lifeSec > 0.3, `壽命 ${p.lifeSec}`);
        assert.isTrue(p.color.b > p.color.r, `水花應偏青白而非土黃 ${JSON.stringify(p.color)}`);
        assert.isTrue(p.rise > 25, '水花應飄得比塵高');
    });

    return suite;
}
