/**
 * OfficerPermissions — 官職權限快照（OFC-04）的 headless 測試
 *
 * 鎖住：階位對應的權限（難度上限、欄位數、沙盤階段）、快照凍結、
 * 改快照不回寫官職狀態、解鎖歷史是副本。
 */
import { assert, TestSuite } from './TestRunner';
import { officerPermissionsOf } from '../assets/scripts/core/systems/OfficerPermissions';
import { initialOfficerState, type OfficerState } from '../assets/scripts/core/systems/OfficerState';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

function stateAtTier(tier: number): OfficerState {
    return { currentTier: tier, officerExp: 0, unlockHistory: Array.from({ length: tier }, (_, i) => i + 1) };
}

export function createOfficerPermissionsSuite(): TestSuite {
    const suite = new TestSuite('OfficerPermissions (官職權限快照 OFC-04)');

    suite.test('初始官職：階位 1、難度上限 basic、沙盤未解鎖', () => {
        const permissions = officerPermissionsOf(initialOfficerState());
        assert.equals(1, permissions.tier);
        assert.equals('basic', permissions.questDifficultyCap);
        assert.isTrue(permissions.sandtableStage === null);
        assert.equals(0, permissions.officerExp);
    });

    suite.test('階位 3 解鎖沙盤 S1，階位 5 為 hell 且 S3', () => {
        assert.equals('S1', officerPermissionsOf(stateAtTier(3)).sandtableStage ?? '');
        const top = officerPermissionsOf(stateAtTier(5));
        assert.equals('hell', top.questDifficultyCap);
        assert.equals('S3', top.sandtableStage ?? '');
    });

    suite.test('快照凍結：改寫欄位不生效，且不影響官職狀態', () => {
        const state = stateAtTier(2);
        const permissions = officerPermissionsOf(state);
        assert.isTrue(Object.isFrozen(permissions));
        assert.isTrue(Object.isFrozen(permissions.unlockHistory));
        assert.isFalse(Reflect.set(permissions, 'tier', 5));
        assert.equals(2, permissions.tier);
        assert.equals(2, state.currentTier);
    });

    suite.test('解鎖歷史是副本：改原陣列不影響快照', () => {
        const state = stateAtTier(2);
        const permissions = officerPermissionsOf(state);
        state.unlockHistory.push(9);
        assert.equals(2, permissions.unlockHistory.length);
    });

    suite.test('GameSession.officerPermissions：跟著經驗晉升更新，且是唯讀快照', () => {
        const session = new GameSession();
        assert.equals(1, session.officerPermissions.tier);
        const hellMilitaryWin = { difficulty: 'HELL' as const, boardType: 'MILITARY' as const, success: true };
        for (let i = 0; i < 4; i++) session.gainOfficerExp(hellMilitaryWin);
        const permissions = session.officerPermissions;
        assert.equals(3, permissions.tier);
        assert.equals('S1', permissions.sandtableStage ?? '');
        assert.equals(316, permissions.officerExp);
        assert.isTrue(Object.isFrozen(permissions));
    });

    return suite;
}
