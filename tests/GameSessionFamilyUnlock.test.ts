/**
 * GameSessionFamilyUnlock.test.ts — 世家系統解鎖旗標：第一位子嗣誕生後解鎖，舊檔以出生紀錄推導（HALL-12，PROG-2-1206）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import type { BreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';

function birthRecord(): BreedingBirthRecord {
    return { session: { Father_UID: 'F1', Mother_UID: 'M1' }, child: { UID: 'C1' } } as unknown as BreedingBirthRecord;
}
function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

export function createGameSessionFamilyUnlockSuite(): TestSuite {
    const suite = new TestSuite('GameSessionFamilyUnlock (PROG-2-1206 世家解鎖旗標)');

    suite.test('新遊戲尚未解鎖世家系統，存檔不寫入旗標', () => {
        const session = new GameSession(1);
        assert.isFalse(session.familySystemUnlocked);
        assert.isTrue(session.createSnapshot(new Date(0)).familySystemUnlocked === undefined);
    });

    suite.test('第一位子嗣誕生後解鎖，並寫入存檔', () => {
        const session = new GameSession(1);
        session.recordBreedingBirth(birthRecord());
        assert.isTrue(session.familySystemUnlocked);
        assert.isTrue(roundTrip(session.createSnapshot(new Date(0))).familySystemUnlocked === true);
    });

    suite.test('解鎖旗標跨存讀檔保留', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({ familySystemUnlocked: true } as unknown as PlayerSaveSnapshot);
        assert.isTrue(session.familySystemUnlocked);
    });

    suite.test('非布林的旗標值讀檔時不解鎖', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({ familySystemUnlocked: 'yes' } as unknown as PlayerSaveSnapshot);
        assert.isFalse(session.familySystemUnlocked);
    });

    return suite;
}
