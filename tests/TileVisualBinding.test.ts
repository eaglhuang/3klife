/**
 * TileVisualBinding — 地格視覺綁定與池化（doc_spec_0348；PROG-2-2034）
 */
import { assert, TestSuite } from './TestRunner';
import { TileVisualPool, TileVisualRegistry, TILE_VISUAL_POOL, shouldShowTileVfx } from '../assets/scripts/battle/shared/TileVisualBinding';

export function createTileVisualBindingSuite(): TestSuite {
    const suite = new TestSuite('TileVisualBinding (地格視覺綁定 doc_spec_0348 PROG-2-2034)');

    suite.test('§5-1 同一 Hazard 邏輯，fire／poison 綁不同貼花與 VFX', () => {
        const registry = new TileVisualRegistry();
        const fire = registry.get('hazard_fire')!;
        const poison = registry.get('hazard_poison')!;
        assert.isTrue(fire.decalFramePath.endsWith('decal_ground_scorched'));
        assert.isTrue(poison.vfxPrefabPath.endsWith('vfx_poison_mist'));
        assert.isTrue(fire.decalFramePath !== poison.decalFramePath);
        assert.equals(0.4, registry.get('force_move_water')!.durationSec);
        assert.equals(undefined, registry.get('unknown'));
    });

    suite.test('§5-2 連續 50 次燃燒與消退，活躍數不超過池容量', () => {
        const pool = new TileVisualPool();
        for (let i = 0; i < 50; i++) {
            const key = `t${i % 20}`;
            pool.acquire(key, 'hazard_fire', true);
            assert.isTrue(pool.activeDecals <= TILE_VISUAL_POOL.decal);
            assert.isTrue(pool.activeVfx <= TILE_VISUAL_POOL.vfx);
            if (i % 3 === 0) pool.release(`t${(i + 7) % 20}`);
        }
        for (let i = 0; i < 20; i++) pool.release(`t${i}`);
        assert.equals(0, pool.activeDecals);
        assert.equals(0, pool.activeVfx);
    });

    suite.test('§3 配額用完回 null；同格重掛不重複佔用', () => {
        const pool = new TileVisualPool({ decal: 2, vfx: 1 });
        assert.isTrue(pool.acquire('a', 'hazard_fire', true)!.hasVfx);
        assert.isFalse(pool.acquire('b', 'hazard_fire', true)!.hasVfx);
        assert.equals(null, pool.acquire('c', 'hazard_fire', true));
        pool.acquire('a', 'hazard_poison', true);
        assert.equals(2, pool.activeDecals);
    });

    suite.test('§3 FPS < 30 關閉 VFX', () => {
        assert.isFalse(shouldShowTileVfx(29));
        assert.isTrue(shouldShowTileVfx(30));
        const pool = new TileVisualPool();
        assert.isFalse(pool.acquire('x', 'hazard_fire', shouldShowTileVfx(20))!.hasVfx);
    });

    return suite;
}
