/**
 * SpiritFamilyReadModel — 英靈卡共鳴欄位、家族 read model、Display_Bucket 分組（TSK-09；PROG-2-1965）
 */
import { assert, TestSuite } from './TestRunner';
import type { SpiritCardEntry } from '../assets/scripts/core/systems/ReadModelValidators';
import {
    buildSpiritFamilyState, groupByDisplayBucket, withResonance,
} from '../assets/scripts/core/systems/SpiritFamilyReadModel';

function card(id: string, over: Partial<SpiritCardEntry> = {}): SpiritCardEntry {
    return {
        Spirit_ID: id,
        General_Template_ID: 'ZHAO_YUN_01',
        Spirit_Family_Key: 'FAMILY_ZHAO',
        LineageScore: 1000,
        Card_Role: 'BACKUP',
        Family_Primary_Flag: false,
        Equipped_General_UID: null,
        Slot_Type: 'DESTINY',
        Display_Bucket: 'CLAN_RELIC',
        DualEquip_Allowed: true,
        ...over,
    };
}

export function createSpiritFamilyReadModelSuite(): TestSuite {
    const suite = new TestSuite('SpiritFamilyReadModel (家族 read model TSK-09 PROG-2-1965)');

    suite.test('依裝配者算出 SELF／FAMILY／ECHO，未裝配為 null', () => {
        const wearers: Record<string, { templateId: string; familyKey: string }> = {
            G1: { templateId: 'ZHAO_YUN_01', familyKey: 'FAMILY_ZHAO' },
            G2: { templateId: 'ZHAO_TONG_01', familyKey: 'FAMILY_ZHAO' },
            G3: { templateId: 'MA_CHAO_01', familyKey: 'FAMILY_MA' },
        };
        const rows = withResonance([
            card('S1', { Equipped_General_UID: 'G1' }), card('S2', { Equipped_General_UID: 'G2' }),
            card('S3', { Equipped_General_UID: 'G3' }), card('S4'), card('S5', { Equipped_General_UID: 'GX' }),
        ], (uid) => wearers[uid] ?? null);
        assert.equals('SELF_RESONANCE,FAMILY_RESONANCE,ECHO_RESONANCE', rows.slice(0, 3).map((r) => r.Resonance_Band).join(','));
        assert.equals('StrongGlow', rows[0].Glow_State);
        assert.equals(null, rows[3].Resonance_Band);
        assert.equals(null, rows[4].Glow_State);
    });

    suite.test('家族 read model：主卡、池、焦點過濾與預設', () => {
        const cards = [card('S1'), card('S2', { Family_Primary_Flag: true, Card_Role: 'MAIN', LineageScore: 185000 }), card('M1', { Spirit_Family_Key: 'FAMILY_MA' })];
        const row = buildSpiritFamilyState('FAMILY_ZHAO', cards, { Family_Contribution_Pool: 1280, Family_Fame: 54, Family_Depth: 3, Featured_Archive_Spirit_UIDs: ['M1', 'S1'] });
        assert.equals('S2', row.Active_Main_Spirit_UID);
        assert.equals(185000, row.Main_Spirit_LineageScore);
        assert.equals('ACTIVE_MAIN_CARD', row.Contribution_Mode);
        assert.equals(1280, row.Family_Contribution_Pool);
        assert.equals('S1', row.Featured_Archive_Spirit_UIDs.join(','));
        assert.equals('S2', buildSpiritFamilyState('FAMILY_ZHAO', cards).Featured_Archive_Spirit_UIDs.join(','));
        const none = buildSpiritFamilyState('FAMILY_MA', cards, { Family_Fame: -5 });
        assert.equals(null, none.Active_Main_Spirit_UID);
        assert.equals('NO_MAIN_CARD', none.Contribution_Mode);
        assert.equals(0, none.Family_Fame);
        assert.equals(0, none.Featured_Archive_Spirit_UIDs.length);
    });

    suite.test('Display_Bucket 分組並依 Spirit_ID 排序', () => {
        const groups = groupByDisplayBucket([card('S3'), card('S1', { Display_Bucket: 'DESTINY_SLOT' }), card('S2')]);
        assert.equals('S1', groups.DESTINY_SLOT.map((c) => c.Spirit_ID).join(','));
        assert.equals('S2,S3', groups.CLAN_RELIC.map((c) => c.Spirit_ID).join(','));
    });

    return suite;
}
