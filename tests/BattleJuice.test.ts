/**
 * BattleJuice.test.ts — 戰場打擊感參數與計算（PROG-2-10239）
 *
 * 1. 參數解析：預設值、欄位錯誤逐項退回預設、實際 JSON 檔可解析。
 * 2. 頓格秒數：普攻／暴擊／奧義、maxSec 上限、開關關閉回舊版值。
 * 3. 鏡頭震動：等級對應、衰減到 0、結束後歸零、疊震只取更強、關閉時舊規則。
 * 4. 跳字倍率與擊退倍率；關閉時為 1（行為不變）。
 * 5. 全場頓格限流與奧義時間窗。
 */
import { TestSuite, assert } from './TestRunner';
import {
    DEFAULT_BATTLE_JUICE, HitStopGate, burstColor, sparkSpecFor, applyJuicePrefs, parseJuicePrefs, LEGACY_HIT_STOP_SEC, LEGACY_SHAKE, UltimateWindow, attackEaseFor, attackLungeTotalSec, easeValue, flashCurveFor, floatPopMul, floatOffset,
    fxSpecFor, hitStopSecFor, knockbackMul, moveEaseFor, parseBattleJuice, resolveHitKind, sampleAttackLunge, sampleRing, sampleShake, shakeEnvelope,
    shakeParamsFor, shakeRemainingStrength, shakeTierFor, shouldReplaceShake,
    type BattleJuiceConfig, type EaseName, type RingSample,
} from '../assets/scripts/battle/shared/BattleJuice';

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const clone = (): BattleJuiceConfig => JSON.parse(JSON.stringify(DEFAULT_BATTLE_JUICE)) as BattleJuiceConfig;

export function createBattleJuiceSuite(): TestSuite {
    const suite = new TestSuite('BattleJuice (戰場打擊感 PROG-2-10239)');

    suite.test('爆點色階：暖白→橙→暗紅單調變化，端點精確', () => {
        const pal = DEFAULT_BATTLE_JUICE.burstPalette;
        const out: [number, number, number] = [0, 0, 0];
        burstColor(0, pal, out);
        assert.equals(JSON.stringify(out), JSON.stringify(pal.white));
        burstColor(0.45, pal, out);
        assert.equals(JSON.stringify(out), JSON.stringify(pal.orange));
        burstColor(1, pal, out);
        assert.equals(JSON.stringify(out), JSON.stringify(pal.red));
        burstColor(0.2, pal, out);
        assert.isTrue(out[1] < pal.white[1] && out[1] > pal.orange[1]);
    });

    suite.test('火花規格：依命中種類取，數量與時長隨種類遞增、主體 0.25～0.35 秒', () => {
        const n = sparkSpecFor('normal'), c = sparkSpecFor('crit'), u = sparkSpecFor('ultimate');
        assert.isTrue(n.count < c.count && c.count < u.count);
        for (const sp of [n, c, u]) assert.isTrue(sp.sec >= 0.25 && sp.sec <= 0.35);
        const bad = parseBattleJuice({ sparks: { crit: { count: -4, sec: 99 } } });
        assert.equals(DEFAULT_BATTLE_JUICE.sparks.crit.count, bad.sparks.crit.count);
        assert.equals(DEFAULT_BATTLE_JUICE.sparks.crit.sec, bad.sparks.crit.sec);
    });

    suite.test('解析：空輸入與壞輸入都回預設', () => {
        assert.equals(JSON.stringify(DEFAULT_BATTLE_JUICE), JSON.stringify(parseBattleJuice(null)));
        assert.equals(JSON.stringify(DEFAULT_BATTLE_JUICE), JSON.stringify(parseBattleJuice('x')));
        assert.equals(JSON.stringify(DEFAULT_BATTLE_JUICE), JSON.stringify(parseBattleJuice({ hitStop: 5, cameraShake: [] })));
    });

    suite.test('解析：欄位錯誤逐項退回預設，其餘欄位照用', () => {
        const c = parseBattleJuice({ hitStop: { normalSec: 0.03, critSec: -1, scope: 'all', enabled: 'yes' }, cameraShake: { tiers: { heavy: { strength: 0.2, durationSec: 'x' } }, crit: 'huge', ultimate: null } });
        assert.isTrue(near(c.hitStop.normalSec, 0.03));
        assert.isTrue(near(c.hitStop.critSec, DEFAULT_BATTLE_JUICE.hitStop.critSec));
        assert.equals('all', c.hitStop.scope);
        assert.isTrue(c.hitStop.enabled);
        assert.isTrue(near(c.cameraShake.tiers.heavy.strength, 0.2));
        assert.isTrue(near(c.cameraShake.tiers.heavy.durationSec, DEFAULT_BATTLE_JUICE.cameraShake.tiers.heavy.durationSec));
        assert.equals('medium', c.cameraShake.crit);
        assert.equals(null, c.cameraShake.ultimate);
    });

    suite.test('解析：實際 data/battle-juice.json 與預設值一致', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const raw = require('../assets/resources/data/battle-juice.json');
        assert.equals(JSON.stringify(DEFAULT_BATTLE_JUICE), JSON.stringify(parseBattleJuice(raw)));
    });

    suite.test('頓格：普攻 50ms、暴擊 80ms、奧義 120ms，且普攻<暴擊<奧義', () => {
        assert.isTrue(near(hitStopSecFor('normal'), 0.05));
        assert.isTrue(near(hitStopSecFor('crit'), 0.08));
        assert.isTrue(near(hitStopSecFor('ultimate'), 0.12));
    });

    suite.test('頓格：maxSec 上限與關閉時回舊版固定值', () => {
        const c = clone();
        c.hitStop.ultimateSec = 0.9;
        assert.isTrue(near(hitStopSecFor('ultimate', c), c.hitStop.maxSec));
        c.hitStop.enabled = false;
        assert.isTrue(near(hitStopSecFor('normal', c), LEGACY_HIT_STOP_SEC));
        assert.isTrue(near(hitStopSecFor('ultimate', c), LEGACY_HIT_STOP_SEC));
    });

    suite.test('命中種類：奧義時間窗優先、其次爆擊', () => {
        assert.equals('normal', resolveHitKind(false, false));
        assert.equals('crit', resolveHitKind(true, false));
        assert.equals('ultimate', resolveHitKind(true, true));
        assert.equals('ultimate', resolveHitKind(false, true));
    });

    suite.test('震動等級：重擊輕、爆擊中、奧義重；一般命中不震；關閉時沿用舊規則（只有重擊震）', () => {
        assert.equals(null, shakeTierFor('normal', false));
        assert.equals('light', shakeTierFor('normal', true));
        assert.equals('medium', shakeTierFor('crit', true));
        assert.equals('heavy', shakeTierFor('ultimate', false));
        const off = clone();
        off.cameraShake.enabled = false;
        assert.equals(null, shakeTierFor('ultimate', false, off));
        assert.equals('medium', shakeTierFor('normal', true, off));
        const p = shakeParamsFor('heavy', off);
        assert.isTrue(near(p.strength, LEGACY_SHAKE.strength) && near(p.durationSec, LEGACY_SHAKE.durationSec));
    });

    suite.test('震動：輕<中<重（振幅與時間）', () => {
        const t = DEFAULT_BATTLE_JUICE.cameraShake.tiers;
        assert.isTrue(t.light.strength < t.medium.strength && t.medium.strength < t.heavy.strength);
        assert.isTrue(t.light.durationSec < t.medium.durationSec && t.medium.durationSec < t.heavy.durationSec);
    });

    suite.test('震動衰減：包絡 1→0 單調下降，結束後位移為 0', () => {
        assert.isTrue(near(shakeEnvelope(0, 2), 1));
        assert.isTrue(near(shakeEnvelope(1, 2), 0));
        let prev = 1;
        for (let i = 1; i <= 10; i++) { const e = shakeEnvelope(i / 10, 2); assert.isTrue(e <= prev); prev = e; }
        const tier = DEFAULT_BATTLE_JUICE.cameraShake.tiers.heavy;
        const out = { x: 9, y: 9 };
        sampleShake(tier.durationSec, tier, 2, out);
        assert.isTrue(out.x === 0 && out.y === 0);
        sampleShake(tier.durationSec * 3, tier, 2, out);
        assert.isTrue(out.x === 0 && out.y === 0);
    });

    suite.test('震動取樣：振幅不超過 strength，後段比前段小，且重用同一個輸出物件', () => {
        const tier = DEFAULT_BATTLE_JUICE.cameraShake.tiers.heavy;
        const out = { x: 0, y: 0 };
        let early = 0, late = 0;
        for (let i = 0; i < 200; i++) {
            const t = tier.durationSec * i / 200;
            const r = sampleShake(t, tier, 2, out);
            assert.isTrue(r === out);
            assert.isTrue(Math.abs(out.x) <= tier.strength + 1e-9 && Math.abs(out.y) <= tier.strength * 0.6 + 1e-9);
            if (i < 100) early = Math.max(early, Math.abs(out.x)); else late = Math.max(late, Math.abs(out.x));
        }
        assert.isTrue(late < early * 0.5, `early=${early} late=${late}`);
    });

    suite.test('疊震：只有更強的才取代，不會疊加', () => {
        const tiers = DEFAULT_BATTLE_JUICE.cameraShake.tiers;
        const remaining = shakeRemainingStrength(0.01, tiers.medium, 2);
        assert.isTrue(remaining > 0 && remaining <= tiers.medium.strength);
        assert.isTrue(!shouldReplaceShake(remaining, tiers.light));
        assert.isTrue(shouldReplaceShake(remaining, tiers.heavy));
        assert.isTrue(near(shakeRemainingStrength(tiers.medium.durationSec, tiers.medium, 2), 0));
    });

    suite.test('跳字倍率：暴擊最大；關閉時全為 1', () => {
        // 實際峰值＝樣式表 peakScale × 倍率：爆擊約 1.3 倍（0.12 秒內縮回），不再放大到 2 倍以上蓋住單位
        assert.isTrue(near(2.0 * floatPopMul('crit').peak, 1.3), `爆擊有效峰值=${2.0 * floatPopMul('crit').peak}`);
        assert.isTrue(floatPopMul('crit').popIn < 1, '彈出更快');
        const off = clone();
        off.floatPop.enabled = false;
        const m = floatPopMul('crit', off);
        assert.isTrue(m.peak === 1 && m.popIn === 1);
    });

    suite.test('跳字偏移：偏頭頂右上（x>0、y>0），爆擊比一般更遠；關閉回 0', () => {
        const n = floatOffset('normal'), c = floatOffset('crit');
        assert.isTrue(n.x > 0 && n.y > 0 && c.x >= n.x && c.y >= n.y);
        const off = clone();
        off.floatPop.enabled = false;
        const z = floatOffset('crit', off);
        assert.isTrue(z.x === 0 && z.y === 0);
    });

    suite.test('擊退倍率：關閉為 1、開啟用 ratioMul', () => {
        const c = clone();
        c.knockback.ratioMul = 1.5;
        assert.isTrue(near(knockbackMul('normal', c), 1.5));
        c.knockback.enabled = false;
        assert.isTrue(near(knockbackMul('normal', c), 1));
    });

    suite.test('全場頓格限流：間隔內不放行、間隔後放行', () => {
        const g = new HitStopGate();
        assert.isTrue(g.allow(10, 0.35));
        assert.isTrue(!g.allow(10.2, 0.35));
        assert.isTrue(g.allow(10.4, 0.35));
        g.reset();
        assert.isTrue(g.allow(10.41, 0.35));
    });

    suite.test('奧義時間窗：mark 後 windowSec 內有效，過期後失效', () => {
        const w = new UltimateWindow();
        assert.isTrue(!w.isActive(0));
        w.mark(100, 4);
        assert.isTrue(w.isActive(103.9));
        assert.isTrue(!w.isActive(104));
        w.reset();
        assert.isTrue(!w.isActive(101));
    });

    // ───────── PROG-2-10243 第二批 ─────────

    suite.test('閃白曲線：依命中種類取不同曲線；關閉回 null（沿用舊曲線）', () => {
        const c = clone();
        assert.isTrue(flashCurveFor('normal', c)!.holdFrames === 2);
        assert.isTrue(flashCurveFor('crit', c)!.holdFrames > flashCurveFor('normal', c)!.holdFrames);
        assert.isTrue(flashCurveFor('ultimate', c)!.fadeSec > flashCurveFor('crit', c)!.fadeSec);
        c.flash.enabled = false;
        assert.isTrue(flashCurveFor('crit', c) === null);
    });

    suite.test('擊退倍率：爆擊、奧義退更遠；關閉全為 1', () => {
        const c = clone();
        assert.isTrue(near(knockbackMul('normal', c), 1));
        assert.isTrue(knockbackMul('crit', c) > 1 && knockbackMul('ultimate', c) > knockbackMul('crit', c));
        c.knockback.enabled = false;
        assert.isTrue(near(knockbackMul('ultimate', c), 1));
    });

    suite.test('緩動函式：端點為 0 與 1、範圍外夾住、單調', () => {
        const names: EaseName[] = ['linear', 'quadIn', 'quadOut', 'quadInOut', 'sineIn', 'sineOut', 'sineInOut', 'cubicIn', 'cubicOut', 'cubicInOut', 'backOut'];
        for (const n of names) {
            assert.isTrue(near(easeValue(n, 0), 0, 1e-9), n + ' 起點');
            assert.isTrue(near(easeValue(n, 1), 1, 1e-9), n + ' 終點');
            assert.isTrue(near(easeValue(n, -3), 0) && near(easeValue(n, 9), 1), n + ' 夾住');
        }
        assert.isTrue(easeValue('quadIn', 0.5) < 0.5 && easeValue('quadOut', 0.5) > 0.5);
        assert.isTrue(easeValue('backOut', 0.8) > 1, 'backOut 會過衝');
    });

    suite.test('攻擊三段：預備往後（負）→ 出手到最前 → 收招回 0', () => {
        const a = DEFAULT_BATTLE_JUICE.ease.attack;
        assert.isTrue(near(sampleAttackLunge(0, a), 0));
        assert.isTrue(sampleAttackLunge(a.windUpSec, a) < 0, '預備段結束應在後方');
        assert.isTrue(near(sampleAttackLunge(a.windUpSec, a), -a.windUpPx, 1e-6));
        assert.isTrue(near(sampleAttackLunge(a.windUpSec + a.strikeSec + a.holdSec * 0.5, a), a.forwardPx, 1e-6));
        assert.isTrue(near(sampleAttackLunge(attackLungeTotalSec(a), a), 0));
        assert.isTrue(near(sampleAttackLunge(attackLungeTotalSec(a) + 5, a), 0));
        assert.isTrue(attackLungeTotalSec(a) > a.windUpSec + a.strikeSec);
    });

    suite.test('攻擊三段與移動緩動：關閉時回舊版（無三段、移動 linear）', () => {
        const c = clone();
        assert.isTrue(attackEaseFor(c) !== null);
        assert.equals(moveEaseFor(false, c), 'sineInOut');
        assert.equals(moveEaseFor(true, c), 'linear');
        c.ease.enabled = false;
        assert.isTrue(attackEaseFor(c) === null);
        assert.equals(moveEaseFor(false, c), 'linear');
    });

    suite.test('衝擊環：半徑外擴、越擴越淡越細，結束歸零；大小隨命中種類遞增', () => {
        const out: RingSample = { radius: 0, alpha: 0, width: 0 };
        const spec = fxSpecFor('impactRing', 'crit');
        const r0 = sampleRing(0, spec, out).radius;
        const a0 = out.alpha; const w0 = out.width;
        const r1 = sampleRing(0.6, spec, out).radius;
        assert.isTrue(r1 > r0 && out.alpha < a0 && out.width < w0);
        assert.isTrue(near(sampleRing(1, spec, out).alpha, 0));
        assert.isTrue(fxSpecFor('impactRing', 'ultimate').radiusPx > fxSpecFor('impactRing', 'crit').radiusPx);
        assert.isTrue(fxSpecFor('impactRing', 'crit').radiusPx > fxSpecFor('impactRing', 'normal').radiusPx);
    });

    suite.test('解析：第二批欄位錯誤逐項退回預設（未知緩動名、壞顏色、超範圍數值）', () => {
        const c = parseBattleJuice({
            ease: { attack: { windUpEase: 'bounce', forwardPx: 9999, strikeSec: 0.1 }, move: { startEase: 'cubicOut' } },
            impactRing: { normal: { color: [300, 0, 0], radiusPx: 50 }, maxActive: 3 },
            flash: { crit: { holdFrames: 5 } },
            bladeTrail: { enabled: false },
            afterimage: { count: 'x' },
        });
        const d = DEFAULT_BATTLE_JUICE;
        assert.equals(c.ease.attack.windUpEase, d.ease.attack.windUpEase);
        assert.isTrue(c.ease.attack.forwardPx === d.ease.attack.forwardPx);
        assert.isTrue(near(c.ease.attack.strikeSec, 0.1));
        assert.equals(c.ease.move.startEase, 'cubicOut');
        assert.equals(JSON.stringify(c.impactRing.normal.color), JSON.stringify(d.impactRing.normal.color));
        assert.isTrue(c.impactRing.normal.radiusPx === 50 && c.impactRing.maxActive === 3);
        assert.isTrue(c.flash.crit.holdFrames === 5 && c.flash.crit.fadeSec === d.flash.crit.fadeSec);
        assert.isTrue(c.bladeTrail.enabled === false);
        assert.isTrue(c.afterimage.count === d.afterimage.count);
    });

    suite.test('玩家偏好：預設全開；壞字串回預設；偏好只會關閉不會打開', () => {
        const d = parseJuicePrefs(null);
        assert.isTrue(d.hitStop && d.cameraShake);
        assert.isTrue(parseJuicePrefs('{bad').hitStop === true);
        const off = parseJuicePrefs('{"hitStop":false}');
        assert.isTrue(off.hitStop === false && off.cameraShake === true);
        const c = applyJuicePrefs(DEFAULT_BATTLE_JUICE, off);
        assert.isTrue(c.hitStop.enabled === false && c.cameraShake.enabled === true);
        assert.isTrue(hitStopSecFor('crit', c) === LEGACY_HIT_STOP_SEC, '關閉頓格回舊版固定值');
        const jsonOff = clone(); jsonOff.cameraShake.enabled = false;
        assert.isTrue(applyJuicePrefs(jsonOff, parseJuicePrefs(null)).cameraShake.enabled === false);
        assert.isTrue(DEFAULT_BATTLE_JUICE.hitStop.enabled === true, '不改傳入物件');
    });

    return suite;
}
