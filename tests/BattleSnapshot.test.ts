/**
 * 單場戰報快照與單場 MVP、最高傷害（REC-09，PROG-2-0436）
 *
 * 鎖住：快照數值清洗（負數、NaN、小數取整）、MVP 分數（勝 +3、擊殺 ×2、傷害與守護力 ÷1000）、
 * 同分取先出現者、無快照為 null、統計不改寫輸入。MVP 權重為暫定，這裡鎖的是計算規則。
 */
import { assert, TestSuite } from './TestRunner';
import {
    battleMvpScore,
    buildBattleSnapshot,
    summarizeBattleReport,
    type BattleSnapshot,
} from '../assets/scripts/core/systems/BattleSnapshot';

function snap(generalUid: string, overrides: Partial<BattleSnapshot> = {}): BattleSnapshot {
    return {
        battleId: 'B1',
        generalUid,
        damageDealt: 0,
        damageTaken: 0,
        healingDone: 0,
        kills: 0,
        isWinner: false,
        battleDate: '2026Q3',
        ...overrides,
    };
}

export function createBattleSnapshotSuite(): TestSuite {
    const suite = new TestSuite('BattleSnapshot (單場戰報快照與 MVP REC-09)');

    suite.test('快照清洗：負數與 NaN 視為 0，小數取整', () => {
        const s = buildBattleSnapshot('B1', 'g1', { kills: 2.9, damageDealt: -5, damageTaken: Number.NaN, healingDone: 7.8 }, true, '2026Q3');
        assert.equals(2, s.kills);
        assert.equals(0, s.damageDealt);
        assert.equals(0, s.damageTaken);
        assert.equals(7, s.healingDone);
        assert.isTrue(s.isWinner);
        assert.equals('2026Q3', s.battleDate);
    });

    suite.test('單場 MVP 分數：勝 +3、擊殺 ×2、傷害與守護力 ÷1000', () => {
        const s = snap('g1', { isWinner: true, kills: 4, damageDealt: 2000, damageTaken: 1000, healingDone: 500 });
        assert.equals(3 + 8 + 2 + 1.5, battleMvpScore(s));
    });

    suite.test('戰報摘要：MVP 取分數最高者，同分取先出現者', () => {
        const summary = summarizeBattleReport([
            snap('a', { kills: 2 }),
            snap('b', { kills: 2 }),
            snap('c', { kills: 1 }),
        ]);
        assert.equals('a', summary.mvpGeneralUid);
    });

    suite.test('戰報摘要：最高傷害取傷害最高者，同分取先出現者', () => {
        const summary = summarizeBattleReport([
            snap('a', { damageDealt: 500 }),
            snap('b', { damageDealt: 900 }),
            snap('c', { damageDealt: 900 }),
        ]);
        assert.equals('b', summary.topDamageGeneralUid);
    });

    suite.test('戰報摘要：無快照時兩者皆為 null；統計不改寫輸入', () => {
        const empty = summarizeBattleReport([]);
        assert.isTrue(empty.mvpGeneralUid === null);
        assert.isTrue(empty.topDamageGeneralUid === null);

        const list = [snap('a', { kills: 1 })];
        const before = JSON.stringify(list);
        summarizeBattleReport(list);
        assert.equals(before, JSON.stringify(list));
    });

    return suite;
}
