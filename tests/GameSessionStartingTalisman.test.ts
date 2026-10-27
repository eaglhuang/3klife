/**
 * GameSessionStartingTalisman.test.ts — 英靈夢回教學戰的初始虎符存讀與只寫一次（PROG-2-1205，OPEN-13）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import type { TeachingSpiritInput } from '../assets/scripts/core/systems/TeachingSpiritTalisman';

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

function zhaoyun(): TeachingSpiritInput {
    return { spiritId: 'SPIRIT_ZHAOYUN', spiritName: '趙雲', geneIds: ['GENE_A', 'GENE_B', 'GENE_C'] };
}

export function createGameSessionStartingTalismanSuite(): TestSuite {
    const suite = new TestSuite('GameSessionStartingTalisman (PROG-2-1205 初始虎符)');

    suite.test('新遊戲沒有初始虎符，存檔不寫入欄位', () => {
        const session = new GameSession(1);
        assert.isTrue(session.startingTalisman === null);
        assert.isTrue(session.createSnapshot(new Date(0)).startingTalisman === undefined);
    });

    suite.test('教學戰完成後產出虎符，來源與基因上限正確', () => {
        const session = new GameSession(1);
        const talisman = session.completeTeachingBattle(zhaoyun())!;
        assert.equals('SPIRIT_ZHAOYUN', talisman.sourceSpiritId);
        assert.equals('GENE_A,GENE_B', talisman.geneIds.join(','));
        assert.equals('GENE_A,GENE_B', session.startingTalisman!.geneIds.join(','));
    });

    suite.test('第二次教學戰完成不覆蓋既有虎符', () => {
        const session = new GameSession(1);
        session.completeTeachingBattle(zhaoyun());
        const again = session.completeTeachingBattle({ spiritId: 'SPIRIT_LVBU', spiritName: '呂布', geneIds: ['GENE_X'] })!;
        assert.equals('SPIRIT_ZHAOYUN', again.sourceSpiritId);
        assert.equals('SPIRIT_ZHAOYUN', session.startingTalisman!.sourceSpiritId);
    });

    suite.test('虎符跨存讀檔保留，讀回後不覆蓋', () => {
        const session = new GameSession(1);
        session.completeTeachingBattle(zhaoyun());

        const snapshot = roundTrip(session.createSnapshot(new Date(0)));
        assert.equals('SPIRIT_ZHAOYUN', snapshot.startingTalisman!.sourceSpiritId);

        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals('TALISMAN', restored.startingTalisman!.kind);
        restored.completeTeachingBattle({ spiritId: 'SPIRIT_LVBU', spiritName: '呂布', geneIds: [] });
        assert.equals('SPIRIT_ZHAOYUN', restored.startingTalisman!.sourceSpiritId);
    });

    suite.test('壞資料的虎符在讀檔時被丟棄，不會讓會話拿到殘缺虎符', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({ startingTalisman: { kind: 'BOGUS', sourceSpiritId: 'X' } } as unknown as PlayerSaveSnapshot);
        assert.isTrue(session.startingTalisman === null);
    });

    suite.test('回傳的虎符是複本，改動不會回寫到會話', () => {
        const session = new GameSession(1);
        session.completeTeachingBattle(zhaoyun());
        session.startingTalisman!.geneIds.push('GENE_HACKED');
        assert.equals('GENE_A,GENE_B', session.startingTalisman!.geneIds.join(','));
    });

    return suite;
}
