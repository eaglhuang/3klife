import { TestSuite, assert } from './TestRunner';
import type { TileEffect } from '../assets/scripts/battle/models/BattleState';
import { TILE_STATE_RULES, tileStateKindOf, tileStateRuleOf } from '../assets/scripts/battle/shared/TileStateRules';

function effect(overrides: Partial<TileEffect> & Pick<TileEffect, 'state'>): TileEffect {
    return { id: 't', lane: 0, depth: 0, ...overrides };
}

export function createTileStateRulesSuite(): TestSuite {
    const suite = new TestSuite('TileStateRules (格子狀態四類 GRD-01)');

    suite.test('規則表：normal 無效果；火回合結束扣血；水流回合結束推移；force-move 進格推移；stealth 進格隱蔽；blocked 進格阻擋', () => {
        const n = TILE_STATE_RULES.normal;
        assert.isFalse(n.blocksOnEnter || n.damagesOnTurnEnd || n.pushesOnTurnEnd || n.pushesOnEnter || n.hidesOnEnter);
        assert.isTrue(TILE_STATE_RULES.hazard.damagesOnTurnEnd);
        assert.isTrue(TILE_STATE_RULES['river-current'].pushesOnTurnEnd);
        assert.isFalse(TILE_STATE_RULES['river-current'].pushesOnEnter);
        assert.isTrue(TILE_STATE_RULES['force-move'].pushesOnEnter);
        assert.isTrue(TILE_STATE_RULES.stealth.hidesOnEnter);
        assert.isTrue(TILE_STATE_RULES.blocked.blocksOnEnter);
    });

    suite.test('火燒（有 damagePerTurn）分類為 hazard', () => {
        assert.equals('hazard', tileStateKindOf(effect({ state: 'hazard-fire', damagePerTurn: 10 })));
    });

    suite.test('落石（blocksMovement）分類為 blocked，即使有 forcedMoveDirection 也優先阻擋', () => {
        assert.equals('blocked', tileStateKindOf(effect({ state: 'hazard-rock', blocksMovement: true })));
        assert.equals('blocked', tileStateKindOf(effect({ state: 'hazard-rock', blocksMovement: true, forcedMoveDirection: 'backward', forcedMoveSteps: 1 })));
        assert.isTrue(tileStateRuleOf(effect({ state: 'hazard-rock', blocksMovement: true })).blocksOnEnter);
    });

    suite.test('水流（river-current）分類為 river-current，時機是回合結束，不是進格推移', () => {
        assert.equals('river-current', tileStateKindOf(effect({ state: 'river-current' })));
        assert.isTrue(tileStateRuleOf(effect({ state: 'river-current' })).pushesOnTurnEnd);
        assert.isFalse(tileStateRuleOf(effect({ state: 'river-current' })).pushesOnEnter);
    });

    suite.test('非水流的強制推移（有 forcedMoveDirection）仍分類為 force-move', () => {
        assert.equals('force-move', tileStateKindOf(effect({ state: 'night-raid', forcedMoveDirection: 'forward' })));
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
