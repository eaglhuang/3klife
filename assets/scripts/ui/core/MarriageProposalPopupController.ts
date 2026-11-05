// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #4（天下求親市場）；PROG-2-1811
/**
 * MarriageProposalPopupController — 名門求親彈窗的流程（純邏輯，不依賴 cc）
 *
 * 所有 texts / actives / enabled 的 key 都等於 marriage-proposal-main.json 的節點 id，
 * tests/MarriageProposal.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Respond，畫面層拿 GetView() 一次刷新。
 */
import { marriageAcceptLabel, marriageGiftLine, marriageProposalLine, marriageSuitorLine, type MarriageProposal } from '../../core/systems/MarriageProposal';

export interface MarriageProposalPopupView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface MarriageProposalPopupDeps {
    session: {
        readonly marriageProposal: MarriageProposal | null;
        respondMarriageProposal(accept: boolean, grantGold: (amount: number) => void): Promise<{ ok: boolean }>;
    };
    grantGold: (amount: number) => void;
}

export class MarriageProposalPopupController {
    private _notice = '';

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

    getView(): MarriageProposalPopupView {
        const proposal = this._deps.session.marriageProposal;
        return {
            texts: {
                mpTitle: '名門求親',
                closeMpLabel: proposal ? '稍後' : '關閉',
                mpEmptyHint: '目前沒有上門提親的名門。',
                mpLine: proposal ? marriageProposalLine(proposal) : '',
                mpSuitor: proposal ? marriageSuitorLine(proposal) : '',
                mpGift: proposal ? marriageGiftLine(proposal) : '',
                mpNotice: this._notice,
                acceptMpLabel: proposal ? marriageAcceptLabel(proposal) : '應允',
                declineMpLabel: '婉拒',
            },
            actives: { mpPanel: proposal !== null, mpEmptyHint: proposal === null && this._notice === '' },
            enabled: { btnCloseMp: true, btnAcceptMp: proposal !== null, btnDeclineMp: proposal !== null },
        };
    }
}
