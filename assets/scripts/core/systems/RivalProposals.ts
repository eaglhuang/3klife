// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-5 外交決策與邦交變動、E-6 交易比率、§G-1 事件文案；PROG-2-1770
/**
 * RivalProposals — 他國主動提出、等玩家回覆的求盟與商隊提議（純邏輯，不依賴 cc）。
 *
 * 暫定（可逆）：
 * - 規格沒寫商隊交易量；暫定 300 黃金換 600 糧草，比率照 E-6 的 2:1。
 * - 規格沒寫提議頻率；回覆後同一國 4 季內不再提議，避免條件成立時每季重複。
 * - 提議等到玩家回覆為止；開戰、結盟（求盟）或滅亡時自動取消。
 * - 拒絕求盟規格沒有邦交變動；拒絕商隊照 E-5 -5。
 *
 * Unity 對照：像存在世界狀態裡的待處理對話事件，UI 只負責顯示與回傳選擇。
 */
import { applyRelationEvent } from './RivalAiDiplomacy';
import { nationDef, type NationState, type RivalProposal, type RivalWorld } from './RivalNations';
import { RULER_LINES } from './RivalRulerLines';

export const PROPOSAL_TUNING = Object.freeze({
    tradeGiveGold: 300,
    tradeAskFood: 600,
    cooldownSeasons: 4,
});

export interface PendingProposal {
    readonly nationId: string;
    readonly proposal: RivalProposal;
}

export interface ProposalResponse {
    readonly ok: boolean;
    readonly world: RivalWorld;
    readonly foodSpent: number;
    readonly goldGained: number;
    readonly message: string;
}

/** 第一個等待回覆的提議（依勢力順序）；外交畫面一次處理一件 */
export function pendingRivalProposal(world: RivalWorld): PendingProposal | null {
    for (const nation of world.nations) {
        if (nation.proposal) return { nationId: nation.id, proposal: nation.proposal };
    }
    return null;
}

/** G-1 AI 結盟提議與貿易提議；沒有外交台詞的君主省略台詞段 */
export function formatRivalProposal(nationId: string, proposal: RivalProposal): string {
    const name = nationDef(nationId)?.name ?? nationId;
    if (proposal.kind === 'TRADE') {
        return `${name} 商隊抵達：願以 ${proposal.giveGold} 黃金 換取 ${proposal.askFood} 糧草。同意 / 拒絕？`;
    }
    const line = RULER_LINES[nationId]?.alliance;
    return line ? `${name} 派遣使者求盟：『${line}』接受 / 拒絕？` : `${name} 派遣使者求盟。接受 / 拒絕？`;
}

function settle(nation: NationState, season: number): NationState {
    const { proposal: _answered, ...rest } = nation;
    return { ...rest, proposalBlockedUntil: season + PROPOSAL_TUNING.cooldownSeasons };
}

export function respondToRivalProposal(world: RivalWorld, nationId: string, accept: boolean, playerFood: number, season: number): ProposalResponse {
    const nation = world.nations.find((n) => n.id === nationId);
    const proposal = nation?.proposal;
    const name = nationDef(nationId)?.name ?? nationId;
    const fail = (message: string): ProposalResponse => ({ ok: false, world, foodSpent: 0, goldGained: 0, message });
    if (!nation || !proposal) return fail(`${name} 沒有等待回覆的提議`);
    const done = (next: NationState, message: string, foodSpent = 0, goldGained = 0): ProposalResponse => ({
        ok: true,
        world: { nations: world.nations.map((n) => (n.id === nationId ? next : n)) },
        foodSpent,
        goldGained,
        message,
    });
    const answered = settle(nation, season);

    if (proposal.kind === 'ALLIANCE') {
        return accept
            ? done({ ...answered, allied: true, atWar: false, relation: applyRelationEvent(nation.relation, 'ALLIANCE') }, `已與 ${name} 結盟`)
            : done(answered, `已婉拒 ${name} 的求盟`);
    }
    if (!accept) {
        return done({ ...answered, relation: applyRelationEvent(nation.relation, 'REFUSE_TRADE') }, `已拒絕 ${name} 的商隊`);
    }
    if (playerFood < proposal.askFood) return fail(`糧草不足（需要 ${proposal.askFood}）`);
    const resources = nation.resources && {
        ...nation.resources,
        gold: Math.max(0, nation.resources.gold - proposal.giveGold),
        food: nation.resources.food + proposal.askFood,
    };
    return done(
        { ...answered, relation: applyRelationEvent(nation.relation, 'TRADE'), ...(resources ? { resources } : {}) },
        `與 ${name} 交易：付出 ${proposal.askFood} 糧草，收到 ${proposal.giveGold} 黃金`,
        proposal.askFood,
        proposal.giveGold,
    );
}
