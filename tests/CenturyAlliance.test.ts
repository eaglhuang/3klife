/**
 * CenturyAlliance.test.ts — 百年世交與世交加禮（PROG-2-1830）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    allianceGiftBonus, CENTURY_ALLIANCE_QUALIFIED, centuryAllianceTag, emptyFamilySynergyLedger, familyPairKey, isCenturyAlliance,
    lifetimeQualifiedOf, PLAYER_FAMILY_UID, synergyKOf, type FamilySynergyLedger,
} from '../assets/scripts/core/systems/FamilySynergy';
import { marriageGiftLine, marriageProposalLine, normalizeMarriageProposal, rollMarriageProposal } from '../assets/scripts/core/systems/MarriageProposal';

// random 回 0 時固定擲到太原王
const WANG = '太原王';

function ledgerOf(lifetimeQualified: number): FamilySynergyLedger {
    return { pairs: { [familyPairKey(PLAYER_FAMILY_UID, WANG)]: { recentBitmap: 0, recentCount: 0, lifetimeQualified } }, finalizedIds: [] };
}

function roster(): GeneralConfig[] {
    return [{ id: 'heir', name: '趙統', gender: '男', age: 22, fatherId: 'lord', ep: 60, genes: [] } as unknown as GeneralConfig];
}

export function createCenturyAllianceSuite(): TestSuite {
    const suite = new TestSuite('CenturyAlliance');

    suite.test('沒有紀錄的家族累計為 0', () => {
        assert.equals(0, lifetimeQualifiedOf(WANG, undefined));
        assert.equals(0, lifetimeQualifiedOf(WANG, emptyFamilySynergyLedger()));
        assert.equals(3, lifetimeQualifiedOf(WANG, ledgerOf(3)));
    });

    suite.test('加禮每名成材 5%，最多 50%', () => {
        assert.equals(0, allianceGiftBonus(1000, 0));
        assert.equals(50, allianceGiftBonus(1000, 1));
        assert.equals(500, allianceGiftBonus(1000, 10));
        assert.equals(500, allianceGiftBonus(1000, 40));
    });

    suite.test('累計成材不影響 K', () => {
        assert.equals(0, synergyKOf(ledgerOf(40).pairs[familyPairKey(PLAYER_FAMILY_UID, WANG)]));
    });

    suite.test('達門檻才稱百年世交', () => {
        assert.isFalse(isCenturyAlliance(CENTURY_ALLIANCE_QUALIFIED - 1));
        assert.isTrue(isCenturyAlliance(CENTURY_ALLIANCE_QUALIFIED));
        assert.equals(null, centuryAllianceTag({}, { familyUid: WANG }, ledgerOf(CENTURY_ALLIANCE_QUALIFIED - 1)));
        assert.equals(null, centuryAllianceTag({}, {}, ledgerOf(CENTURY_ALLIANCE_QUALIFIED)));
        assert.equals('百年世交：累計成材 8 名', centuryAllianceTag({ familyUid: WANG }, {}, ledgerOf(8)) ?? '');
    });

    suite.test('提親：沒有世交紀錄時內容與舊版相同', () => {
        const proposal = rollMarriageProposal(roster(), 2, 'suitor-1', () => 0, emptyFamilySynergyLedger())!;
        assert.equals(500, proposal.giftGold);
        assert.equals(undefined, proposal.allianceBonusGold);
        assert.equals(undefined, proposal.centuryAlliance);
        assert.equals('聘禮：黃金 500', marriageGiftLine(proposal));
    });

    suite.test('提親：累計成材加厚聘禮但未達稱號', () => {
        const proposal = rollMarriageProposal(roster(), 2, 'suitor-1', () => 0, ledgerOf(2))!;
        assert.equals(550, proposal.giftGold);
        assert.equals('聘禮：黃金 550（世交加禮 +50）', marriageGiftLine(proposal));
        assert.equals(undefined, proposal.centuryAlliance);
    });

    suite.test('提親：百年世交掛稱號，亂數結果不變', () => {
        const random = (): (() => number) => { let i = 0; return () => [0, 0.3, 0.6, 0.1, 0.9, 0.2, 0.4, 0.8, 0.5][i++ % 9]; };
        const plain = rollMarriageProposal(roster(), 3, 'suitor-1', random())!;
        const allied = rollMarriageProposal(roster(), 3, 'suitor-1', random(), ledgerOf(10))!;
        assert.equals(JSON.stringify(plain.suitor), JSON.stringify(allied.suitor));
        assert.equals(1500, allied.giftGold);
        assert.isTrue(marriageProposalLine(allied).startsWith('百年世交太原王氏'));
    });

    suite.test('提親：別家的紀錄不影響這家', () => {
        const other: FamilySynergyLedger = { pairs: { [familyPairKey(PLAYER_FAMILY_UID, '清河崔')]: { recentBitmap: 0, recentCount: 0, lifetimeQualified: 10 } }, finalizedIds: [] };
        assert.equals(500, rollMarriageProposal(roster(), 2, 'suitor-1', () => 0, other)!.giftGold);
    });

    suite.test('存讀檔保留稱號與加禮；舊檔沒有這兩欄', () => {
        const allied = rollMarriageProposal(roster(), 2, 'suitor-1', () => 0, ledgerOf(10))!;
        const back = normalizeMarriageProposal(JSON.parse(JSON.stringify(allied)))!;
        assert.equals(250, back.allianceBonusGold);
        assert.isTrue(back.centuryAlliance === true);
        const legacy = rollMarriageProposal(roster(), 2, 'suitor-1', () => 0)!;
        const legacyBack = normalizeMarriageProposal(JSON.parse(JSON.stringify(legacy)))!;
        assert.equals(undefined, legacyBack.allianceBonusGold);
        assert.equals(undefined, legacyBack.centuryAlliance);
    });

    return suite;
}
