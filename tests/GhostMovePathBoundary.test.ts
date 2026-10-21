/**
 * 七進七出穿透路徑邊界組合測試（PROG-2-0631，補 PROG-2-0798 的邊界）
 */
import { TestSuite, assert } from './TestRunner';
import { Faction } from '../assets/scripts/shared/CommonEnums';
import { resolveGhostPath, type GhostPathCell } from '../assets/scripts/battle/shared/GhostMovePath';

function cell(depth: number, occupantFaction: Faction | null = null, blocksMovement = false, lane = 0): GhostPathCell {
    return { lane, depth, occupantFaction, blocksMovement };
}

export function createGhostMovePathBoundarySuite(): TestSuite {
    const suite = new TestSuite('GhostMovePath 邊界組合 (PROG-2-0631)');

    suite.test('空陣列路徑：視為有效且無穿透（呼叫端須自行確保有終點）', () => {
        const result = resolveGhostPath([], Faction.Player);
        assert.isFalse(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('敵方施放：陣營對調，穿過玩家軍而不是敵軍', () => {
        const result = resolveGhostPath([cell(1, Faction.Player), cell(2, Faction.Player), cell(3)], Faction.Enemy);
        assert.isFalse(result.blocked);
        assert.equals(2, result.passedEnemyCells.length);
        const blocked = resolveGhostPath([cell(1, Faction.Enemy), cell(2)], Faction.Enemy);
        assert.isTrue(blocked.blocked);
    });

    suite.test('終點是岩石：整段無效，已穿過的敵軍不計', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy), cell(2, null, true)], Faction.Player);
        assert.isTrue(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('岩石格上同時有敵軍：岩石優先，整段無效', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy, true), cell(2)], Faction.Player);
        assert.isTrue(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('友軍在敵軍之後：之前穿過的敵軍結果被清空', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy), cell(2, Faction.Enemy), cell(3, Faction.Player), cell(4)], Faction.Player);
        assert.isTrue(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('終點是友軍：整段無效', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy), cell(2, Faction.Player)], Faction.Player);
        assert.isTrue(result.blocked);
        assert.equals(0, result.passedEnemyCells.length);
    });

    suite.test('七個敵軍連續穿過（七進七出）：七格各記一次、順序保持', () => {
        const path: GhostPathCell[] = [];
        for (let depth = 1; depth <= 7; depth += 1) path.push(cell(depth, Faction.Enemy));
        path.push(cell(8));
        const result = resolveGhostPath(path, Faction.Player);
        assert.isFalse(result.blocked);
        assert.equals(7, result.passedEnemyCells.length);
        assert.equals(1, result.passedEnemyCells[0].depth);
        assert.equals(7, result.passedEnemyCells[6].depth);
    });

    suite.test('跨列路徑：lane 與 depth 原樣回傳', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy, false, 0), cell(1, Faction.Enemy, false, 1), cell(2, null, false, 1)], Faction.Player);
        assert.equals(2, result.passedEnemyCells.length);
        assert.equals(1, result.passedEnemyCells[1].lane);
    });

    suite.test('同一格在路徑中重複出現：規格寫「同格只算一次」，必須去重', () => {
        const result = resolveGhostPath([cell(1, Faction.Enemy), cell(1, Faction.Enemy), cell(2)], Faction.Player);
        assert.isFalse(result.blocked);
        assert.equals(1, result.passedEnemyCells.length);
    });

    suite.test('輸入不被修改（純函式）', () => {
        const path = [cell(1, Faction.Enemy), cell(2)];
        const snapshot = JSON.stringify(path);
        resolveGhostPath(path, Faction.Player);
        assert.equals(snapshot, JSON.stringify(path));
    });

    return suite;
}
