/**
 * TileInteractionMatrix — 地格狀態消長（doc_spec_0339 §2；PROG-2-2024）
 */
import { assert, TestSuite } from './TestRunner';
import { resolveTileInteraction, type TileLayer } from '../assets/scripts/battle/shared/TileInteractionMatrix';

const FIRE: TileLayer = { kind: 'hazard', tag: 'fire', durationTurns: 2, intensity: 1 };
const POISON: TileLayer = { kind: 'hazard', tag: 'poison', durationTurns: -1, intensity: 1 };
const FOREST: TileLayer = { kind: 'stealth', tag: 'forest', durationTurns: -1, intensity: 0 };
const SURGE: TileLayer = { kind: 'force-move', tag: 'water_surge', durationTurns: 1, intensity: 2 };
const WATER: TileLayer = { kind: 'normal', tag: 'water', durationTurns: 0, intensity: 0 };

export function createTileInteractionMatrixSuite(): TestSuite {
    const suite = new TestSuite('TileInteractionMatrix (地格消長 doc_spec_0339 PROG-2-2024)');

    suite.test('§2.1 水滅火產生 1 回合濃霧', () => {
        const r = resolveTileInteraction(FIRE, { element: 'water', layer: WATER });
        assert.equals('water-quench-fire', r.ruleId!);
        assert.equals('stealth', r.layer.kind);
        assert.equals('steam', r.layer.tag);
        assert.equals(1, r.layer.durationTurns);
        assert.isFalse(r.reveal);
    });

    suite.test('§2.2 水淹沖刷毒沼，換成位移地格', () => {
        const r = resolveTileInteraction(POISON, { element: 'water_surge', layer: SURGE });
        assert.equals('surge-wash-hazard', r.ruleId!);
        assert.equals('force-move', r.layer.kind);
        assert.equals(2, r.layer.intensity);
        assert.equals(null, resolveTileInteraction(FIRE, { element: 'water_surge', layer: SURGE }).ruleId);
    });

    suite.test('§2.3 火燒密林轉火海並逼出伏兵', () => {
        const r = resolveTileInteraction(FOREST, { element: 'fire', layer: FIRE });
        assert.equals('fire-burn-forest', r.ruleId!);
        assert.equals('hazard', r.layer.kind);
        assert.equals('fire', r.layer.tag);
        assert.isTrue(r.reveal);
    });

    suite.test('未命中規則時新效果直接覆蓋；離開掩體即解除隱匿', () => {
        const r = resolveTileInteraction(FOREST, { element: 'water_surge', layer: SURGE });
        assert.equals(null, r.ruleId);
        assert.equals('force-move', r.layer.kind);
        assert.isTrue(r.reveal);
        assert.isFalse(resolveTileInteraction(POISON, { element: 'fire', layer: FIRE }).reveal);
    });

    return suite;
}
