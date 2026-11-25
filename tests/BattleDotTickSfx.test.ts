/**
 * BattleDotTickSfx — 回合扣血 tick 專屬音效（PROG-2-9862）
 *
 * 覆蓋：燃燒／火格／中毒／群體減益走專屬 cue；一般傷害不受影響；同單位節流窗內只響一次。
 *
 * Unity 對照：EditMode 測試 AudioSource 的 per-source cooldown。
 */
import {
    BATTLE_AUDIO_CUE,
    BATTLE_AUDIO_CLIP_MAP,
    DOT_TICK_SFX,
    DotTickSfxThrottle,
    resolveBattleDotTickSfx,
    resolveBattleUnitHitSfxKey,
} from '../assets/scripts/battle/shared/BattleAudio';
import { assert, TestSuite } from './TestRunner';

export function createBattleDotTickSfxSuite(): TestSuite {
    const suite = new TestSuite('BattleDotTickSfx (回合扣血 tick 專屬音效 PROG-2-9862)');

    suite.test('燃燒與火格用火類 clip，中毒與群體減益用毒音（hurt 輕量版）', () => {
        assert.equals(BATTLE_AUDIO_CUE.dotBurnTick, resolveBattleDotTickSfx('burn')?.cue ?? '');
        assert.equals(BATTLE_AUDIO_CUE.dotBurnTick, resolveBattleDotTickSfx('hazard-fire')?.cue ?? '');
        assert.equals(BATTLE_AUDIO_CUE.dotPoisonTick, resolveBattleDotTickSfx('poison')?.cue ?? '');
        assert.equals(BATTLE_AUDIO_CUE.dotPoisonTick, resolveBattleDotTickSfx('mass-debuff-dot')?.cue ?? '');
        assert.equals('fireball', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.dotBurnTick]);
        assert.equals('hurt', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.dotPoisonTick]);
    });

    suite.test('DOT tick 音量比一般命中輕，且在 0 到 1 之間', () => {
        for (const spec of [DOT_TICK_SFX.burn, DOT_TICK_SFX.poison]) {
            assert.isTrue(spec.volume > 0 && spec.volume < 1, `volume=${spec.volume} 應介於 0 與 1 之間`);
        }
    });

    suite.test('非 DOT 來源回傳 null，受擊音維持原本的 hurt／雷聲規則', () => {
        assert.isTrue(resolveBattleDotTickSfx(undefined) === null, 'undefined 應為 null');
        assert.isTrue(resolveBattleDotTickSfx('') === null, '空字串應為 null');
        assert.isTrue(resolveBattleDotTickSfx('counter:tally-evade') === null, '反擊傷害不是 DOT');
        assert.isTrue(resolveBattleDotTickSfx('night-raid-opening-strike') === null, '夜襲先機不是 DOT');
        assert.equals(BATTLE_AUDIO_CUE.unitHitCommon, resolveBattleUnitHitSfxKey('poison'), 'DOT 仍保留原受擊 cue 的對照（由呼叫端決定是否改用專屬音）');
    });

    suite.test('同一單位在節流窗內只響一次，窗外可再響', () => {
        const t = new DotTickSfxThrottle(1000);
        assert.isTrue(t.shouldPlay('u1', 5000), '第一次要響');
        assert.isTrue(!t.shouldPlay('u1', 5000), '同一毫秒第二個 DOT（火格＋中毒）要靜音');
        assert.isTrue(!t.shouldPlay('u1', 5999), '窗內仍靜音');
        assert.isTrue(t.shouldPlay('u1', 6000), '窗外（1 秒後）可再響');
    });

    suite.test('不同單位互不影響；reset 後全部可再響', () => {
        const t = new DotTickSfxThrottle(1000);
        assert.isTrue(t.shouldPlay('u1', 0));
        assert.isTrue(t.shouldPlay('u2', 0), '另一個單位同時扣血要響');
        t.reset();
        assert.isTrue(t.shouldPlay('u1', 1), 'reset 後同一單位可再響');
    });

    return suite;
}
