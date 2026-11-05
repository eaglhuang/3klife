/**
 * ProposalStageGate.test.ts — 提親彈窗依家族階段顯示（PROG-2-1842）
 */
import { TestSuite, assert } from './TestRunner';
import type { MilestoneStage } from '../assets/scripts/core/systems/FamilyMilestone';
import { ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/ItemDef';
import { marriageGiftLine, marriageProposalLine, type MarriageProposal } from '../assets/scripts/core/systems/MarriageProposal';
import { MarriageProposalPopupController, type MarriageProposalPopupDeps } from '../assets/scripts/ui/core/MarriageProposalPopupController';

const proposal = {
    id: 'proposal-1',
    targetId: 'a',
    targetName: '趙統',
    family: '太原王',
    giftGold: 750,
    allianceBonusGold: 250,
    centuryAlliance: true,
    suitor: { name: '王蘭', gender: '女', age: 20, str: 52, int: 77, lea: 60, pol: 61, cha: 70, luk: 50, ep: 60 },
} as unknown as MarriageProposal;

function rig(stage?: MilestoneStage): { popup: MarriageProposalPopupController; tokens: { value: number } } {
    const tokens = { value: 3 };
    const session: MarriageProposalPopupDeps['session'] = {
        marriageProposal: proposal,
        ...(stage === undefined ? {} : { milestoneStage: stage }),
        respondMarriageProposal: async () => ({ ok: true }),
        itemCount: (itemId: string) => (itemId === ITEM_ORACLE_TOKEN ? tokens.value : 0),
        isStatProbed: () => false,
        probeStat: async () => { tokens.value -= 1; return true; },
    };
    return { popup: new MarriageProposalPopupController({ session, grantGold: () => undefined }), tokens };
}

export function createProposalStageGateSuite(): TestSuite {
    const suite = new TestSuite('ProposalStageGate');

    suite.test('G1 收起細查的兩顆鈕與細查句', () => {
        const { actives, enabled } = rig(1).popup.getView();
        assert.isFalse(actives.btnCycleMpStat);
        assert.isFalse(actives.btnProbeMpStat);
        assert.isFalse(actives.mpStatLine);
        assert.isFalse(enabled.btnProbeMpStat);
    });

    suite.test('G2 起細查解鎖', () => {
        const { actives, enabled } = rig(2).popup.getView();
        assert.isTrue(actives.btnCycleMpStat);
        assert.isTrue(actives.btnProbeMpStat);
        assert.isTrue(actives.mpStatLine);
        assert.isTrue(enabled.btnProbeMpStat);
    });

    suite.test('G1 繞過按鈕也查不了、不扣券', async () => {
        const { popup, tokens } = rig(1);
        assert.isFalse(await popup.probeSuitorStat());
        assert.equals(3, tokens.value);
    });

    suite.test('G2 細查照常扣券', async () => {
        const { popup, tokens } = rig(2);
        assert.isTrue(await popup.probeSuitorStat());
        assert.equals(2, tokens.value);
    });

    suite.test('G1、G2 不出現世交字樣，聘禮總額不變', () => {
        for (const stage of [1, 2] as MilestoneStage[]) {
            const { texts } = rig(stage).popup.getView();
            assert.equals('太原王氏遣媒人攜重禮上門，願以王蘭與趙統結親。', texts.mpLine);
            assert.equals('聘禮：黃金 750', texts.mpGift);
        }
    });

    suite.test('G3 起顯示世交字樣', () => {
        for (const stage of [3, 4] as MilestoneStage[]) {
            const { texts } = rig(stage).popup.getView();
            assert.equals(marriageProposalLine(proposal), texts.mpLine);
            assert.isTrue(texts.mpLine.indexOf('百年世交') === 0);
            assert.equals('聘禮：黃金 750（世交加禮 +250）', texts.mpGift);
        }
    });

    suite.test('沒提供階段時視為全開', () => {
        const { actives, texts } = rig().popup.getView();
        assert.isTrue(actives.btnProbeMpStat);
        assert.equals(marriageGiftLine(proposal), texts.mpGift);
    });

    return suite;
}
