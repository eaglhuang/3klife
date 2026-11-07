/**
 * SpiritFamilyOverviewSummary — 大廳世家總覽的家族分組摘要（SPI-12；PROG-2-2077）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { SpiritCardEntry } from '../assets/scripts/core/systems/ReadModelValidators';
import {
    buildSpiritFamilyOverviewRows, spiritFamilyOverviewSummaryTexts, SPIRIT_FAMILY_SUMMARY_MAX_ROWS, SPIRIT_FAMILY_SUMMARY_TEXTS,
} from '../assets/scripts/ui/core/SpiritFamilyOverviewSummary';

const NAMES: Record<string, string> = { 'zhang-fei': '張飛', 'zhang-bao': '張苞', 'guan-yu': '關羽', 'zhuge-liang': '諸葛亮' };
const nameOf = (id: string): string | undefined => NAMES[id];

function card(id: string, template: string, family: string, over: Partial<SpiritCardEntry> = {}): SpiritCardEntry {
    return {
        Spirit_ID: id, General_Template_ID: template, Spirit_Family_Key: family, LineageScore: 50,
        Card_Role: 'BACKUP', Family_Primary_Flag: false, Equipped_General_UID: null, Slot_Type: 'DESTINY',
        Display_Bucket: 'CLAN_RELIC', DualEquip_Allowed: false, ...over,
    };
}

export function createSpiritFamilyOverviewSummarySuite(): TestSuite {
    const suite = new TestSuite('SpiritFamilyOverviewSummary (世家總覽分組 SPI-12 PROG-2-2077)');

    suite.test('依家族分組：主卡、命槽與陳列張數、姓氏家名', () => {
        const rows = buildSpiritFamilyOverviewRows([
            card('S1', 'zhang-fei', 'FAM_ZHANG', { Family_Primary_Flag: true, Card_Role: 'MAIN', Display_Bucket: 'DESTINY_SLOT', Equipped_General_UID: 'G1' }),
            card('S2', 'zhang-bao', 'FAM_ZHANG'),
            card('S3', 'guan-yu', 'FAM_GUAN'),
        ], nameOf);
        assert.equals(2, rows.length);
        const zhang = rows.find((r) => r.familyKey === 'FAM_ZHANG');
        assert.equals('張氏', zhang?.familyName);
        assert.equals('張飛', zhang?.mainName);
        assert.equals(1, zhang?.destinyCount);
        assert.equals(1, zhang?.relicCount);
        const guan = rows.find((r) => r.familyKey === 'FAM_GUAN');
        assert.equals(null, guan?.mainName);
        assert.equals(['FAM_GUAN', 'FAM_ZHANG'].join(), rows.map((r) => r.familyKey).join());
    });

    suite.test('複姓與查不到武將時退回 key', () => {
        const rows = buildSpiritFamilyOverviewRows([card('S1', 'zhuge-liang', 'FAM_ZG'), card('S2', 'nobody', 'FAM_X')], nameOf);
        assert.equals('諸葛氏', rows.find((r) => r.familyKey === 'FAM_ZG')?.familyName);
        assert.equals('FAM_X', rows.find((r) => r.familyKey === 'FAM_X')?.familyName);
    });

    suite.test('摘要文字：張數、每家一行、未設主卡、空狀態', () => {
        const rows = buildSpiritFamilyOverviewRows([
            card('S1', 'zhang-fei', 'FAM_ZHANG', { Family_Primary_Flag: true, Display_Bucket: 'DESTINY_SLOT' }),
            card('S3', 'guan-yu', 'FAM_GUAN'),
        ], nameOf);
        const texts = spiritFamilyOverviewSummaryTexts(rows);
        assert.equals('收藏英靈卡 2 張・2 個世家', texts.ProgressLabel);
        assert.equals(SPIRIT_FAMILY_SUMMARY_TEXTS.tipTitle, texts.TipTitle);
        assert.equals('關氏｜主卡：未設｜命槽 0・陳列 1\n張氏｜主卡：張飛｜命槽 1・陳列 0', texts.TipBody);
        assert.equals(SPIRIT_FAMILY_SUMMARY_TEXTS.empty, spiritFamilyOverviewSummaryTexts([]).TipBody);
    });

    suite.test('家族太多時只列前幾家並註明總數', () => {
        const cards = Array.from({ length: SPIRIT_FAMILY_SUMMARY_MAX_ROWS + 2 }, (_, i) => card(`S${i}`, 'nobody', `FAM_${i}`));
        const body = spiritFamilyOverviewSummaryTexts(buildSpiritFamilyOverviewRows(cards, nameOf)).TipBody.split('\n');
        assert.equals(SPIRIT_FAMILY_SUMMARY_MAX_ROWS + 1, body.length);
        assert.equals(`…等 ${SPIRIT_FAMILY_SUMMARY_MAX_ROWS + 2} 家`, body[body.length - 1]);
    });

    suite.test('大廳接線：大廳入口的世家總覽套用收藏摘要', () => {
        const lobby = readFileSync(join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('...this._spiritFamilySummaryTexts()'));
        assert.isTrue(lobby.includes('services().session.inventoryViews.spiritCards'));
    });

    return suite;
}
