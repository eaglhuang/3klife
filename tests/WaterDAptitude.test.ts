/**
 * 水域 D 級專屬規則（PROG-2-0786）headless 測試
 *
 * 規格：水域 D「移動力歸 1、攻擊減半」。地形專屬規則取代通用 D 表（不疊加）：
 * 水域 D 的地形項不再扣攻防、移動、命中；兵種與天氣的適性照常計算。
 */
import { TestSuite, assert } from './TestRunner';
import { applyAptitudeMove, resolveAptitude } from '../assets/scripts/core/systems/BattleAptitude';

const profileWith = (terrainGrade: string, troopGrade = 'B') => ({
    troopAptitude: { INFANTRY: troopGrade, CAVALRY: troopGrade },
    terrainAptitude: { WATER: terrainGrade, PLAIN: terrainGrade },
});

export function createWaterDAptitudeSuite(): TestSuite {
    const suite = new TestSuite('WaterDAptitude (水域 D 移動歸 1、攻擊減半 PROG-2-0786)');

    suite.test('水域 D：攻擊減半、攻擊防禦不扣、命中不扣、移動力設為 1', () => {
        const r = resolveAptitude(profileWith('D'), { troopType: 'infantry', terrain: 'river' });
        assert.equals(0.5, r.attackMultiplier);
        assert.equals(1, r.defenseMultiplier);
        assert.equals(0, r.accuracyDelta);
        assert.equals(1, r.moveSetTo ?? -1);
        assert.equals(0, r.moveDelta);
    });

    suite.test('水域 D 疊加兵種 D：兵種項照常計算（騎兵 D 攻防 −25%、移動 −2）', () => {
        const r = resolveAptitude(profileWith('D', 'D'), { troopType: 'cavalry', terrain: 'river' });
        assert.equals(0.375, r.attackMultiplier, '0.5 × (1 − 0.25)');
        assert.equals(0.75, r.defenseMultiplier, '1 × (1 − 0.25)');
        assert.equals(-2, r.moveDelta);
        assert.equals(1, r.moveSetTo ?? -1);
    });

    suite.test('非水域的 D 級維持通用 D 表（平原 D：攻擊 −25%、移動 −2、命中 −15%）', () => {
        const r = resolveAptitude(profileWith('D'), { troopType: 'infantry', terrain: 'plain' });
        assert.equals(0.75, r.attackMultiplier);
        assert.equals(-2, r.moveDelta);
        assert.equals(-0.15, r.accuracyDelta);
        assert.equals(null, r.moveSetTo);
    });

    suite.test('水域 B 級不變：無修正、無移動設值', () => {
        const r = resolveAptitude(profileWith('B'), { troopType: 'infantry', terrain: 'river' });
        assert.equals(1, r.attackMultiplier);
        assert.equals(1, r.defenseMultiplier);
        assert.equals(0, r.moveDelta);
        assert.equals(null, r.moveSetTo);
    });

    suite.test('applyAptitudeMove：有設值時直接設為該值；原本不能走（0 格）的維持 0', () => {
        assert.equals(1, applyAptitudeMove(4, 0, 1));
        assert.equals(1, applyAptitudeMove(4, -2, 1), '加減修正不影響設值');
        assert.equals(0, applyAptitudeMove(0, 0, 1), '被定身等 0 格維持不動');
    });

    suite.test('applyAptitudeMove：沒有設值時維持原本加減與下限 1 的規則', () => {
        assert.equals(2, applyAptitudeMove(4, -2));
        assert.equals(1, applyAptitudeMove(3, -2, null), 'C/D 夾在 1 格');
    });

    return suite;
}
