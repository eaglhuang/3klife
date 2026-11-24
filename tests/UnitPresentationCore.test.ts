import { strict as assert } from 'assert';
import { ActionClip, UnitAction, UnitPresentationCore } from '../assets/scripts/battle/shared/UnitPresentationCore';

const clip = (name: string, loop: boolean, duration: number): ActionClip => ({ name, loop, duration });
const clips: Record<UnitAction, ActionClip> = {
  idle: clip('idle', true, 2), move: clip('walk', true, 1.2),
  attack: clip('attack', false, 1), hit: clip('hit', false, 0.5),
  dodge: clip('dodge', false, 0.5), fall: clip('fall', false, 1),
  retreat: clip('walk', true, 1.2),
};
const unit = new UnitPresentationCore({ clips, walkGroundSpeed: 100, displayScale: 0.5, speedMultiplier: 2 }, { x: 0, y: 0 });
unit.moveTo({ x: 100, y: 0 });
let state = unit.step(0.5);
assert.equal(state.foot.x, 50);
assert.equal(state.animationSpeed, 2);
state = unit.step(1);
assert.equal(state.foot.x, 100);
assert.equal(state.action, 'idle');
unit.moveTo({ x: 0, y: 0 }, true);
state = unit.step(0.25);
assert.equal(state.facing, -1);
assert.equal(state.foot.x, 75);
unit.play('attack');
assert.equal(unit.step(1).action, 'idle');
unit.play('fall');
assert.equal(unit.step(10).action, 'fall');
assert.throws(() => unit.step(-1));

// 單挑輸入既有勝負，演出完成後勝者回原點、敗者保留倒地。
import { DuelPresentationCore } from '../assets/scripts/battle/shared/DuelPresentationCore';
const config = { clips, walkGroundSpeed: 100, displayScale: 1, speedMultiplier: 1 };
const left = new UnitPresentationCore(config, { x: 0, y: 0 });
const right = new UnitPresentationCore(config, { x: 100, y: 0 }, -1);
const duel = new DuelPresentationCore(
  { unit: left, sideline: { x: 0, y: 0 }, arena: { x: 40, y: 0 } },
  { unit: right, sideline: { x: 100, y: 0 }, arena: { x: 60, y: 0 } }, 0, true,
);
assert.equal(duel.step(0.5).phase, 'faceoff');
assert.equal(duel.step(0.6).phase, 'exchange');
assert.equal(duel.step(1.6).phase, 'outcome');
assert.equal(duel.step(1.8).phase, 'return');
const result = duel.step(0.5);
assert.equal(result.phase, 'done');
assert.equal(result.units[0].foot.x, 0);
assert.equal(result.units[1].action, 'fall');

// 以投影後實際距離同步動畫播放速度，左右武將和小兵使用同一個核心。
const follower = new UnitPresentationCore(config, { x: 0, y: 0 });
follower.follow({ x: 50, y: 0 }, true, 0.5);
assert.equal(follower.snapshot().action, 'move');
assert.equal(follower.snapshot().animationSpeed, 1);
follower.follow({ x: 25, y: 0 }, true, 0.5);
assert.equal(follower.snapshot().facing, -1);
assert.equal(follower.snapshot().animationSpeed, 0.5);
follower.follow({ x: 25, y: 0 }, false, 0.1);
assert.equal(follower.snapshot().action, 'idle');
// PROG-2-9412：出手中被拖著移動（騎兵衝鋒）仍維持攻擊動作，播完才可改走路
const charger = new UnitPresentationCore(config, { x: 0, y: 0 });
charger.play('attack');
charger.follow({ x: 30, y: 0 }, true, 0.1);
assert.equal(charger.snapshot().action, 'attack');
assert.equal(charger.snapshot().foot.x, 30);
charger.step(1);
charger.follow({ x: 60, y: 0 }, true, 0.1);
assert.equal(charger.snapshot().action, 'move');
follower.moveToWithin({ x: 425, y: 0 }, 2);
assert.equal(follower.snapshot().animationSpeed, 2);
assert.equal(follower.step(1).foot.x, 225);
assert.equal(follower.step(1).foot.x, 425);
assert.throws(() => follower.moveToWithin({ x: 0, y: 0 }, 0));

// 攻守方與閃避來自既有結算事件，雙方存活時均返回原位。
const p = new UnitPresentationCore(config, { x: 0, y: 0 });
const q = new UnitPresentationCore(config, { x: 100, y: 0 }, -1);
const exchanged = new DuelPresentationCore(
  { unit: p, sideline: { x: 0, y: 0 }, arena: { x: 40, y: 0 } },
  { unit: q, sideline: { x: 100, y: 0 }, arena: { x: 60, y: 0 } }, null, false,
  [{ attacker: 1, dodged: true }, { attacker: 0, dodged: false }],
);
assert.equal(exchanged.step(0.5).phase, 'faceoff');
assert.equal(exchanged.step(0.6).phase, 'exchange');
assert.equal(p.snapshot().action, 'dodge');
assert.equal(q.snapshot().action, 'attack');
exchanged.step(1.6);
assert.equal(p.snapshot().action, 'attack');
assert.equal(q.snapshot().action, 'hit');
assert.equal(exchanged.step(1.6).phase, 'outcome');
assert.equal(exchanged.step(1.8).phase, 'return');
const returned = exchanged.step(0.5);
assert.equal(returned.phase, 'done');
assert.equal(returned.units[0].foot.x, 0);
assert.equal(returned.units[1].foot.x, 100);

import { MAX_WALK_ANIMATION_SPEED, generalSpineConfig, resolveRidingTier, soldierSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';
import { resolveClipName } from '../assets/scripts/battle/shared/UnitPresentationCore';
assert.equal(generalSpineConfig('zhao-yun')?.walkGroundSpeed, 93.33);
assert.equal(generalSpineConfig('unknown'), null);
assert.equal(soldierSpineConfig(false).walkGroundSpeed, 100);
assert.equal(soldierSpineConfig(true).clips.attack.name, 'duel_attack');
// PROG-2-9407：小兵前進播 walk，缺 walk 的骨架退回 dash_in；武將骨架只有 dash_in 維持原狀
assert.equal(soldierSpineConfig(false).clips.move.name, 'walk');
assert.equal(soldierSpineConfig(false).clips.move.fallback, 'dash_in');
assert.equal(generalSpineConfig('zhao-yun')?.clips.move.name, 'dash_in');
assert.equal(resolveClipName(soldierSpineConfig(false).clips.move, name => name === 'walk' || name === 'dash_in'), 'walk');
assert.equal(resolveClipName(soldierSpineConfig(false).clips.move, name => name === 'dash_in'), 'dash_in');
assert.equal(resolveClipName(soldierSpineConfig(false).clips.move, () => false), 'walk');
// 步態倍率封頂：一格 144 像素在 2 秒內走完，倍率原本高達 4，封頂後不超過 MOVE_GAIT_TUNING.maxAnimationSpeed（2.2）
const soldierCore = new UnitPresentationCore(soldierSpineConfig(false), { x: 0, y: 0 });
soldierCore.follow({ x: 72, y: 0 }, true, 1);
assert.equal(soldierCore.snapshot().animationSpeed, MAX_WALK_ANIMATION_SPEED);
soldierCore.follow({ x: 72 + 18 * 0.5, y: 0 }, true, 1);
assert.equal(soldierCore.snapshot().animationSpeed, 0.5);
assert.equal(soldierSpineConfig(false).path, 'spine/soldiers/soldier_spear_blue/soldier_spear_blue');
assert.equal(soldierSpineConfig(false, true).path, 'spine/soldiers/soldier_spear_red/soldier_spear_red');
assert.equal(soldierSpineConfig(true, true).path, 'spine/soldiers/soldier_bow_red/soldier_bow_red');
assert.equal(soldierSpineConfig(true, false).path, 'spine/soldiers/soldier_bow_blue/soldier_bow_blue');
import { ENEMY_CAVALRY_TINT, troopSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';
assert.equal(troopSpineConfig('medic', true).path, 'spine/soldiers/soldier_medic_red/soldier_medic_red');
// PROG-2-9408：我方騎兵改用騎手＋馬合成骨架；前進播 gallop、蹄聲依 gallop 半週期同拍；敵方暫時沿用紅色槍兵
const cavalry = troopSpineConfig('cavalry');
assert.equal(cavalry.path, 'spine/soldiers/soldier_cavalry_blue/soldier_cavalry_blue__mount_horse_bay');
assert.equal(cavalry.clips.move.name, 'gallop');
assert.equal(cavalry.clips.attack.name, 'attack_spear');
assert.equal(cavalry.clips.attack.fallback, 'thrust');
assert.equal(cavalry.clips.dodge.name, 'dodge');
assert.equal(cavalry.clips.fall.name, 'fall');
assert.equal(cavalry.clips.retreat.name, 'retreat');
// 騎馬武將（PROG-2-9738）：ridingTier > 0 才騎馬；缺素材退回步行版；沒有騎馬骨架的武將不受影響
assert.equal(generalSpineConfig('zhao-yun')?.path, 'spine/generals/zhao_yun/zhao_v2');
const mountedZhao = generalSpineConfig('zhao-yun', null, 1);
assert.equal(mountedZhao?.path, 'spine/generals/zhao_yun_mounted/zhao__mount_horse_bay');
// 精騎、神駒已有 v2 外觀（見下方測試）
assert.equal(mountedZhao?.clips.move.name, 'gallop');
assert.equal(generalSpineConfig('zhao-yun', null, 2, p => p.includes('zhao_yun_mounted'))?.path, 'spine/generals/zhao_yun/zhao_v2');
// 天生騎術：資料欄位與表格取高者；表格未讀到時只看欄位
assert.equal(resolveRidingTier('zhao_yun', 0, { 'zhao-yun': 2 }), 2);
assert.equal(resolveRidingTier('zhao-yun', 3, { 'zhao-yun': 2 }), 3);
assert.equal(resolveRidingTier('zhao-yun', 0, null), 0);
assert.equal(resolveRidingTier('liu-bei', 0, { 'zhao-yun': 2 }), 0);
assert.equal(generalSpineConfig('guan-yu', null, 3)?.path, generalSpineConfig('guan-yu')?.path);
assert.equal(cavalry.bobPx, 0);
assert.ok(Math.abs((cavalry.footfallIntervalSec ?? 0) - cavalry.clips.move.duration / 2) < 1e-6);
assert.ok(cavalry.displayScale > 0 && cavalry.displayScale < troopSpineConfig('infantry').displayScale); // 合成骨架騎手已放大 1.54 倍
// PROG-2-9957：敵方騎兵用 spine-trial 紅方騎馬骨架（獨立資料夾），不染色；我方藍騎兵不染色
const enemyCavalry = troopSpineConfig('cavalry', true);
assert.equal(enemyCavalry.path, 'spine/soldiers/soldier_cavalry_red/soldier_cavalry_red__mount_horse_bay');
assert.equal(enemyCavalry.tint, undefined);
assert.equal(enemyCavalry.clips.move.name, 'gallop');
assert.equal(troopSpineConfig('cavalry').tint, undefined);
// 實機量到兩格多、每秒約 144 單位：gallop 倍率約 1.15，不會撞到 2.2 上限而打滑
const cavalryCore = new UnitPresentationCore(cavalry, { x: 0, y: 0 });
cavalryCore.follow({ x: 144, y: 0 }, true, 1);
assert.ok(cavalryCore.snapshot().animationSpeed < MAX_WALK_ANIMATION_SPEED);
assert.equal(troopSpineConfig('infantry', false, 'tiger-tally-xian-zhen').path, 'spine/soldiers/soldier_elite_infantry_blue/soldier_elite_infantry_blue');
assert.equal(troopSpineConfig('shield', false, 'tiger-tally-xian-zhen').path, 'spine/soldiers/soldier_shield_blue/soldier_shield_blue');

import { selectDuelExchanges } from '../assets/scripts/battle/shared/DuelPresentationCore';
const rounds = Array.from({ length: 100 }, (_, i) => ({ attacker: (i % 2) as 0 | 1, dodged: i === 40 }));
const sampled = selectDuelExchanges(rounds);
assert.equal(sampled.length, 4);
assert.equal(sampled[0], rounds[0]);
assert.equal(sampled[1], rounds[1]);
assert.equal(sampled[2], rounds[40]);
assert.equal(sampled[3], rounds[99]);
assert.equal(selectDuelExchanges(rounds.slice(0, 2)).length, 2);

// 名冊實例 ID 與武將模板不同時仍依模板選取正確的美術設定。
import { GeneralUnit, GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
const rosterGeneral = new GeneralUnit({ id: 'roster-123', templateId: 'zhao-yun', name: '趙雲', faction: Faction.Player, hp: 100 } as unknown as GeneralConfig);
assert.equal(rosterGeneral.templateId, 'zhao-yun');
assert.equal(generalSpineConfig(rosterGeneral.id, rosterGeneral.templateId)?.path, 'spine/generals/zhao_yun/zhao_v2');
assert.equal(generalSpineConfig('guan-yu', 'unknown')?.path, 'spine/generals/guan_yu/guan_yu');
import { troopSpineConfigWithFallback } from '../assets/scripts/battle/shared/UnitPresentationConfig';
import { DUST_RING_PUFFS, riderDeployRingPuffs } from '../assets/scripts/battle/shared/DeployLanding';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
// PROG-2-9957：騎術落下 fx = dust_ring 只對騎兵加外圍塵圈；其他兵種與其他 fx 不加
assert.equal(riderDeployRingPuffs(TroopType.Cavalry, { fx: 'dust_ring', sfx: 'horse_snort' }), DUST_RING_PUFFS);
assert.equal(riderDeployRingPuffs(TroopType.Infantry, { fx: 'dust_ring' }).length, 0);
assert.equal(riderDeployRingPuffs(TroopType.Cavalry, { fx: 'armor_spark' }).length, 0);
assert.equal(riderDeployRingPuffs(TroopType.Cavalry, null).length, 0);
// 素材載不起來時逐層退回：精銳 → 兵種 → 槍兵；全好時用精銳
const eliteBlue = 'spine/soldiers/soldier_elite_infantry_blue/soldier_elite_infantry_blue';
const infantryBlue = 'spine/soldiers/soldier_infantry_blue/soldier_infantry_blue';
assert.equal(troopSpineConfigWithFallback('infantry', false, 'tiger-tally-xian-zhen', () => false).path, eliteBlue);
assert.equal(troopSpineConfigWithFallback('infantry', false, 'tiger-tally-xian-zhen', p => p === eliteBlue).path, infantryBlue);
assert.equal(troopSpineConfigWithFallback('infantry', false, 'tiger-tally-xian-zhen', p => p === eliteBlue || p === infantryBlue).path,
  'spine/soldiers/soldier_spear_blue/soldier_spear_blue');
assert.equal(troopSpineConfigWithFallback('archer', true, null, () => false).path, 'spine/soldiers/soldier_bow_red/soldier_bow_red');
// PROG-2-9868：騎乘版載入失敗時退回原步行版骨架，兩者都失敗才退槍兵；敵方騎兵直接退槍兵
const cavalryMounted = troopSpineConfig('cavalry').path;
const legacyCavalryPath = 'spine/soldiers/soldier_cavalry_blue/soldier_cavalry_blue';
assert.equal(troopSpineConfigWithFallback('cavalry', false, null, () => false).path, cavalryMounted);
assert.equal(troopSpineConfigWithFallback('cavalry', false, null, path => path === cavalryMounted).path, legacyCavalryPath);
assert.equal(troopSpineConfigWithFallback('cavalry', false, null, path => path !== 'spine/soldiers/soldier_spear_blue/soldier_spear_blue').path, 'spine/soldiers/soldier_spear_blue/soldier_spear_blue');
// 敵方騎兵：紅方骨架缺檔 → 藍騎兵騎馬骨架染紅 → 藍無馬版染紅；全失敗才退槍兵
assert.equal(troopSpineConfigWithFallback('cavalry', true, null, () => false).path, 'spine/soldiers/soldier_cavalry_red/soldier_cavalry_red__mount_horse_bay');
const redMissing = (p: string) => p.startsWith('spine/soldiers/soldier_cavalry_red/');
assert.equal(troopSpineConfigWithFallback('cavalry', true, null, redMissing).path, 'spine/soldiers/soldier_cavalry_blue/soldier_cavalry_blue__mount_horse_bay');
assert.deepEqual(troopSpineConfigWithFallback('cavalry', true, null, redMissing).tint, ENEMY_CAVALRY_TINT);
assert.equal(troopSpineConfigWithFallback('cavalry', true, null, p => p.includes('soldier_cavalry_')).path, 'spine/soldiers/soldier_spear_red/soldier_spear_red');
// 趙雲騎術 2／3 級（精騎、神駒）載入 v2 騎馬骨架；缺圖回退步行
assert.equal(generalSpineConfig('zhao_yun', null, 1)?.path, 'spine/generals/zhao_yun_mounted/zhao__mount_horse_bay');
assert.equal(generalSpineConfig('zhao_yun', null, 2)?.path, 'spine/generals/zhao_yun_mounted/v2_horse_sheet/zhao_v2__mount_horse_sheet');
assert.equal(generalSpineConfig('zhao_yun', null, 3)?.path, 'spine/generals/zhao_yun_mounted/v2_horse_war/zhao_v2__mount_horse_war');
assert.equal(generalSpineConfig('zhao_yun', null, 2, p => p.includes('v2_horse_sheet'))?.path, 'spine/generals/zhao_yun/zhao_v2');
assert.equal(troopSpineConfigWithFallback('cavalry', false, null, path => path === cavalryMounted).clips.move.name, 'gallop');

// PROG-2-9366：單挑退場走回場邊後，朝向要恢復成退場前的方向。
// 以前退場時朝向跟著行進方向翻面後就不再翻回，單挑結束兩位主將都背對戰場。
const home = new UnitPresentationCore(config, { x: 0, y: 0 }, 1);
home.moveTo({ x: 40, y: 0 });
home.step(10);
assert.equal(home.snapshot().facing, 1);
home.moveTo({ x: 0, y: 0 }, true);
assert.equal(home.step(0.1).facing, -1, '退場途中面向行進方向');
const back = home.step(10);
assert.equal(back.action, 'idle');
assert.equal(back.facing, 1, '我方退場到位後要轉回面向戰場');
const foe = new UnitPresentationCore(config, { x: 100, y: 0 }, -1);
foe.moveTo({ x: 60, y: 0 });
foe.step(10);
foe.moveTo({ x: 100, y: 0 }, true);
assert.equal(foe.step(10).facing, -1, '敵方退場到位後要轉回面向戰場');
// 一般移動（非退場）到位後維持行進方向，不受影響
foe.moveTo({ x: 200, y: 0 });
assert.equal(foe.step(10).facing, 1);
// 整場單挑演完，勝者回到場邊且面向戰場
assert.equal(result.units[0].facing, 1, '單挑結束後勝者要面向戰場');
console.log('UnitPresentationCore retreat facing ok');
