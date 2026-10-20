/**
 * 大廳官職快照解讀（HALL-11 / PROG-2-0819）
 *
 * 鎖住：代碼與數字階位都能讀、壞值退回階位 1、
 * 任務難度上限與世界沙盤階段依官職規格 F-2 查表。
 */
import { assert, TestSuite } from './TestRunner';
import { normalizeOfficerSnapshot, officerUnlocksOf } from '../assets/scripts/core/systems/OfficerSnapshot';

export function createOfficerSnapshotSuite(): TestSuite {
    const suite = new TestSuite('OfficerSnapshot (大廳官職快照 HALL-11)');

    suite.test('讀取 Officer_Snapshot：代碼字串與數字階位都可讀', () => {
        assert.equals(3, normalizeOfficerSnapshot({ Current_Tier: 'OFFICER_TIER_3' }).tier);
        assert.equals(4, normalizeOfficerSnapshot({ tier: 4 }).tier);
    });

    suite.test('壞值或缺欄位退回階位 1', () => {
        assert.equals(1, normalizeOfficerSnapshot(null).tier);
        assert.equals(1, normalizeOfficerSnapshot({ Current_Tier: 'OFFICER_TIER_9' }).tier);
        assert.equals(1, normalizeOfficerSnapshot({ Current_Tier: 2.5 }).tier);
    });

    suite.test('郡守（階位 3）：精英任務與世界沙盤 S1，州牧以上才有 S2', () => {
        const tier3 = officerUnlocksOf({ tier: 3, code: 'OFFICER_TIER_3' });
        assert.equals('elite', tier3.questDifficultyCap);
        assert.equals('S1', tier3.sandtableStage ?? '');
        assert.equals('S2', officerUnlocksOf({ tier: 4, code: 'OFFICER_TIER_4' }).sandtableStage ?? '');
    });

    suite.test('鄉里義士（階位 1）：基本任務、沒有沙盤', () => {
        const tier1 = officerUnlocksOf({ tier: 1, code: 'OFFICER_TIER_1' });
        assert.equals('basic', tier1.questDifficultyCap);
        assert.isTrue(tier1.sandtableStage === null);
    });

    suite.test('霸府重臣（階位 5）：地獄任務與沙盤 S3', () => {
        const tier5 = officerUnlocksOf({ tier: 5, code: 'OFFICER_TIER_5' });
        assert.equals('hell', tier5.questDifficultyCap);
        assert.equals('S3', tier5.sandtableStage ?? '');
    });

    return suite;
}
