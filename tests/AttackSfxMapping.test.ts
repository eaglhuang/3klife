import { strict as assert } from 'assert';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import { ATTACK_SFX_KEY, attackSfxFor } from '../assets/scripts/battle/shared/AttackSfxMapping';
import { BATTLE_AUDIO_CUE, BATTLE_AUDIO_CLIP_MAP, resolveBattleUnitAttackSfxKey } from '../assets/scripts/battle/shared/BattleAudio';

// PROG-2-9400：劈砍／突刺／盾擊／弓／騎各一
assert.equal(attackSfxFor(TroopType.Infantry), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(TroopType.Shield), ATTACK_SFX_KEY.shield);
assert.equal(attackSfxFor(TroopType.Pikeman), ATTACK_SFX_KEY.thrust);
assert.equal(attackSfxFor(TroopType.Archer), ATTACK_SFX_KEY.bow);
assert.equal(attackSfxFor(TroopType.Cavalry), ATTACK_SFX_KEY.cavalry);
// 未知／空值退回通用近戰聲
assert.equal(attackSfxFor('unknown-troop'), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(undefined), ATTACK_SFX_KEY.melee);
assert.equal(attackSfxFor(null), ATTACK_SFX_KEY.melee);
// 五類互不相同，且與 BattleAudio 的 cue／clip 表銜接
assert.equal(new Set(Object.values(ATTACK_SFX_KEY)).size, 5);
assert.equal(resolveBattleUnitAttackSfxKey(TroopType.Archer), BATTLE_AUDIO_CUE.unitAttackBow);
for (const k of Object.keys(ATTACK_SFX_KEY) as (keyof typeof ATTACK_SFX_KEY)[]) {
  assert.ok(BATTLE_AUDIO_CLIP_MAP[ATTACK_SFX_KEY[k] as keyof typeof BATTLE_AUDIO_CLIP_MAP], `${k} 缺 clip`);
}
assert.equal(new Set(Object.values(ATTACK_SFX_KEY).map(k => BATTLE_AUDIO_CLIP_MAP[k])).size, 5);
// PROG-2-9484：所有攻擊聲都不能和移動腳步共用同一個檔，否則統一音效閘門按檔名節流時會被腳步聲吃掉
for (const k of Object.values(ATTACK_SFX_KEY)) {
  assert.notEqual(BATTLE_AUDIO_CLIP_MAP[k], BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitMove], `${k} 和移動腳步同檔`);
}
assert.equal(BATTLE_AUDIO_CLIP_MAP[BATTLE_AUDIO_CUE.unitAttackPrimary], 'biteskill');
// 回合與勝敗都有 clip
for (const c of [BATTLE_AUDIO_CUE.turnPlayerStart, BATTLE_AUDIO_CUE.turnEnemyStart, BATTLE_AUDIO_CUE.battleVictory, BATTLE_AUDIO_CUE.battleDefeat]) {
  assert.ok(BATTLE_AUDIO_CLIP_MAP[c], `${c} 缺 clip`);
}
console.log('AttackSfxMapping tests passed');
