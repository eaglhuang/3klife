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
    DEFAULT_BATTLE_JUICE, HitStopGate, LEGACY_HIT_STOP_SEC, LEGACY_SHAKE, UltimateWindow, floatPopMul, hitStopSecFor, knockbackMul,
    parseBattleJuice, resolveHitKind, sampleShake, shakeEnvelope, shakeParamsFor, shakeRemainingStrength, shakeTierFor, shouldReplaceShake,
    type BattleJuiceConfig,
} from '../assets/scripts/battle/shared/BattleJuice';

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
const clone = (): BattleJuiceConfig => JSON.parse(JSON.stringify(DEFAULT_BATTLE_JUICE)) as BattleJuiceConfig;

export function createBattleJuiceSuite(): TestSuite {
    const suite = new TestSuite('BattleJuice (戰場打擊感 PROG-2-10239)');

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
        assert.isTrue(floatPopMul('crit').peak >= floatPopMul('normal').peak);
        const off = clone();
        off.floatPop.enabled = false;
        const m = floatPopMul('crit', off);
        assert.isTrue(m.peak === 1 && m.popIn === 1);
    });

    suite.test('擊退倍率：關閉為 1、開啟用 ratioMul', () => {
        const c = clone();
        c.knockback.ratioMul = 1.5;
        assert.isTrue(near(knockbackMul(c), 1.5));
        c.knockback.enabled = false;
        assert.isTrue(near(knockbackMul(c), 1));
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

    return suite;
}
