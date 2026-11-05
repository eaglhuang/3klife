/**
 * ProposalStatProbe.test.ts — 提親前細查（PROG-2-1835）
 */
import { TestSuite, assert } from './TestRunner';
import { ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/ItemDef';
import type { MarriageProposal } from '../assets/scripts/core/systems/MarriageProposal';
import type { RumorStatKey } from '../assets/scripts/core/systems/MatchRumor';
import { statProbeLine } from '../assets/scripts/core/systems/PedigreeProbe';
import { MarriageProposalPopupController, type MarriageProposalPopupDeps } from '../assets/scripts/ui/core/MarriageProposalPopupController';

const proposal = {
    id: 'proposal-1',
    targetId: 'a',
    targetName: '趙統',
    family: '太原王',
    giftGold: 500,
    suitor: { name: '王蘭', gender: '女', age: 20, str: 52, int: 77, lea: 60, pol: 61, cha: 70, luk: 50, ep: 60 },
} as unknown as MarriageProposal;

function rig(tokens: { value: number }, pending: MarriageProposal | null = proposal): { popup: MarriageProposalPopupController; probed: Set<string> } {
    const probed = new Set<string>();
    const session: MarriageProposalPopupDeps['session'] = {
        marriageProposal: pending,
        respondMarriageProposal: async () => ({ ok: true }),
        itemCount: (itemId: string) => (itemId === ITEM_ORACLE_TOKEN ? tokens.value : 0),
        isStatProbed: (id: string, stat: RumorStatKey) => probed.has(`${id}/${stat}`),
        probeStat: async (id: string, stat: RumorStatKey) => { tokens.value -= 1; probed.add(`${id}/${stat}`); return true; },
    };
    return { popup: new MarriageProposalPopupController({ session, grantGold: () => undefined }), probed };
}

export function createProposalStatProbeSuite(): TestSuite {
    const suite = new TestSuite('ProposalStatProbe');

    suite.test('結果句：單人也能用', () => {
        assert.equals('武骨細箱：王蘭 50–54', statProbeLine('str', { name: '王蘭', stats: { str: 52 }, probed: true }));
    });

    suite.test('查前不露值，顯示剩餘求籤令，沒券不能按', () => {
        const view = rig({ value: 2 }).popup.getView();
        assert.equals('細查維度：武骨', view.texts.cycleMpStatLabel);
        assert.equals('細查（1 券）', view.texts.probeMpStatLabel);
        assert.equals('武骨細箱：王蘭 未查｜求籤令 ×2', view.texts.mpStatLine);
        assert.isTrue(view.enabled.btnProbeMpStat);
        assert.isFalse(rig({ value: 0 }).popup.getView().enabled.btnProbeMpStat);
    });

    suite.test('查後用提親 id 記錄，換維度要重查', async () => {
        const tokens = { value: 2 };
        const { popup, probed } = rig(tokens);
        assert.isTrue(await popup.probeSuitorStat());
        assert.isTrue(probed.has('proposal-1/str'));
        const view = popup.getView();
        assert.equals('武骨細箱：王蘭 50–54｜求籤令 ×1', view.texts.mpStatLine);
        assert.equals('已細查', view.texts.probeMpStatLabel);
        assert.isFalse(view.enabled.btnProbeMpStat);
        popup.cycleProbeStat();
        const next = popup.getView();
        assert.equals('才思細箱：王蘭 未查｜求籤令 ×1', next.texts.mpStatLine);
        assert.isTrue(next.enabled.btnProbeMpStat);
    });

    suite.test('沒有提親時不能查', async () => {
        const { popup } = rig({ value: 3 }, null);
        assert.isFalse(await popup.probeSuitorStat());
        const view = popup.getView();
        assert.equals('', view.texts.mpStatLine);
        assert.isFalse(view.enabled.btnProbeMpStat);
        assert.isFalse(view.enabled.btnCycleMpStat);
    });

    return suite;
}
