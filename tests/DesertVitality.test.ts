import { desertVitalityDrain, DESERT_BASE_VITALITY_DRAIN } from '../assets/scripts/core/systems/DesertVitality';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';
import { TestSuite, assert } from './TestRunner';

export function createDesertVitalitySuite(): TestSuite {
    const suite = new TestSuite('DesertVitality (沙漠地形每回合精力消耗 APT-05)');

    suite.test('非沙漠地形不扣精力', () => {
        assert.equals(0, desertVitalityDrain(TerrainType.Plain, 'D'));
        assert.equals(0, desertVitalityDrain(null, 'D'));
    });

    suite.test('沙漠 S 級：基礎 × 0.5（消耗減半）', () => {
        assert.equals(DESERT_BASE_VITALITY_DRAIN * 0.5, desertVitalityDrain(TerrainType.Desert, 'S'));
    });

    suite.test('沙漠 D 級與中間等級：扣基礎值', () => {
        assert.equals(DESERT_BASE_VITALITY_DRAIN, desertVitalityDrain(TerrainType.Desert, 'D'));
        assert.equals(DESERT_BASE_VITALITY_DRAIN, desertVitalityDrain(TerrainType.Desert, 'B'));
    });

    return suite;
}
