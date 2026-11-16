import { strict as assert } from 'assert';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import { ATTACK_SFX_KEY, attackSfxFor } from '../assets/scripts/battle/shared/AttackSfxMapping';
import { BATTLE_AUDIO_CUE, BATTLE_AUDIO_CLIP_MAP, resolveBattleUnitAttackSfxKey } from '../assets/scripts/battle/shared/BattleAudio';

// 三類：近戰／弓／騎
assert.equal(attackSfxFor(TroopType.Infantry), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(TroopType.Shield), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(TroopType.Pikeman), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(TroopType.Archer), ATTACK_SFX_KEY.bow);
assert.equal(attackSfxFor(TroopType.Cavalry), ATTACK_SFX_KEY.cavalry);
// 未知／空值退回通用近戰聲
assert.equal(attackSfxFor('unknown-troop'), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(undefined), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(null), ATTACK_SFX_KEY.melee);
// 三類互不相同，且與 BattleAudio 的 cue／clip 表銜接
assert.equal(new Set([ATTACK_SFX_KEY.melee, ATTACK_SFX_KEY.bow, ATTACK_SFX_KEY.cavalry]).size, 3);
assert.equal(resolveBattleUnitAttackSfxKey(TroopType.Archer), BATTLE_AUDIO_CUE.unitAttackBow);
for (const k of Object.keys(ATTACK_SFX_KEY) as (keyof typeof ATTACK_SFX_KEY)[]) {
  assert.ok(BATTLE_AUDIO_CLIP_MAP[ATTACK_SFX_KEY[k] as keyof typeof BATTLE_AUDIO_CLIP_MAP], `${k} 缺 clip`);
}
assert.equal(new Set([BATTLE_AUDIO_CLIP_MAP[ATTACK_SFX_KEY.melee], BATTLE_AUDIO_CLIP_MAP[ATTACK_SFX_KEY.bow], BATTLE_AUDIO_CLIP_MAP[ATTACK_SFX_KEY.cavalry]]).size, 3);
// 回合與勝敗都有 clip
for (const c of [BATTLE_AUDIO_CUE.turnPlayerStart, BATTLE_AUDIO_CUE.turnEnemyStart, BATTLE_AUDIO_CUE.battleVictory, BATTLE_AUDIO_CUE.battleDefeat]) {
  assert.ok(BATTLE_AUDIO_CLIP_MAP[c], `${c} 缺 clip`);
}
console.log('AttackSfxMapping tests passed');
