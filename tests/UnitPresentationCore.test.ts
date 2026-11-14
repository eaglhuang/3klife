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
