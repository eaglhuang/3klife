/**
 * OfficerPermissionText.test.ts — 官職頁已解鎖權限文字（OFC-08 官職頁）headless 測試
 *
 * 鎖住：郡守以下沙盤與兩項文書顯示未解鎖；霸府重臣全部解鎖；行順序固定。
 */
import { assert, TestSuite } from './TestRunner';
import { officerUnlocksOf } from '../assets/scripts/core/systems/OfficerSnapshot';
import { officerPermissionLinesOf } from '../assets/scripts/ui/core/OfficerPermissionText';

export function createOfficerPermissionTextSuite(): TestSuite {
    const suite = new TestSuite('OfficerPermissionText (官職頁權限文字 OFC-08)');

    suite.test('鄉里義士只顯示基礎權限，沙盤與文書未解鎖', () => {
        const lines = officerPermissionLinesOf(officerUnlocksOf({ tier: 1, code: 'OFFICER_TIER_1' }));
        assert.equals('任務難度上限：初級', lines[0]);
        assert.equals('世界沙盤：未解鎖', lines[3]);
        assert.equals('聯盟文書：未解鎖', lines[4]);
        assert.equals('反霸權會盟：未解鎖', lines[5]);
    });

    suite.test('霸府重臣全部解鎖，沙盤顯示 S3', () => {
        const lines = officerPermissionLinesOf(officerUnlocksOf({ tier: 5, code: 'OFFICER_TIER_5' }));
        assert.equals('任務難度上限：地獄', lines[0]);
        assert.equals('世界沙盤：S3', lines[3]);
        assert.equals('聯盟文書：已解鎖', lines[4]);
        assert.equals('反霸權會盟：已解鎖', lines[5]);
    });

    return suite;
}
