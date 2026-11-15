import { TroopType } from '../assets/scripts/core/config/Constants';
import {
    BATTLE_AUDIO_CUE,
    BATTLE_AUDIO_CLIP_MAP,
    resolveBattleUnitAttackSfxKey,
} from '../assets/scripts/battle/shared/BattleAudio';
import { TestSuite, assert } from './TestRunner';

export function createBattleAudioSuite(): TestSuite {
    const suite = new TestSuite('BattleAudio');

    suite.test('既有 cue 行為不變：受擊=hurt、夜襲受擊=thunder、攻擊=weapon', () => {
        assert.equals('hurt', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitHitCommon]);
        assert.equals('thunder', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitHitSecondary]);
        assert.equals('weapon', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitAttackCommon]);
        assert.equals('weapon', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitAttackPrimary]);
    });

    suite.test('新 cue 對到正確音檔', () => {
        assert.equals('footstep', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitMove]);
        assert.equals('start', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitDeploy]);
        assert.equals('die', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitDie]);
        assert.equals('heal', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitHeal]);
        assert.equals('buff', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.buffGained]);
        assert.equals('wave', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitDodge]);
        assert.equals('boom', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.critHit]);
        assert.equals('boom', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.fortressDamaged]);
        assert.equals('shield', BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.shieldBlock]);
    });

    suite.test('每個 cue 都有對應 clip（無遺漏）', () => {
        for (const cue of Object.values(BATTLE_AUDIO_CUE)) {
            assert.isTrue(typeof BATTLE_AUDIO_CLIP_MAP[cue] === 'string' && BATTLE_AUDIO_CLIP_MAP[cue].length > 0, `cue ${cue} 缺 clip`);
        }
    });

    suite.test('騎兵攻擊走 primary，其餘兵種走 common（皆為 weapon）', () => {
        assert.equals(BATTLE_AUDIO_CUE.unitAttackPrimary, resolveBattleUnitAttackSfxKey(TroopType.Cavalry));
        assert.equals(BATTLE_AUDIO_CUE.unitAttackCommon, resolveBattleUnitAttackSfxKey(TroopType.Infantry));
    });

    return suite;
}
