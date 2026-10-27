/**
 * CellarProtection.test.ts — 地窖保護（PROG-2-1341，ECO-06）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { CELLAR_PROTECTION, protectedAfterLoss } from '../assets/scripts/core/systems/CellarProtection';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

function sessionWithFood(food: number): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1')]));
    const military = (session as unknown as { _military: { food: number; foodCap: number } })._military;
    military.foodCap = Math.max(military.foodCap, food);
    military.food = food;
    return session;
}

export function createCellarProtectionSuite(): TestSuite {
    const suite = new TestSuite('CellarProtection (PROG-2-1341 地窖保護)');

    suite.test('保底值依經濟系統表', () => {
        assert.equals(1500, CELLAR_PROTECTION.foodFloor);
        assert.equals(600, CELLAR_PROTECTION.goldFloor);
    });

    suite.test('扣到保底以下時夾回保底，回報保住的量', () => {
        const r = protectedAfterLoss(3000, 500, 1500);
        assert.equals(1500, r.after);
        assert.equals(1000, r.saved);
    });

    suite.test('扣後仍在保底以上不觸發', () => {
        const r = protectedAfterLoss(3000, 2000, 1500);
        assert.equals(2000, r.after);
        assert.equals(0, r.saved);
    });

    suite.test('戰前已低於保底：不再扣，也不補', () => {
        const r = protectedAfterLoss(800, 300, 1500);
        assert.equals(800, r.after);
        assert.equals(500, r.saved);
        assert.equals(800, protectedAfterLoss(800, 800, 1500).after);
    });

    suite.test('戰敗出征：糧草不低於保底，記下保住的量', async () => {
        const session = sessionWithFood(2000);
        await session.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: 0, foodSpent: 1800 } });
        assert.equals(1500, session.military.food);
        assert.equals(1300, session.lastCellarProtectedFood);
    });

    suite.test('勝利出征照常扣糧，不觸發保底', async () => {
        const session = sessionWithFood(2000);
        await session.recordBattle(['lead-1'], 'player-win', { sortie: { lostTroops: 0, foodSpent: 1800 } });
        assert.equals(200, session.military.food);
        assert.equals(0, session.lastCellarProtectedFood);
    });

    return suite;
}
