import { strict as assert } from 'assert';
import { attackVfxFor, ATTACK_SLASH_EFFECT_ID } from '../assets/scripts/battle/shared/AttackVfxMapping';
import { TroopType } from '../assets/scripts/shared/CommonEnums';

// PROG-2-9353：弓兵射箭，其餘近戰與未知兵種刀光
assert.equal(attackVfxFor(TroopType.Archer).kind, 'arrow');
assert.equal(attackVfxFor(TroopType.Archer).effectId, 'proj_arrow');
for (const t of [TroopType.Infantry, TroopType.Pikeman, TroopType.Shield, TroopType.Cavalry, TroopType.Engineer, TroopType.Navy, TroopType.Medic, 'elite_infantry', 'general']) {
  assert.equal(attackVfxFor(t).kind, 'slash', String(t));
  assert.equal(attackVfxFor(t).effectId, ATTACK_SLASH_EFFECT_ID);
}
assert.equal(attackVfxFor('unknown-troop').kind, 'slash');
assert.equal(attackVfxFor(undefined).kind, 'slash');
assert.equal(attackVfxFor(null).kind, 'slash');
console.log('AttackVfxMapping ok');
