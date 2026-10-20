/**
 * 七進七出穿透路徑規則 headless 測試（PROG-2-0798）
 */
import { TestSuite, assert } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { resolveGhostPath, type GhostPathCell } from '../assets/scripts/battle/shared/GhostMovePath';

function cell(depth: number, occupantFaction: Faction | null = null, blocksMovement = false): GhostPathCell {
    return { lane: 0, depth, occupantFaction, blocksMovement };
}

export function createGhostMovePathSuite(): TestSuite {
    const suite = new TestSuite('GhostMovePath (七進七出穿透路徑 TAC-0003)');

    suite.test('空路徑或只有空格：通過，沒有穿透傷害', () => {
        const result = resolveGhostPath([cell(1)], Faction.Player);
        assert.isFalse(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('穿越兩個敵軍：各記一次，終點為空', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy), cell(2, Faction.Enemy), cell(3)], Faction.Player);
        assert.isFalse(result.blocked);
        assert.equals(2, result.passedEnemyCells.length);
        assert.equals(1, result.passedEnemyCells[0].depth);
        assert.equals(2, result.passedEnemyCells[1].depth);
    });

    suite.test('穿越岩石：整段無效', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy), cell(2, null, true), cell(3)], Faction.Player);
        assert.isTrue(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('穿越友軍：整段無效', () => {
        const result = resolveGhostPath([cell(1, Faction.Player), cell(2)], Faction.Player);
        assert.isTrue(result.blocked);
    });

    suite.test('終點被敵軍佔用：無效，不結算穿透', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy)], Faction.Player);
        assert.isTrue(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    return suite;
}
