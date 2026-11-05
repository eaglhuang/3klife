/**
 * ClanPerkDisplay.test.ts — G4 顯示家風效果與高門聘禮加成（PROG-2-1847）
 */
import { TestSuite, assert } from './TestRunner';
import { clanTitleText, type ClanTradition } from '../assets/scripts/core/systems/ClanTradition';
import { clanPerkVisible, type MilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import { marriageGiftLine, type MarriageProposal } from '../assets/scripts/core/systems/MarriageProposal';
import { MarriageProposalPopupController, type MarriageProposalPopupDeps } from '../assets/scripts/ui/core/MarriageProposalPopupController';

const tradition = { factorId: 'f', displayName: '膽量', kind: 'str' } as unknown as ClanTradition;
const proposal = (giftGold: number, allianceBonusGold?: number): MarriageProposal => ({
    id: 'p', targetId: 'a', targetName: '趙統', family: '太原王', giftGold, allianceBonusGold,
    suitor: { name: '王蘭', gender: '女', age: 20, str: 52, int: 77, lea: 60, pol: 61, cha: 70, luk: 50, ep: 60 },
} as unknown as MarriageProposal);

function giftAt(stage: MilestoneStage, gift: MarriageProposal): string {
    const session: MarriageProposalPopupDeps['session'] = {
        marriageProposal: gift,
        milestoneStage: stage,
        respondMarriageProposal: async () => ({ ok: true }),
        itemCount: () => 0,
        isStatProbed: () => false,
        probeStat: async () => true,
    };
    return new MarriageProposalPopupController({ session, grantGold: () => undefined }).getView().texts.mpGift;
}

export function createClanPerkDisplaySuite(): TestSuite {
    const suite = new TestSuite('ClanPerkDisplay');

    suite.test('只有 G4 起顯示', () => {
        assert.isFalse(clanPerkVisible(3));
        assert.isTrue(clanPerkVisible(4));
    });

    suite.test('標題：G4 帶出家風效果；沒有家風時不加字', () => {
        assert.contains(clanTitleText('郡望世家', tradition, '太原堂', true), '｜家風：膽量（');
        assert.contains(clanTitleText('郡望世家', tradition, '太原堂', true), '修業 +10%）');
        assert.equals('郡望世家・太原堂｜家風：膽量', clanTitleText('郡望世家', tradition, '太原堂'));
        assert.equals('布衣寒門', clanTitleText('布衣寒門', null, null, true));
    });

    suite.test('聘禮：高門多出的部分才算加成，世交加禮分開算', () => {
        assert.equals('聘禮：黃金 1000（高門加成 +500）', marriageGiftLine(proposal(1000), false, true));
        assert.equals('聘禮：黃金 1250（世交加禮 +250）（高門加成 +500）', marriageGiftLine(proposal(1250, 250), true, true));
        assert.equals('聘禮：黃金 750（世交加禮 +250）', marriageGiftLine(proposal(750, 250), true, true));
        assert.equals('聘禮：黃金 1000', marriageGiftLine(proposal(1000), false, false));
    });

    suite.test('提親彈窗：G3 不顯示加成，G4 顯示', () => {
        assert.isTrue(giftAt(3, proposal(1000)).indexOf('高門加成') < 0);
        assert.contains(giftAt(4, proposal(1000)), '高門加成 +500');
    });

    return suite;
}
