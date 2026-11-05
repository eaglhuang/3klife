// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #4（天下求親市場）；PROG-2-1811
/**
 * MarriageProposalPopupController — 名門求親彈窗的流程（純邏輯，不依賴 cc）
 *
 * 所有 texts / actives / enabled 的 key 都等於 marriage-proposal-main.json 的節點 id，
 * tests/MarriageProposal.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Respond，畫面層拿 GetView() 一次刷新。
 */
import { factorDetailVisible, kinshipScanVisible, type MilestoneStage } from '../../core/systems/FamilyMilestone';
import { ITEM_ORACLE_TOKEN } from '../../core/systems/ItemDef';
import { RUMOR_STAT_KEYS, rumorRouteName, nextRumorStat, type RumorStatKey } from '../../core/systems/MatchRumor';
import { marriageAcceptLabel, marriageGiftLine, marriageProposalLine, marriageSuitorLine, type MarriageProposal } from '../../core/systems/MarriageProposal';
import { STAT_PROBE_COST, statProbeLine } from '../../core/systems/PedigreeProbe';

export interface MarriageProposalPopupView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface MarriageProposalPopupDeps {
    session: {
        readonly marriageProposal: MarriageProposal | null;
        /** 家族階段（總綱 M_stage）；沒有提供時視為全開 */
        readonly milestoneStage?: MilestoneStage;
        readonly displayStage?: MilestoneStage;
        respondMarriageProposal(accept: boolean, grantGold: (amount: number) => void): Promise<{ ok: boolean }>;
        itemCount(itemId: string): number;
        isStatProbed(generalId: string, stat: RumorStatKey): boolean;
        probeStat(generalId: string, stat: RumorStatKey): Promise<boolean>;
    };
    grantGold: (amount: number) => void;
}

export class MarriageProposalPopupController {
    private _notice = '';
    private _probeStat: RumorStatKey = RUMOR_STAT_KEYS[0];

    constructor(private readonly _deps: MarriageProposalPopupDeps) {}

    hasPending(): boolean {
        return this._deps.session.marriageProposal !== null;
    }

    open(): void {
        this._notice = '';
    }

    async respond(accept: boolean): Promise<boolean> {
        const proposal = this._deps.session.marriageProposal;
        if (!proposal) return false;
        const result = await this._deps.session.respondMarriageProposal(accept, this._deps.grantGold);
        if (result.ok) {
            this._notice = accept
                ? `${proposal.suitor.name} 入我門下，收下聘禮黃金 ${proposal.giftGold}。`
                : `已婉拒${proposal.family}氏的提親。`;
        }
        return result.ok;
    }

    cycleProbeStat(): void {
        this._probeStat = nextRumorStat(this._probeStat);
    }

    /** 對象的武將 id 就是提親 id，應允後在結緣畫面不必重查（PROG-2-1835） */
    async probeSuitorStat(): Promise<boolean> {
        const proposal = this._deps.session.marriageProposal;
        if (!proposal || !factorDetailVisible(this._unlockStage())) return false;
        return this._deps.session.probeStat(proposal.id, this._probeStat);
    }

    private _unlockStage(): MilestoneStage {
        return this._deps.session.milestoneStage ?? 4;
    }

    getView(): MarriageProposalPopupView {
        const { session } = this._deps;
        const probeVisible = factorDetailVisible(this._unlockStage());
        const showAlliance = kinshipScanVisible(this._deps.session.displayStage ?? this._unlockStage());
        const proposal = session.marriageProposal;
        const stat = this._probeStat;
        const tokens = session.itemCount(ITEM_ORACLE_TOKEN);
        const probed = proposal !== null && session.isStatProbed(proposal.id, stat);
        return {
            texts: {
                mpTitle: '名門求親',
                closeMpLabel: proposal ? '稍後' : '關閉',
                mpEmptyHint: '目前沒有上門提親的名門。',
                mpLine: proposal ? marriageProposalLine(proposal, showAlliance) : '',
                mpSuitor: proposal ? marriageSuitorLine(proposal) : '',
                mpGift: proposal ? marriageGiftLine(proposal, showAlliance) : '',
                mpNotice: this._notice,
                acceptMpLabel: proposal ? marriageAcceptLabel(proposal) : '應允',
                declineMpLabel: '婉拒',
                cycleMpStatLabel: `細查維度：${rumorRouteName(stat)}`,
                probeMpStatLabel: probed ? '已細查' : `細查（${STAT_PROBE_COST} 券）`,
                mpStatLine: proposal ? `${statProbeLine(stat, { name: proposal.suitor.name, stats: proposal.suitor, probed })}｜求籤令 ×${tokens}` : '',
            },
            actives: {
                mpPanel: proposal !== null,
                mpEmptyHint: proposal === null && this._notice === '',
                btnCycleMpStat: probeVisible,
                btnProbeMpStat: probeVisible,
                mpStatLine: probeVisible,
            },
            enabled: {
                btnCloseMp: true,
                btnAcceptMp: proposal !== null,
                btnDeclineMp: proposal !== null,
                btnCycleMpStat: proposal !== null,
                btnProbeMpStat: probeVisible && proposal !== null && !probed && tokens >= STAT_PROBE_COST,
            },
        };
    }
}
