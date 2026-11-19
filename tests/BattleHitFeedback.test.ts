/**
 * BattleHitFeedback.test.ts — 受擊表現與跳傷害字（PROG-2-9401）
 *
 * 1. 抖動：分段位移總長、最後歸零、取樣與分段一致、幅度為格寬 4～6%。
 * 2. 閃白：強度由 1 線性衰減到 0，結束後為 0。
 * 3. 受擊回饋規劃：致命一擊只閃白；重擊／爆擊才有畫面震動。
 * 4. 飄字樣式：一般白、爆擊金色大字且有放大回彈、治療綠、閃避灰；全部有描邊。
 * 5. 同單位連續跳字的錯開位移與視窗計算。
 *
 * Unity 對照：EditMode 測試 HitFlash / DamagePopup 的純計算部分。
 */
import { TestSuite, assert } from './TestRunner';
import {
    BATTLE_VISUAL_TIMING, buildHitShakeSteps, hitFlashStrength, isHeavyHit, planHitFeedback, sampleHitShake,
} from '../assets/scripts/battle/views/BattlePresentationTiming';
import {
    FLOAT_MISS_TEXT, FLOAT_STAGGER_WINDOW_MS, FLOAT_TEXT_STYLES, FloatStaggerTracker, floatEffectiveHeight, floatStaggerOffset,
    type FloatRgba, type FloatTextType,
} from '../assets/scripts/core/systems/FloatTextStyle';

const same = (expected: unknown, actual: unknown): void => assert.equals(JSON.stringify(expected), JSON.stringify(actual));
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

export function createBattleHitFeedbackSuite(): TestSuite {
    const suite = new TestSuite('BattleHitFeedback (受擊白閃抖動與跳字 PROG-2-9401)');

    suite.test('抖動分段：總長 = hitShakeSec、兩個來回、最後一步歸零', () => {
        const steps = buildHitShakeSteps(10);
        const total = steps.reduce((sum, s) => sum + s.durationSec, 0);
        assert.isTrue(near(total, BATTLE_VISUAL_TIMING.hitShakeSec), `總長 ${total}`);
        assert.equals(5, steps.length);
        assert.equals(10, steps[0].offsetX);   // 先右
        assert.equals(-10, steps[1].offsetX);  // 再左
        assert.equals(0, steps[steps.length - 1].offsetX); // 回原位，不改格子位置
        // 兩個來回：符號變化 + - + - 0
        const signs = steps.slice(0, 4).map(s => Math.sign(s.offsetX));
        assert.equals('1,-1,1,-1', signs.join(','));
    });

    suite.test('抖動取樣：起點、終點與超出範圍皆為 0；與分段終點一致', () => {
        const amp = 8;
        assert.equals(0, sampleHitShake(0, amp));
        assert.equals(0, sampleHitShake(BATTLE_VISUAL_TIMING.hitShakeSec, amp));
        assert.equals(0, sampleHitShake(BATTLE_VISUAL_TIMING.hitShakeSec + 1, amp));
        assert.equals(0, sampleHitShake(0.05, 0), '幅度 0 不抖');
        assert.equals(0, sampleHitShake(-1, amp));
        // 每一步結束時刻的取樣值要等於該步的位移（內插端點一致）
        const steps = buildHitShakeSteps(amp);
        let t = 0;
        steps.slice(0, -1).forEach(step => {
            t += step.durationSec;
            assert.isTrue(near(sampleHitShake(t - 1e-9, amp), step.offsetX, 1e-4), `t=${t}`);
        });
        // 任何時刻都不超過幅度
        for (let e = 0; e < BATTLE_VISUAL_TIMING.hitShakeSec; e += 0.003) {
            assert.isTrue(Math.abs(sampleHitShake(e, amp)) <= amp + 1e-9);
        }
    });

    suite.test('抖動幅度比例落在格寬 4%～6%，時間約 0.15 秒、閃白約 0.08 秒', () => {
        assert.isTrue(BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio >= 0.04 && BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio <= 0.06);
        assert.isTrue(near(BATTLE_VISUAL_TIMING.hitShakeSec, 0.15));
        assert.isTrue(near(BATTLE_VISUAL_TIMING.hitFlashSec, 0.08));
        assert.isTrue(near(BATTLE_VISUAL_TIMING.hitScreenShakeSec, 0.12));
    });

    suite.test('閃白強度：開頭 1、線性衰減、結束後 0', () => {
        assert.equals(1, hitFlashStrength(0));
        assert.isTrue(near(hitFlashStrength(BATTLE_VISUAL_TIMING.hitFlashSec / 2), 0.5));
        assert.equals(0, hitFlashStrength(BATTLE_VISUAL_TIMING.hitFlashSec));
        assert.equals(0, hitFlashStrength(1));
        assert.equals(0, hitFlashStrength(-0.01));
    });

    suite.test('重擊判斷：爆擊一律算；否則看單次傷害占最大血量比例', () => {
        assert.isTrue(isHeavyHit(1, 1000, true));
        assert.isTrue(isHeavyHit(200, 1000, false));
        assert.isFalse(isHeavyHit(199, 1000, false));
        assert.isFalse(isHeavyHit(50, 0, false), '最大血量未知不算重擊');
    });

    suite.test('受擊回饋規劃：致命一擊只閃白；重擊才畫面震動', () => {
        same({ flash: true, shake: true, screenShake: false }, planHitFeedback(false, false));
        same({ flash: true, shake: true, screenShake: true }, planHitFeedback(false, true));
        same({ flash: true, shake: false, screenShake: false }, planHitFeedback(true, true));
        same({ flash: true, shake: false, screenShake: false }, planHitFeedback(true, false));
    });

    suite.test('飄字樣式：一般傷害白字（我方、敵方一致）', () => {
        const white: FloatRgba = { r: 255, g: 255, b: 255, a: 255 };
        same(white, FLOAT_TEXT_STYLES.dmg_player.color);
        same(white, FLOAT_TEXT_STYLES.dmg_enemy.color);
    });

    suite.test('飄字樣式：爆擊金色、比一般大、放大後回彈', () => {
        const crit = FLOAT_TEXT_STYLES.dmg_crit;
        const normal = FLOAT_TEXT_STYLES.dmg_player;
        assert.isTrue(crit.color.r > 240 && crit.color.g > 180 && crit.color.b < 100, '金色');
        assert.isTrue(crit.fontSize > normal.fontSize);
        assert.isTrue(crit.peakScale > normal.peakScale && crit.peakScale >= 1.8, '爆擊放大幅度更大');
        assert.isTrue(crit.startScale < 1 && crit.popInSec > 0 && crit.settleSec > 0, '先放大再回彈到 1');
        assert.isTrue(crit.durationMs >= normal.durationMs);
    });

    suite.test('PROG-2-9412：重擊跳字介於一般與爆擊之間，顏色避開爆擊金與地形適性綠藍紅', () => {
        const heavy = FLOAT_TEXT_STYLES.dmg_heavy;
        const normal = FLOAT_TEXT_STYLES.dmg_player;
        const crit = FLOAT_TEXT_STYLES.dmg_crit;
        assert.isTrue(heavy.fontSize > normal.fontSize && heavy.fontSize < crit.fontSize, '字級介於中間');
        assert.isTrue(heavy.peakScale > normal.peakScale && heavy.peakScale < crit.peakScale, '彈出幅度介於中間');
        assert.isTrue(heavy.color.r > 240 && heavy.color.g < crit.color.g - 30 && heavy.color.b < 80, '橘色、明顯比爆擊金偏紅');
        const far = (c: FloatRgba, hex: number) => Math.abs(c.r - (hex >> 16)) + Math.abs(c.g - ((hex >> 8) & 255)) + Math.abs(c.b - (hex & 255)) > 120;
        [0x48C774, 0x3273DC, 0xF14668].forEach(hex => assert.isTrue(far(heavy.color, hex), `避開地形適性色 ${hex.toString(16)}`));
    });

    suite.test('飄字樣式：治療綠、閃避灰', () => {
        const heal = FLOAT_TEXT_STYLES.heal.color;
        assert.isTrue(heal.g > heal.r && heal.g > heal.b, '綠色為主');
        const miss = FLOAT_TEXT_STYLES.dmg_miss.color;
        assert.isTrue(Math.abs(miss.r - miss.g) <= 8 && Math.abs(miss.g - miss.b) <= 8 && miss.r < 220, '灰色');
        assert.equals('閃避', FLOAT_MISS_TEXT);
    });

    suite.test('飄字樣式：每一種都有描邊與有效動畫參數', () => {
        (Object.keys(FLOAT_TEXT_STYLES) as FloatTextType[]).forEach(type => {
            const s = FLOAT_TEXT_STYLES[type];
            assert.isTrue(s.outlineWidth > 0, `${type} 缺描邊`);
            assert.isTrue(s.durationMs > s.popInSec * 1000 + s.settleSec * 1000, `${type} 動畫比存在時間長`);
            assert.isTrue(s.startScale > 0 && s.peakScale > 0 && s.fontSize > 0);
        });
    });

    suite.test('錯開位移：前五個位置各不相同，第一個不位移，且循環不會無限往上', () => {
        same({ x: 0, y: 0 }, floatStaggerOffset(0));
        const seen = new Set<string>();
        for (let i = 0; i < 5; i++) { const o = floatStaggerOffset(i); seen.add(`${o.x},${o.y}`); }
        assert.equals(5, seen.size);
        same(floatStaggerOffset(0), floatStaggerOffset(5));
        let maxY = 0;
        for (let i = 0; i < 50; i++) maxY = Math.max(maxY, floatStaggerOffset(i).y);
        assert.isTrue(maxY <= 150);
    });

    suite.test('錯開追蹤：視窗內遞增、超過視窗歸零、不同單位互不影響', () => {
        const tracker = new FloatStaggerTracker();
        assert.equals(0, tracker.next('u1', 1000));
        assert.equals(1, tracker.next('u1', 1100));
        assert.equals(2, tracker.next('u1', 1100 + FLOAT_STAGGER_WINDOW_MS));
        assert.equals(0, tracker.next('u2', 1200), '另一單位從頭算');
        assert.equals(0, tracker.next('u1', 1100 + FLOAT_STAGGER_WINDOW_MS + FLOAT_STAGGER_WINDOW_MS + 1), '超過視窗重新計');
    });

    suite.test('PROG-2-9402 爆擊後 600 毫秒出閃避要錯開，且往下（y 為負）、間距比一般大', () => {
        const crit = FLOAT_TEXT_STYLES.dmg_crit;
        const miss = FLOAT_TEXT_STYLES.dmg_miss;
        const tracker = new FloatStaggerTracker();
        const a = tracker.place('g:1', 1000, crit.durationMs, floatEffectiveHeight(crit));
        assert.equals(0, a.index);
        const b = tracker.place('g:1', 1600, miss.durationMs, floatEffectiveHeight(miss));
        assert.equals(1, b.index, '爆擊還在畫面上（1100 毫秒 * 70% = 770）要錯開');
        assert.isTrue(b.y < -30 && b.x !== a.x, `y=${b.y} 要往下且超過最小間距 30`);
        // 舊字 600 毫秒已往上飄約 60 像素，新字在下方，兩者距離只會變大
        assert.isTrue(b.y < 0, '爆擊 600 毫秒後的閃避 y 偏移為負');
    });

    suite.test('PROG-2-9402 前一個字佔位時間過了才回第一格', () => {
        const crit = FLOAT_TEXT_STYLES.dmg_crit;
        const tracker = new FloatStaggerTracker();
        tracker.place('g:1', 1000, crit.durationMs, floatEffectiveHeight(crit));
        const late = tracker.place('g:1', 1000 + crit.durationMs * 0.7 + 1, FLOAT_TEXT_STYLES.dmg_miss.durationMs, 40);
        assert.equals(0, late.index);
        same({ x: 0, y: 0 }, { x: late.x, y: late.y });
    });

    suite.test('PROG-2-9402 連續長壽命字滿五格回第一格，垂直位移不超過上限', () => {
        const crit = FLOAT_TEXT_STYLES.dmg_crit;
        const tracker = new FloatStaggerTracker();
        const idx: number[] = [];
        let maxY = 0, minY = 0;
        for (let i = 0; i < 12; i++) {
            const p = tracker.place('g:1', 1000 + i * 50, crit.durationMs, floatEffectiveHeight(crit));
            idx.push(p.index);
            maxY = Math.max(maxY, p.y); minY = Math.min(minY, p.y);
        }
        same([0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1], idx);
        assert.isTrue(minY >= -160 && maxY <= 0, `minY=${minY} maxY=${maxY}`);
    });

    suite.test('錯開追蹤：大量過期單位會被清理，不無限成長', () => {
        const tracker = new FloatStaggerTracker();
        for (let i = 0; i < 200; i++) tracker.next(`u${i}`, i * 1000);
        const size = (tracker as unknown as { records: Map<string, unknown> }).records.size;
        assert.isTrue(size <= 65, `size=${size}`);
    });

    return suite;
}
