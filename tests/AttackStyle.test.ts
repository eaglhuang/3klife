// PROG-2-9400：兵種 → 普攻風格，以及風格對應的 Spine 分動作、畫面特效、音效。
import { strict as assert } from 'assert';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import { ATTACK_SPINE_CLIP, AttackStyle, attackStyleFor, pickAttackClip } from '../assets/scripts/battle/shared/AttackStyle';
import { ATTACK_IMPACT_SEC, ATTACK_SHOTS, ARROW_HIT_DELAY_SEC, shotPoseAt, shotTotalSec } from '../assets/scripts/battle/shared/AttackShotStyle';
import { ATTACK_SLASH_SHOT, slashPoseAt } from '../assets/scripts/battle/shared/AttackSlashShot';
import { ATTACK_ARROW_SHOT, ATTACK_SLASH_EFFECT_ID, attackVfxFor } from '../assets/scripts/battle/shared/AttackVfxMapping';
import { ATTACK_SFX_KEY, attackSfxFor } from '../assets/scripts/battle/shared/AttackSfxMapping';
import { BATTLE_AUDIO_CLIP_MAP } from '../assets/scripts/battle/shared/BattleAudio';
import { BATTLE_VISUAL_TIMING } from '../assets/scripts/battle/views/BattlePresentationTiming';
import { soldierSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';
import { UnitPresentationCore } from '../assets/scripts/battle/shared/UnitPresentationCore';

// 每個兵種的風格、Spine 動作、特效種類、音效
const table: Array<[string, AttackStyle, string | null, string, string]> = [
  [TroopType.Pikeman, 'thrust', 'attack_spear', 'thrust', ATTACK_SFX_KEY.thrust],
  [TroopType.Shield, 'shield', 'attack_shield', 'bash', ATTACK_SFX_KEY.shield],
  [TroopType.Infantry, 'slash', 'attack_slash', 'slash', ATTACK_SFX_KEY.melee],
  [TroopType.Engineer, 'slash', 'attack_slash', 'slash', ATTACK_SFX_KEY.melee],
  [TroopType.Medic, 'slash', 'attack_slash', 'slash', ATTACK_SFX_KEY.melee],
  [TroopType.Navy, 'slash', 'attack_slash', 'slash', ATTACK_SFX_KEY.melee],
  [TroopType.Archer, 'bow', 'attack_bow', 'arrow', ATTACK_SFX_KEY.bow],
  [TroopType.Cavalry, 'charge', 'attack_spear', 'charge', ATTACK_SFX_KEY.cavalry],
  ['general', 'generic', null, 'slash', ATTACK_SFX_KEY.melee],
];
for (const [troop, style, clip, kind, sfx] of table) {
  assert.equal(attackStyleFor(troop), style, `${troop} 風格`);
  assert.equal(ATTACK_SPINE_CLIP[style], clip, `${troop} Spine 動作`);
  assert.equal(attackVfxFor(troop).kind, kind, `${troop} 特效種類`);
  assert.equal(attackVfxFor(troop).style, style);
  assert.equal(attackSfxFor(troop), sfx, `${troop} 音效鍵`);
}
// 未知／空值：通用演出，不漏播
for (const t of ['unknown-troop', '', undefined, null]) {
  assert.equal(attackStyleFor(t), 'generic');
  assert.equal(attackVfxFor(t).kind, 'slash');
  assert.equal(attackVfxFor(t).effectId, ATTACK_SLASH_EFFECT_ID);
  assert.equal(attackSfxFor(t), ATTACK_SFX_KEY.melee);
}
assert.equal(attackVfxFor(TroopType.Archer).effectId, 'proj_arrow');
// 槍、盾、步兵三者特效與音效各不相同（原本共用一個刀光與 weapon 音效）
const trio = [TroopType.Pikeman, TroopType.Shield, TroopType.Infantry];
assert.equal(new Set(trio.map(t => attackVfxFor(t).shots[0].key)).size, 3);
assert.equal(new Set(trio.map(t => BATTLE_AUDIO_CLIP_MAP[attackSfxFor(t)])).size, 3);
assert.equal(BATTLE_AUDIO_CLIP_MAP[ATTACK_SFX_KEY.shield], 'shield', '盾擊要用 shield 音效');

// Spine 分動作：存在就用，缺動作退回通用攻擊；時長沿用通用攻擊
const generic = { name: 'duel_attack', loop: false, duration: 1.2 };
const has = (...names: string[]) => (n: string) => names.includes(n);
assert.deepEqual(pickAttackClip('thrust', generic, has('attack_spear', 'duel_attack')), { name: 'attack_spear', loop: false, duration: 1.2 });
assert.deepEqual(pickAttackClip('shield', generic, has('attack_shield')), { name: 'attack_shield', loop: false, duration: 1.2 });
assert.equal(pickAttackClip('slash', generic, has('attack_spear')), generic, '缺 attack_slash 要退回通用');
assert.equal(pickAttackClip('bow', generic, () => false), generic);
assert.equal(pickAttackClip('generic', generic, () => true), generic, 'generic 不指定分動作');

// 核心：指定的動作片段只在那次 attack 有效，播完回 idle 後恢復；不指定就用設定檔的通用動作
const config = soldierSpineConfig(false);
const core = new UnitPresentationCore(config, { x: 0, y: 0 });
core.play('attack', { name: 'attack_shield', loop: false, duration: 0.9 });
assert.equal(core.snapshot().clip.name, 'attack_shield');
assert.equal(core.step(1).action, 'idle');
assert.equal(core.snapshot().clip.name, 'idle');
core.play('attack');
assert.equal(core.snapshot().clip.name, config.clips.attack.name);
core.play('hit', { name: 'x', loop: false, duration: 1 });
core.play('attack');
assert.equal(core.snapshot().clip.name, config.clips.attack.name, '舊的指定不可殘留');

// 畫面特效：貼圖存在、大小與時間合理、一律會淡出結束
for (const [style, shots] of Object.entries(ATTACK_SHOTS)) {
  assert.ok(shots.length > 0, style);
  for (const s of shots) {
    assert.ok(existsSync(join(__dirname, '../assets/bundles/vfx_core', `${s.texturePath}.png`)), `${s.key} 貼圖不存在`);
    assert.ok(s.width >= 20 && s.height >= 20 && s.durationSec >= 0.15 && s.durationSec <= 0.5, `${s.key} 大小或時間不合理`);
    assert.equal(shotPoseAt(s, shotTotalSec(s) + 0.01, 0).visible, false, `${s.key} 結束後要消失`);
    assert.ok(shotPoseAt(s, shotTotalSec(s) - 1e-6, 0).opacity <= 2, `${s.key} 結束時要淡出`);
  }
}
// 刺光朝目標：貼圖長軸（artDeg）轉完要落在攻擊方向；有滑行
const thrust = ATTACK_SHOTS.thrust[0];
assert.equal(shotPoseAt(thrust, thrust.delaySec + 0.1, 0).angle + thrust.artDeg, 0);
assert.equal(shotPoseAt(thrust, thrust.delaySec + 0.1, 90).angle + thrust.artDeg, 90);
assert.ok(shotPoseAt(thrust, thrust.delaySec + thrust.durationSec, 0).slide > 0);
// 圓形與星芒不旋轉
assert.equal(shotPoseAt(ATTACK_SHOTS.shield[0], ATTACK_SHOTS.shield[0].delaySec + 0.1, 77).angle, 0);
// 弓箭命中小爆要等箭飛到；延遲與飛行時間同步
assert.equal(ARROW_HIT_DELAY_SEC, ATTACK_ARROW_SHOT.flightSec);
assert.equal(ATTACK_SHOTS.bow[0].delaySec, ATTACK_ARROW_SHOT.flightSec);
assert.equal(shotPoseAt(ATTACK_SHOTS.bow[0], 0.1, 0).visible, false);
// 騎兵：塵土在出發點（0）、衝擊在目標（1）
assert.deepEqual(ATTACK_SHOTS.charge.map(s => s.anchor), [0, 1]);
// 劈砍沿用原本的月牙姿態，不改變既有外觀
for (const t of [0, 0.3, 0.75, 1]) {
  const old = slashPoseAt(t, 33), neu = shotPoseAt(ATTACK_SHOTS.slash[0], ATTACK_SHOTS.slash[0].delaySec + t * ATTACK_SLASH_SHOT.durationSec, 33);
  assert.ok(Math.abs(old.angle - neu.angle) < 1e-9 && Math.abs(old.scale - neu.scale) < 1e-9 && Math.abs(old.opacity - neu.opacity) <= 1, `slash t=${t}`);
}
// 用到的音效 clip 都真的在 audio bundle 裡
const clips = new Set(readdirSync(join(__dirname, '../assets/bundles/audio/clips')).filter(f => /\.(mp3|wav)$/.test(f)).map(f => f.replace(/\.(mp3|wav)$/, '')));
for (const key of Object.values(ATTACK_SFX_KEY)) assert.ok(clips.has(BATTLE_AUDIO_CLIP_MAP[key]), `${key} 的 clip 檔不存在`);
// PROG-2-9412：命中時間——閃光要在命中前出現、命中前後還亮著；弓箭以箭飛到為準、騎兵以撞上為準
assert.equal(ATTACK_IMPACT_SEC.bow, ARROW_HIT_DELAY_SEC);
assert.ok(Math.abs(ATTACK_IMPACT_SEC.charge - (BATTLE_VISUAL_TIMING.cavalryLiftSec + BATTLE_VISUAL_TIMING.cavalryImpactSec)) < 1e-9);
for (const style of ['thrust', 'shield', 'slash'] as const) {
  const shot = ATTACK_SHOTS[style][0];
  assert.ok(shot.delaySec < ATTACK_IMPACT_SEC[style], `${style} 閃光要在命中前出現`);
  assert.ok(shotTotalSec(shot) > ATTACK_IMPACT_SEC[style], `${style} 閃光要亮到命中之後`);
}
console.log('AttackStyle tests passed');
