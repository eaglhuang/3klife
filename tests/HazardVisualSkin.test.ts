/**
 * HazardVisualSkin.test.ts — Hazard 格換皮（火海／毒沼）headless 測試（GRD-05 / PROG-2-1307）
 *
 * 鎖住：同一個 hazard 格換 fire 或 poison 皮，傷害規則不變，只有 Decal 與 VFX 路徑不同；
 * 非 hazard 格不掛任何換皮特效。
 *
 * Unity 對照：同一個 Damage Zone 腳本換 Material 與 Particle Prefab，OnTriggerStay 的判定不會因此改變。
 */
import { assert, TestSuite } from './TestRunner';
import type { TileEffect } from '../assets/scripts/battle/models/BattleState';
import { hazardVisualPlan, HAZARD_VISUAL_ROOT } from '../assets/scripts/battle/shared/HazardVisualSkin';
import { tileStateRuleOf } from '../assets/scripts/battle/shared/TileStateRules';

function hazardTile(): TileEffect {
    return { id: 'h-1', lane: 1, depth: 2, state: 'hazard-fire', damagePerTurn: 30 };
}

export function createHazardVisualSkinSuite(): TestSuite {
    const suite = new TestSuite('HazardVisualSkin (Hazard 格換皮 GRD-05 / PROG-2-1307)');

    suite.test('火海與毒沼同一格，Decal 與 VFX 路徑各自不同', () => {
        const fire = hazardVisualPlan(hazardTile(), 'fire')!;
        const poison = hazardVisualPlan(hazardTile(), 'poison')!;
        assert.equals(`${HAZARD_VISUAL_ROOT}fire-decal.prefab`, fire.decalPath);
        assert.equals(`${HAZARD_VISUAL_ROOT}poison-vfx.prefab`, poison.vfxPath);
        assert.isFalse(fire.decalPath === poison.decalPath);
        assert.isFalse(fire.vfxPath === poison.vfxPath);
    });

    suite.test('換皮不改傷害規則：同一格兩種皮的回合結束扣血判定相同', () => {
        const rule = tileStateRuleOf(hazardTile());
        assert.isTrue(rule.damagesOnTurnEnd);
        assert.equals('hazard', rule.kind);
        assert.isTrue(hazardVisualPlan(hazardTile(), 'fire') !== null);
        assert.isTrue(hazardVisualPlan(hazardTile(), 'poison') !== null);
    });

    suite.test('非 hazard 格（無效果、落石阻擋以外的其他地形）不掛換皮', () => {
        assert.isTrue(hazardVisualPlan(null, 'fire') === null);
        assert.isTrue(hazardVisualPlan(undefined, 'poison') === null);
        const river: TileEffect = { id: 'r-1', lane: 0, depth: 0, state: 'river-current' };
        assert.isTrue(hazardVisualPlan(river, 'poison') === null);
    });

    return suite;
}
