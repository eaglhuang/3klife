/**
 * StatusApplyFeedback — 狀態上身演出規則與分鏡音效替代（PROG-2-9435）
 *
 * 覆蓋：極性分類、控制／減益才縮、震波延遲由近到遠且有上限、同聲節流、
 * 分鏡缺檔音效替代、暫代圖分鏡帶音效、狀態飄字比以前大且停留更久。
 *
 * Unity 對照：像測 StatusEffect polarity 表與 Presenter 的純規則。
 */
import { assert, TestSuite } from './TestRunner';
import { StatusEffect } from '../assets/scripts/shared/CommonEnums';
import {
    STATUS_WAVE_MAX_SEC, StatusCueThrottle, statusFloatTypeOf, statusMakesTargetFlinch, statusPolarityOf, statusWaveDelaySec,
} from '../assets/scripts/battle/shared/StatusApplyFeedback';
import { buildPlaceholderCutinConfig, CUTIN_SFX_FALLBACK, CUTIN_ULT_TAIL_CLIP, resolveCutinSfxClip } from '../assets/scripts/shared/cutin/cutinSupport';
import { FLOAT_TEXT_STYLES } from '../assets/scripts/core/systems/FloatTextStyle';

export function createStatusApplyFeedbackSuite(): TestSuite {
    const suite = new TestSuite('StatusApplyFeedback (狀態上身演出 PROG-2-9435)');

    suite.test('極性：暈眩定身是控制、緩速虛弱封射是減益、無敵疾行堅盾是增益，未知當增益', () => {
        assert.equals('control', statusPolarityOf(StatusEffect.Stun));
        assert.equals('control', statusPolarityOf(StatusEffect.Rooted));
        assert.equals('debuff', statusPolarityOf(StatusEffect.Slow));
        assert.equals('debuff', statusPolarityOf(StatusEffect.Weak));
        assert.equals('debuff', statusPolarityOf(StatusEffect.NoShoot));
        assert.equals('buff', statusPolarityOf(StatusEffect.Invincible));
        assert.equals('buff', statusPolarityOf(StatusEffect.Haste));
        assert.equals('buff', statusPolarityOf(StatusEffect.Fortified));
        assert.equals('buff', statusPolarityOf('no-such-status'));
    });

    suite.test('控制與減益讓目標縮一下，增益不縮', () => {
        assert.isTrue(statusMakesTargetFlinch('control'));
        assert.isTrue(statusMakesTargetFlinch('debuff'));
        assert.isTrue(!statusMakesTargetFlinch('buff'));
    });

    suite.test('狀態飄字依極性分色：增益金綠、減益橘紅、控制紫，三種樣式顏色互不相同', () => {
        assert.equals('status_buff', statusFloatTypeOf('buff'));
        assert.equals('status_debuff', statusFloatTypeOf('debuff'));
        assert.equals('status_control', statusFloatTypeOf('control'));
        const key = (t: 'status_buff' | 'status_debuff' | 'status_control') => JSON.stringify(FLOAT_TEXT_STYLES[t].color);
        assert.equals(3, new Set([key('status_buff'), key('status_debuff'), key('status_control')]).size);
    });

    suite.test('震波：我方奧義暈敵軍，離我方越遠的敵軍越晚', () => {
        const near = statusWaveDelaySec('control', false, 2);
        const far = statusWaveDelaySec('control', false, 6);
        assert.isTrue(near < far, `${near} < ${far}`);
    });

    suite.test('震波：敵方奧義暈我軍，離敵方越遠（越靠我方底線）越晚', () => {
        assert.isTrue(statusWaveDelaySec('control', true, 6) < statusWaveDelaySec('control', true, 1));
    });

    suite.test('震波：增益從自己這一側往前推', () => {
        assert.equals(0, statusWaveDelaySec('buff', true, 0));
        assert.isTrue(statusWaveDelaySec('buff', true, 5) > 0);
        assert.equals(0, statusWaveDelaySec('buff', false, 7));
    });

    suite.test('震波延遲有上限，縱深超出範圍也不爆表', () => {
        for (let d = -3; d <= 12; d++) {
            const v = statusWaveDelaySec('debuff', false, d);
            assert.isTrue(v >= 0 && v <= STATUS_WAVE_MAX_SEC, `depth ${d} → ${v}`);
        }
    });

    suite.test('同一聲在視窗內只播一次，不同聲各自計算，過了視窗再播', () => {
        const t = new StatusCueThrottle(120);
        assert.isTrue(t.shouldPlay('debuff', 1000));
        assert.isTrue(!t.shouldPlay('debuff', 1050));
        assert.isTrue(t.shouldPlay('buff', 1050));
        assert.isTrue(t.shouldPlay('debuff', 1130));
    });

    suite.test('分鏡缺檔音效對到既有 clip；不在表上的 key 原樣播', () => {
        assert.equals('ult_c_burst', resolveCutinSfxClip('roar'));
        assert.equals('ult_c_charge', resolveCutinSfxClip('whoosh'));
        assert.equals('boom', resolveCutinSfxClip('hit_heavy'));
        assert.equals('boom', resolveCutinSfxClip('boom'));
        for (const clip of Object.values(CUTIN_SFX_FALLBACK)) assert.isTrue(clip.length > 0);
    });

    suite.test('奧義 C 組音效（PROG-2-10081）：三個 clip 檔與 meta 都在，暫代分鏡第一格播收尾', () => {
        const fs = require('fs'); const path = require('path');
        const dir = path.resolve(__dirname, '../assets/bundles/audio/clips');
        const clips = [resolveCutinSfxClip('whoosh'), resolveCutinSfxClip('roar'), CUTIN_ULT_TAIL_CLIP];
        assert.equals(3, new Set(clips).size);
        for (const c of clips) {
            assert.isTrue(fs.existsSync(path.join(dir, `${c}.ogg`)), `${c}.ogg 存在`);
            assert.isTrue(fs.existsSync(path.join(dir, `${c}.ogg.meta`)), `${c}.ogg.meta 存在`);
        }
        const keys = (buildPlaceholderCutinConfig('zhang-fei', '張飛').panels[0].sfx ?? []).map((c) => c.key);
        assert.isTrue(keys.includes(CUTIN_ULT_TAIL_CLIP), keys.join(','));
    });

    suite.test('暫代圖分鏡不再靜音：第一格帶切入與命中音效', () => {
        const cfg = buildPlaceholderCutinConfig('zhang-fei', '張飛', '震軍怒喝');
        const keys = (cfg.panels[0].sfx ?? []).map((c) => c.key);
        assert.isTrue(keys.includes('whoosh') && keys.includes('roar'), keys.join(','));
        // PROG-2-9859：音效要散在整段（約 1.0 秒 hold）而不是全擠在開頭，否則中段會空白
        const offsets = (cfg.panels[0].sfx ?? []).map((c) => c.offset ?? 0);
        assert.isTrue(Math.max(...offsets) >= 0.9, offsets.join(','));
        assert.isTrue(offsets.filter((o) => o >= 0.3).length >= 2, offsets.join(','));
    });

    suite.test('狀態飄字：粗字、比以前大、停留更久、會彈出，但比一般傷害小一級', () => {
        const s = FLOAT_TEXT_STYLES.status;
        assert.isTrue(s.isBold);
        assert.isTrue(s.fontSize >= 40 && s.fontSize < FLOAT_TEXT_STYLES.dmg_enemy.fontSize, `${s.fontSize}`);
        assert.isTrue(s.durationMs >= 1500);
        assert.isTrue(s.peakScale > s.startScale);
    });

    return suite;
}
