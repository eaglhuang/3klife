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
