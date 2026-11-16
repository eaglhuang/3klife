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

import { generalSpineConfig, soldierSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';
assert.equal(generalSpineConfig('zhao-yun')?.walkGroundSpeed, 93.33);
assert.equal(generalSpineConfig('unknown'), null);
assert.equal(soldierSpineConfig(false).walkGroundSpeed, 100);
assert.equal(soldierSpineConfig(true).clips.attack.name, 'duel_attack');
assert.equal(soldierSpineConfig(false).path, 'spine/soldiers/soldier_spear_blue/soldier_spear_blue');
assert.equal(soldierSpineConfig(false, true).path, 'spine/soldiers/soldier_spear_red/soldier_spear_red');
assert.equal(soldierSpineConfig(true, true).path, 'spine/soldiers/soldier_bow_red/soldier_bow_red');
assert.equal(soldierSpineConfig(true, false).path, 'spine/soldiers/soldier_bow_blue/soldier_bow_blue');
import { troopSpineConfig } from '../assets/scripts/battle/shared/UnitPresentationConfig';
assert.equal(troopSpineConfig('medic', true).path, 'spine/soldiers/soldier_medic_red/soldier_medic_red');
assert.equal(troopSpineConfig('cavalry').path, 'spine/soldiers/soldier_spear_blue/soldier_spear_blue');
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
// 素材載不起來時逐層退回：精銳 → 兵種 → 槍兵；全好時用精銳
const eliteBlue = 'spine/soldiers/soldier_elite_infantry_blue/soldier_elite_infantry_blue';
const infantryBlue = 'spine/soldiers/soldier_infantry_blue/soldier_infantry_blue';
assert.equal(troopSpineConfigWithFallback('infantry', false, 'tiger-tally-xian-zhen', () => false).path, eliteBlue);
assert.equal(troopSpineConfigWithFallback('infantry', false, 'tiger-tally-xian-zhen', p => p === eliteBlue).path, infantryBlue);
assert.equal(troopSpineConfigWithFallback('infantry', false, 'tiger-tally-xian-zhen', p => p === eliteBlue || p === infantryBlue).path,
  'spine/soldiers/soldier_spear_blue/soldier_spear_blue');
assert.equal(troopSpineConfigWithFallback('archer', true, null, () => false).path, 'spine/soldiers/soldier_bow_red/soldier_bow_red');
