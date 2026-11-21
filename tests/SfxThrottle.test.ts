/**
 * SfxThrottle — 戰鬥音效疊音節流（PROG-2-9439）
 *
 * 覆蓋：同一毫秒多份只播一份、合併窗外可再播、單檔每秒上限、全體每秒上限、豁免 clip、設定檔解析與預設值。
 *
 * Unity 對照：EditMode 測試 AudioManager 的 voice limiting。
 */
import { assert, TestSuite } from './TestRunner';
import { DEFAULT_SFX_THROTTLE, SfxThrottle, parseSfxThrottleConfig } from '../assets/scripts/battle/shared/SfxThrottle';

const cfg = (over: Partial<typeof DEFAULT_SFX_THROTTLE> = {}) => ({ ...DEFAULT_SFX_THROTTLE, perClipMaxPerSecond: { footstep: 6 }, exemptClips: ['light'], ...over });

export function createSfxThrottleSuite(): TestSuite {
    const suite = new TestSuite('SfxThrottle (戰鬥音效疊音節流 PROG-2-9439)');

    suite.test('三隊同一毫秒的腳步聲只播一份；合併窗外可再播', () => {
        const t = new SfxThrottle(cfg());
        const r = [t.allow('footstep', 1000), t.allow('footstep', 1000), t.allow('footstep', 1001)];
        assert.equals('true,false,false', r.join(','));
        assert.isTrue(!t.allow('footstep', 1059), '59ms 內仍合併');
        assert.isTrue(t.allow('footstep', 1060), '60ms 後可再播');
    });

    suite.test('不同 clip 互不合併', () => {
        const t = new SfxThrottle(cfg());
        assert.isTrue(t.allow('hurt', 0) && t.allow('weapon', 0) && t.allow('shield', 0), '同時三種都要播');
    });

    suite.test('footstep 每秒最多 6 次', () => {
        const t = new SfxThrottle(cfg());
        let n = 0;
        for (let ms = 0; ms < 1000; ms += 70) if (t.allow('footstep', ms)) n += 1;
        assert.equals(6, n);
        assert.isTrue(t.allow('footstep', 1100), '一秒窗過了又能播');
    });

    suite.test('全體每秒上限；豁免 clip 不受限', () => {
        const t = new SfxThrottle(cfg({ maxPerSecond: 3 }));
        const r = ['hurt', 'weapon', 'shield', 'bite'].map(c => t.allow(c, 10));
        assert.equals('true,true,true,false', r.join(','));
        assert.isTrue(t.allow('light', 20), '回合開始提示豁免每秒上限');
    });

    suite.test('設定檔解析：正常值照用，缺漏或格式錯誤用預設', () => {
        const ok = parseSfxThrottleConfig({ sfxThrottle: { sameClipWindowMs: 80, maxPerSecond: 10, perClipMaxPerSecond: { footstep: 4, bad: 'x' }, exemptClips: ['light', 3] } });
        assert.equals(80, ok.sameClipWindowMs);
        assert.equals(10, ok.maxPerSecond);
        assert.equals(4, ok.perClipMaxPerSecond.footstep);
        assert.isTrue(!('bad' in ok.perClipMaxPerSecond), '非數字略過');
        assert.equals('light', ok.exemptClips.join(','));
        const bad = parseSfxThrottleConfig(null);
        assert.equals(DEFAULT_SFX_THROTTLE.sameClipWindowMs, bad.sameClipWindowMs);
        assert.equals(DEFAULT_SFX_THROTTLE.perClipMaxPerSecond.footstep, bad.perClipMaxPerSecond.footstep);
        const neg = parseSfxThrottleConfig({ sfxThrottle: { sameClipWindowMs: -5, maxPerSecond: 'a' } });
        assert.equals(DEFAULT_SFX_THROTTLE.sameClipWindowMs, neg.sameClipWindowMs);
        assert.equals(DEFAULT_SFX_THROTTLE.maxPerSecond, neg.maxPerSecond);
    });

    suite.test('正式設定檔可解析，footstep 有上限', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const raw = require('../assets/resources/data/battle-audio.json');
        const c = parseSfxThrottleConfig(raw);
        assert.isTrue(c.perClipMaxPerSecond.footstep > 0, 'footstep 上限 > 0');
        assert.isTrue(c.sameClipWindowMs > 0, '合併窗 > 0');
    });

    return suite;
}
