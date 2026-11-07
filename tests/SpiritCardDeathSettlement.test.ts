/**
 * SpiritCardDeathSettlement — 名將死亡結算產生英靈卡（SPI-02；PROG-2-2078）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { deriveInventoryViews } from '../assets/scripts/core/systems/InventoryProjection';
import { settleDeathSpiritCards, spiritCardIdOf, spiritFamilyKeyOf } from '../assets/scripts/core/systems/SpiritCardDeathSettlement';

function general(id: string, over: Record<string, unknown> = {}): GeneralConfig {
    return { id, templateId: id, name: id, characterCategory: 'famed', status: 'active', str: 90, int: 60, lea: 80, pol: 40, cha: 70, ...over } as unknown as GeneralConfig;
}
const dead = (g: GeneralConfig, over: Record<string, unknown> = {}): GeneralConfig => ({ ...g, status: 'dead', ...over } as unknown as GeneralConfig);

export function createSpiritCardDeathSettlementSuite(): TestSuite {
    const suite = new TestSuite('SpiritCardDeathSettlement (死亡產英靈卡 SPI-02 PROG-2-2078)');

    suite.test('名將陣亡產一張英靈卡，能投影成英靈卡視圖', () => {
        const zy = general('zhao-yun');
        const result = settleDeathSpiritCards([], [zy], [dead(zy)]);
        assert.equals('zhao-yun', result.produced.join());
        const views = deriveInventoryViews(result.records);
        assert.equals(0, views.skipped.length);
        const card = views.spiritCards[spiritCardIdOf('zhao-yun')];
        assert.equals('FAMILY_ZHAO', card?.Spirit_Family_Key);
        assert.equals(340, card?.LineageScore);
        assert.equals('CLAN_RELIC', card?.Display_Bucket);
    });

    suite.test('非名將不產卡；之前就陣亡的不重複結算；退役教官仍補發', () => {
        const nobody = general('li-si', { characterCategory: 'general' });
        assert.equals(0, settleDeathSpiritCards([], [nobody], [dead(nobody)]).records.length);
        const zy = general('zhao-yun');
        assert.equals(0, settleDeathSpiritCards([], [dead(zy)], [dead(zy)]).records.length);
        const mentor = general('guan-yu', { isMentorCard: true });
        const result = settleDeathSpiritCards([], [mentor], [dead(mentor)]);
        assert.equals(1, result.records.length);
        assert.equals(true, result.records[0].Attributes['Has_Retired_Before']);
    });

    suite.test('同模板再次陣亡：覆蓋不新增，數值取高、LineageScore 累加', () => {
        const first = settleDeathSpiritCards([], [general('zhao-yun')], [dead(general('zhao-yun'))]).records;
        const again = general('zhao-yun-2', { templateId: 'zhao-yun', str: 70, int: 95 });
        const result = settleDeathSpiritCards(first, [again], [dead(again)]);
        assert.equals(1, result.records.length);
        assert.equals('zhao-yun', result.merged.join());
        const stats = result.records[0].Attributes['Final_Stats'] as Record<string, number>;
        assert.equals(90, stats.str);
        assert.equals(95, stats.int);
        assert.equals(340 + 70 + 95 + 80 + 40 + 70, result.records[0].Attributes['LineageScore']);
    });

    suite.test('家族 key 取模板 id 第一段', () => {
        assert.equals('FAMILY_ZHUGE', spiritFamilyKeyOf('zhuge-liang'));
        assert.equals('FAMILY_CAO', spiritFamilyKeyOf('cao_cao'));
    });

    suite.test('GameSession 接線：死亡結算同步產英靈卡', () => {
        const session = readFileSync(join(__dirname, '../assets/scripts/core/managers/GameSession.ts'), 'utf8');
        assert.isTrue(session.includes('settleDeathSpiritCards(this._inventoryRecords, before, after)'));
    });

    return suite;
}
