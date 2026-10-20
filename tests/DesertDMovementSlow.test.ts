/**
 * 沙漠 D 級移動減速（PROG-2-0790）headless 測試
 *
 * 規格：沙漠 D「每回合扣精力、移動減速」。移動減速沿用通用 D 表（移動 −2），
 * 沒有另外疊加；這裡鎖住這個行為，避免日後重複扣。精力扣減見 DesertVitality / DesertTileEffectPhase。
 */
import { TestSuite, assert } from './TestRunner';
import { resolveAptitude } from '../assets/scripts/core/systems/BattleAptitude';

const profile = { terrainAptitude: { DESERT: 'D' }, troopAptitude: { INFANTRY: 'B' } };

export function createDesertDMovementSlowSuite(): TestSuite {
    const suite = new TestSuite('DesertDMovementSlow (沙漠 D 移動減速 PROG-2-0790)');

    suite.test('沙漠 D：移動減速為通用 D 表的 −2', () => {
        const r = resolveAptitude(profile, { troopType: 'infantry', terrain: 'desert' });
        assert.equals(-2, r.moveDelta);
    });

    suite.test('沙漠 S/A/B：不減速', () => {
        assert.isTrue(resolveAptitude({ terrainAptitude: { DESERT: 'S' } }, { troopType: 'infantry', terrain: 'desert' }).moveDelta >= 0, 'S 級不會是負的');
        assert.equals(0, resolveAptitude({ terrainAptitude: { DESERT: 'B' } }, { troopType: 'infantry', terrain: 'desert' }).moveDelta);
    });

    return suite;
}
