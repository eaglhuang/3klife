/**
 * OfficerPermissionText.test.ts — 官職頁已解鎖權限文字（OFC-08 官職頁）headless 測試
 *
 * 鎖住：郡守以下沙盤與兩項文書顯示未解鎖；霸府重臣全部解鎖；行順序固定；
 * 語系表查到時採用語系表並代入值；查不到時退回 zh-TW 預設。
 */
import { assert, TestSuite } from './TestRunner';
import { officerUnlocksOf } from '../assets/scripts/core/systems/OfficerSnapshot';
import { officerPageTitleText, officerPermissionLinesOf } from '../assets/scripts/ui/core/OfficerPermissionText';

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

    suite.test('語系表有值時採用語系表並代入數值', () => {
        const lookup = (key: string, ...args: string[]) => (args.length > 0 ? `${key}|${args.join(',')}` : key);
        const lines = officerPermissionLinesOf(officerUnlocksOf({ tier: 3, code: 'OFFICER_TIER_3' }), lookup);
        assert.equals('ui.officer.perm.quest_cap|精英', lines[0]); // 等級名稱查不到時退回 zh-TW
        assert.equals('ui.officer.perm.sandtable|S1', lines[3]);
        assert.equals('ui.officer.perm.alliance_docs|未解鎖', lines[4]); // 狀態字樣查不到時退回 zh-TW
    });

    suite.test('官職詳情標題：語系表查不到時退回 zh-TW，查到時採用語系表', () => {
        assert.equals('官職詳情：郡守', officerPageTitleText((key) => key, '郡守'));
        assert.equals('Office: Magistrate', officerPageTitleText((key, ...args) => (key === 'ui.officer.page_title' ? `Office: ${args[0]}` : key), 'Magistrate'));
    });

    return suite;
}
