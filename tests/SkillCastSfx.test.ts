/**
 * SkillCastSfx — 放招蓄力與出手音效（PROG-2-9438）
 *
 * 覆蓋：蓄力／出手兩個音效鍵都有對到實體檔、非奧義放招時先播蓄力聲、等蓄力結束才播出手重音。
 *
 * Unity 對照：EditMode 測試 SkillCaster 協程在 WaitForSeconds 前後各觸發一次 AudioSource.PlayOneShot。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { Faction } from '../assets/scripts/core/config/Constants';
import { BATTLE_AUDIO_CLIP_MAP, BATTLE_AUDIO_CUE, SKILL_CAST_SFX } from '../assets/scripts/battle/shared/BattleAudio';
import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { SKILL_CAST_TIMING } from '../assets/scripts/battle/shared/SkillCastPresentation';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createSkillCastSfxSuite(): TestSuite {
    const suite = new TestSuite('SkillCastSfx (放招蓄力與出手音效 PROG-2-9438)');

    suite.test('蓄力／出手音效鍵都對到不同的實體檔', () => {
        assert.equals('skill1', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.skillCharge]);
        assert.equals('skill7', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.skillRelease]);
        assert.equals(BATTLE_AUDIO_CUE.skillCharge, SKILL_CAST_SFX.charge.cue);
        assert.equals(BATTLE_AUDIO_CUE.skillRelease, SKILL_CAST_SFX.release.cue);
        assert.isTrue(SKILL_CAST_SFX.charge.volume > 0 && SKILL_CAST_SFX.charge.volume <= 1, '蓄力音量在 0～1');
        assert.isTrue(SKILL_CAST_SFX.release.volume > 0 && SKILL_CAST_SFX.release.volume <= 1, '出手音量在 0～1');
    });

    suite.test('非奧義放招：蓄力開始播蓄力聲，蓄力結束才播出手重音', async () => {
        services().initialize();
        const played: Array<{ clip: string; t: number }> = [];
        const audio = services().audio as any;
        const original = audio.playSfx;
        const t0 = Date.now();
        audio.playSfx = (clip: string) => { played.push({ clip, t: Date.now() - t0 }); };
        const ctx = createBattleSceneContext();
        let chargeCalls = 0;
        ctx.unitRenderer = {
            playGeneralCharge: () => { chargeCalls += 1; return true; },
            playGeneralAttackPose: () => undefined,
            getGeneralSidelineWorldPosition: () => null,
            waitForMovementIdle: () => Promise.resolve(),
        } as any;
        const scene = { isValid: true, scheduleOnce: (fn: () => void, sec: number) => { setTimeout(fn, sec * 1000); } };
        const bridge = new BattleUIBridge(ctx, scene as any);
        try {
            (bridge as any)._castGeneralSkill({ faction: Faction.Player, skillId: 'test-skill', generalName: '張飛' });
            await wait(100);
            const atCharge = played.map(p => p.clip);
            await wait(SKILL_CAST_TIMING.chargeSec * 1000 + 300);
            const clips = played.map(p => p.clip);
            assert.equals(1, chargeCalls);
            assert.equals('skill1', atCharge.join(','));
            const iCharge = clips.indexOf('skill1');
            const iRelease = clips.indexOf('skill7');
            assert.isTrue(iCharge >= 0 && iRelease > iCharge, `出手在蓄力之後：${clips.join(',')}`);
            assert.isTrue(played[iRelease].t >= SKILL_CAST_TIMING.chargeSec * 1000 - 20, `出手等蓄力結束：${played[iRelease].t}ms`);
        } finally {
            audio.playSfx = original;
            bridge.unsubscribeEvents();
        }
    });

    return suite;
}
