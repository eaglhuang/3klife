// PROG-2-9367：近戰刀光改成畫面層的月牙貼圖。這裡鎖住：設定指到的貼圖存在、刀光朝向被打的一方、會掃動並淡出、大小與時間不可調到看不見。
import { strict as assert } from 'assert';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ATTACK_SLASH_SHOT, slashPoseAt } from '../assets/scripts/battle/shared/AttackSlashShot';

// 貼圖必須真的在 vfx_core bundle 裡，否則線上只會安靜地播不出來
assert.ok(existsSync(join(__dirname, '../assets/bundles/vfx_core', `${ATTACK_SLASH_SHOT.texturePath}.png`)), '刀光貼圖不存在');

// 月牙鼓起的一側朝向目標：往右打（0 度）時，貼圖鼓起方向（artBulgeDeg）轉完後要落在 0 度附近
for (const dir of [0, 90, 180, -135]) {
  const mid = slashPoseAt(0.75, dir); // 先快後慢，進度 0.75 時 eased ≈ 0.94；用頭尾平均檢查中心方向
  const start = slashPoseAt(0, dir), end = slashPoseAt(1, dir);
  const centre = (start.angle + end.angle) / 2 + ATTACK_SLASH_SHOT.artBulgeDeg;
  assert.ok(Math.abs(centre - dir) < 1e-6, `刀光中心方向應朝目標（${dir}），實際 ${centre}`);
  assert.ok(Math.abs(end.angle - start.angle - ATTACK_SLASH_SHOT.sweepDeg) < 1e-6, '整段要掃過設定的幅度');
  assert.ok(mid.angle > start.angle && mid.angle < end.angle);
}

// 一開始全亮、結束時全透明、途中只會越來越淡；大小由小到大
assert.equal(slashPoseAt(0, 0).opacity, 255);
assert.equal(slashPoseAt(1, 0).opacity, 0);
let last = 255;
for (let i = 0; i <= 20; i++) { const o = slashPoseAt(i / 20, 0).opacity; assert.ok(o <= last && o >= 0 && o <= 255); last = o; }
assert.equal(slashPoseAt(0, 0).scale, ATTACK_SLASH_SHOT.startScale);
assert.ok(Math.abs(slashPoseAt(1, 0).scale - ATTACK_SLASH_SHOT.endScale) < 1e-9);
// 超出範圍或壞值不可算出怪姿態
assert.deepEqual(slashPoseAt(5, 0), slashPoseAt(1, 0));
assert.deepEqual(slashPoseAt(-1, 0), slashPoseAt(0, 0));
assert.equal(slashPoseAt(NaN, 0).opacity, 0);

// 不可調到在 1920 寬戰場上看不見，也不可久到拖沓
assert.ok(ATTACK_SLASH_SHOT.size >= 96 && ATTACK_SLASH_SHOT.size <= 220);
assert.ok(ATTACK_SLASH_SHOT.durationSec >= 0.18 && ATTACK_SLASH_SHOT.durationSec <= 0.5);

// 大小與時間只能來自設定，演出元件不可寫死；攻擊演出要真的呼叫刀光元件
const view = readFileSync(join(__dirname, '../assets/scripts/battle/views/SlashShotView.ts'), 'utf8');
assert.ok(!/new Size\(\s*\d/.test(view), '刀光大小不可寫死在 SlashShotView');
assert.ok(/ATTACK_SLASH_SHOT\.durationSec/.test(view) && /ATTACK_SLASH_SHOT\.size/.test(view));
const renderer = readFileSync(join(__dirname, '../assets/scripts/battle/views/UnitRenderer.ts'), 'utf8');
assert.ok(/this\.slashShots\.play\(/.test(renderer) && /this\.slashShots\.update\(dt\)/.test(renderer), '攻擊演出要播刀光並每幀更新');

console.log('AttackSlashShot: ok');
