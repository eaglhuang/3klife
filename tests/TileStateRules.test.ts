import { TestSuite, assert } from './TestRunner';
import type { TileEffect } from '../assets/scripts/battle/models/BattleState';
import { TILE_STATE_RULES, tileStateKindOf, tileStateRuleOf } from '../assets/scripts/battle/shared/TileStateRules';

function effect(overrides: Partial<TileEffect> & Pick<TileEffect, 'state'>): TileEffect {
    return { id: 't', lane: 0, depth: 0, ...overrides };
}

export function createTileStateRulesSuite(): TestSuite {
    const suite = new TestSuite('TileStateRules (格子狀態四類 GRD-01)');

    suite.test('四類規則表：normal 無效果；hazard 進格扣血；force-move 進格推移；stealth 進格隱蔽', () => {
        assert.isFalse(TILE_STATE_RULES.normal.damagesOnEnter || TILE_STATE_RULES.normal.pushesOnEnter || TILE_STATE_RULES.normal.hidesOnEnter);
        assert.isTrue(TILE_STATE_RULES.hazard.damagesOnEnter);
        assert.isTrue(TILE_STATE_RULES['force-move'].pushesOnEnter);
        assert.isTrue(TILE_STATE_RULES.stealth.hidesOnEnter);
        assert.isFalse(TILE_STATE_RULES.stealth.damagesOnEnter);
    });

    suite.test('火燒（有 damagePerTurn）分類為 hazard', () => {
        assert.equals('hazard', tileStateKindOf(effect({ state: 'hazard-fire', damagePerTurn: 10 })));
    });

    suite.test('落石（有 forcedMoveDirection）分類為 force-move', () => {
        assert.equals('force-move', tileStateKindOf(effect({ state: 'hazard-rock', blocksMovement: true, forcedMoveDirection: 'backward', forcedMoveSteps: 1 })));
        assert.equals('force-move', tileStateKindOf(effect({ state: 'river-current', forcedMoveDirection: 'forward' })));
    });

    suite.test('埋伏草叢（ambush-field）分類為 stealth', () => {
        assert.equals('stealth', tileStateKindOf(effect({ state: 'ambush-field' })));
    });

    suite.test('夜襲裝飾、營帳與空格分類為 normal', () => {
        assert.equals('normal', tileStateKindOf(effect({ state: 'night-raid' })));
        assert.equals('normal', tileStateKindOf(effect({ state: 'scene-camp', blocksMovement: false })));
        assert.equals('normal', tileStateKindOf(null));
        assert.equals('normal', tileStateKindOf(undefined));
    });

    suite.test('規則查詢與分類一致', () => {
        assert.equals(TILE_STATE_RULES.hazard, tileStateRuleOf(effect({ state: 'hazard-fire', damagePerTurn: 5 })));
    });

    return suite;
}
