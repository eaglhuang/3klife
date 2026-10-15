/**
 * 精華快照接上死亡結算與英靈卡（LIFE-11，PROG-2-0802）
 *
 * 鎖住：累積 TP 只增不減、受傷撤回同步扣回；精華快照行的格式與無效輸入；
 * 英靈卡快照行只讀 legacyEssence。
 */
import { assert, TestSuite } from './TestRunner';
import { legacyEssenceLine, legacySnapshotOf } from '../assets/scripts/core/systems/LegacyArena';
import { grantNurtureTp, type NurtureSession } from '../assets/scripts/core/systems/NurtureSystem';

export function createLegacyArenaEssenceSuite(): TestSuite {
    const suite = new TestSuite('LegacyArenaEssence (精華快照接線 LIFE-11)');

    suite.test('精華快照行：格式為「精華快照：N」，N 取整數且不為負', () => {
        assert.equals('精華快照：50', legacyEssenceLine(50));
        assert.equals('精華快照：50', legacyEssenceLine(50.9));
        assert.equals('精華快照：0', legacyEssenceLine(-3));
    });

    suite.test('精華快照行：未定（舊卡缺欄位）顯示 0，不拋錯', () => {
        assert.equals('精華快照：0', legacyEssenceLine(undefined));
        assert.equals('精華快照：0', legacyEssenceLine(Number.NaN));
    });

    suite.test('死亡結算用的 Total_TP 為 0 時精華快照為 0（沒有培育的武將不產生精華）', () => {
        assert.equals(0, legacySnapshotOf(0));
    });

    suite.test('累積 TP：獲得加總、受傷撤回扣回，當前 TP 與累積 TP 同步', () => {
        const session = { tp: 0 } as unknown as NurtureSession;
        grantNurtureTp(session, 10);
        grantNurtureTp(session, -4);
        assert.equals(6, session.tp);
        assert.equals(6, session.totalTp!);
    });

    suite.test('累積 TP：當前 TP 被戰法學習消耗後，累積 TP 不減', () => {
        const session = { tp: 0 } as unknown as NurtureSession;
        grantNurtureTp(session, 10);
        session.tp -= 5; // 戰法學習直接扣當前 TP，不經 grantNurtureTp
        assert.equals(5, session.tp);
        assert.equals(10, session.totalTp!);
    });

    return suite;
}
