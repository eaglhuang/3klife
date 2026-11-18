import { strict as assert } from 'assert';
import { attackVfxFor, ATTACK_SLASH_EFFECT_ID } from '../assets/scripts/battle/shared/AttackVfxMapping';
import { TroopType } from '../assets/scripts/shared/CommonEnums';

// PROG-2-9353：弓兵射箭，其餘近戰與未知兵種刀光；PROG-2-9400：槍兵刺光、盾兵衝擊圈、騎兵衝撞
assert.equal(attackVfxFor(TroopType.Archer).kind, 'arrow');
assert.equal(attackVfxFor(TroopType.Archer).effectId, 'proj_arrow');
assert.equal(attackVfxFor(TroopType.Pikeman).kind, 'thrust');
assert.equal(attackVfxFor(TroopType.Shield).kind, 'bash');
assert.equal(attackVfxFor(TroopType.Cavalry).kind, 'charge');
// 非弓兵的後備粒子刀光一律是同一個（貼圖沒載好時用）
for (const t of [TroopType.Infantry, TroopType.Pikeman, TroopType.Shield, TroopType.Cavalry, TroopType.Engineer, TroopType.Navy, TroopType.Medic, 'elite_infantry', 'general']) {
  assert.equal(attackVfxFor(t).effectId, ATTACK_SLASH_EFFECT_ID);
}
for (const t of [TroopType.Infantry, TroopType.Engineer, TroopType.Navy, TroopType.Medic, 'elite_infantry', 'general']) assert.equal(attackVfxFor(t).kind, 'slash', String(t));
assert.equal(attackVfxFor('unknown-troop').kind, 'slash');
assert.equal(attackVfxFor(undefined).kind, 'slash');
assert.equal(attackVfxFor(null).kind, 'slash');
console.log('AttackVfxMapping ok');

// PROG-2-9361：攻擊特效對應的 prefab 必須「看得到」。
// 線上實況：p3d_cfxr_slash_ray 的粒子是拉伸模式（renderMode 1），長度倍率與速度倍率都是 0，粒子有發射但沒有面積。
// 這裡從登錄表找 prefab 路徑、直接讀 prefab 資料檢查，不寫死名單。
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { VFX_BLOCK_REGISTRY } from '../assets/scripts/core/config/vfx-block-registry';

const STRETCHED_BILLBOARD = 1;
const attackBlockIds = Array.from(new Set(
  [TroopType.Infantry, TroopType.Pikeman, TroopType.Shield, TroopType.Cavalry, TroopType.Archer, 'general']
    .map(t => attackVfxFor(t)).filter(v => v.kind !== 'arrow').map(v => v.effectId),
));
assert.ok(attackBlockIds.length > 0);
for (const blockId of attackBlockIds) {
  const block = VFX_BLOCK_REGISTRY.find(b => b.id === blockId);
  assert.ok(block, `攻擊特效 ${blockId} 必須在登錄表裡`);
  assert.ok(block!.prefabPath, `攻擊特效 ${blockId} 必須有 prefab，否則不會進物件池`);
  const file = join(__dirname, '../assets/bundles/vfx_core', `${block!.prefabPath}.prefab`);
  assert.ok(existsSync(file), `找不到 prefab：${file}`);
  const objects = JSON.parse(readFileSync(file, 'utf8')) as Array<Record<string, any>>;
  const systems = objects.filter(o => o.__type__ === 'cc.ParticleSystem' && o._enabled !== false);
  assert.ok(systems.length > 0, `攻擊特效 ${blockId} 的 prefab 沒有啟用的粒子系統`);
  for (const ps of systems) {
    const renderer = objects[ps.renderer?.__id__] ?? {};
    assert.ok(renderer._mainTexture, `攻擊特效 ${blockId} 的粒子沒有貼圖`);
    if (renderer._renderMode === STRETCHED_BILLBOARD) {
      assert.ok((renderer._lengthScale ?? 0) !== 0 || (renderer._velocityScale ?? 0) !== 0,
        `攻擊特效 ${blockId} 的粒子是拉伸模式，長度倍率與速度倍率不可同時為 0（會沒有面積、看不到）`);
    }
  }
}
console.log('AttackVfxMapping prefab visibility ok');

// PROG-2-9364：箭矢大小與飛行時間放在設定資料，不可寫死在演出流程裡；也不可調回看不見的大小。
import { ATTACK_ARROW_SHOT } from '../assets/scripts/battle/shared/AttackVfxMapping';
{
  const view = readFileSync(join(__dirname, '../assets/scripts/battle/views/ArrowShotView.ts'), 'utf8');
  assert.ok(!/new Size\(\s*\d/.test(view), '箭矢大小不可寫死在 ArrowShotView');
  assert.ok(!/FLIGHT_SEC\s*=\s*[\d.]/.test(view), '飛行時間不可寫死在 ArrowShotView');
  assert.ok(/ATTACK_ARROW_SHOT\.flightSec/.test(view) && /ATTACK_ARROW_SHOT\.width/.test(view), '箭矢演出要讀設定');
  assert.ok(ATTACK_ARROW_SHOT.width >= 80 && ATTACK_ARROW_SHOT.height >= 20, '箭矢太小在戰場上看不到');
  assert.ok(ATTACK_ARROW_SHOT.flightSec >= 0.3 && ATTACK_ARROW_SHOT.flightSec <= 0.6, '飛行時間太短看不到、太長會拖沓');
  console.log('AttackVfxMapping arrow config ok');
}
