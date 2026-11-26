// @spec-source → 首年目標清單規格；PROG-2-10062
/**
 * Year1GoalsController — 首年目標的領獎結算與大廳進度條文字（純邏輯，不依賴 cc）
 *
 * 職責：把「已完成但還沒領」的目標逐項走 reward.claim 入帳，成功後標記已領、跳輕量 Toast；
 *       組出進度條要顯示的文字與「下一步」導向。
 * 不負責：節點與版面（Year1GoalsPanel / UCUF）、事件偵測（GameSession.reportYear1Goal）。
 * 領獎有兩層防重：存檔 claimed 清單 + reward.claim 的 grantKey；失敗不標記，下次結算會重試。
 */
import {
    buildYear1GoalsView,
    getYear1GoalTable,
    pendingYear1Consolation,
    pendingYear1Rewards,
    type Year1GoalDef,
    type Year1GoalsState,
    type Year1GoalTable,
} from '../../core/systems/Year1Goals';
import type { Year1ClaimOutcome, Year1RewardKind } from '../../core/systems/Year1GoalsReward';

export type Year1Translate = (key: string, ...args: string[]) => string;

export interface Year1GoalsSessionPort {
    readonly year1Goals: Year1GoalsState;
    /** 目前遊戲年份 */
    readonly currentYear: number;
    markYear1GoalClaimed(goalId: string): Promise<void>;
    /** 目標獎勵不算「本年家族入帳」，不能墊高榜單分數 */
    excludeFromYearSilverIncome(amount: number): void;
}

export interface Year1GoalsPorts {
    session: Year1GoalsSessionPort;
    claim: (goal: Year1GoalDef, kind: Year1RewardKind) => Promise<Year1ClaimOutcome>;
    t: Year1Translate;
    toast: (message: string) => void;
    table?: Year1GoalTable;
}

/** 進度條要顯示的內容 */
export interface Year1GoalsPanelView {
    visible: boolean;
    progressText: string;
    /** 0～1 */
    ratio: number;
    hintText: string;
    /** 「下一步」按鈕導向的 LobbyActionId；null＝沒有可導向的功能（按鈕隱藏） */
    nextAction: string | null;
    grandSlam: boolean;
}

export class Year1GoalsController {
    private _settling = false;
    private _again = false;
    private readonly _table: Year1GoalTable;

    public constructor(private readonly _ports: Year1GoalsPorts) {
        this._table = _ports.table ?? getYear1GoalTable();
    }

    public getView(): Year1GoalsPanelView {
        const { session, t } = this._ports;
        const view = buildYear1GoalsView(this._table, session.year1Goals, session.currentYear);
        const allDone = view.completedCount >= view.total;
        const hintText = view.next
            ? t('year1.panel.next', t(view.next.actionKey))
            : t(allDone ? 'year1.panel.done' : 'year1.panel.wrapup');
        return {
            visible: view.visible,
            progressText: t('year1.panel.progress', String(view.completedCount), String(view.total)),
            ratio: view.ratio,
            hintText,
            nextAction: view.next?.nextAction ?? null,
            grandSlam: view.grandSlam,
        };
    }

    /** 新手滿貫（首年目標完成數達門檻）；典禮第 3 幕加賀詞用，只在資料指定的年份成立 */
    public isGrandSlam(year: number): boolean {
        return year === this._table.year && buildYear1GoalsView(this._table, this._ports.session.year1Goals, year).grandSlam;
    }

    /**
     * 結算：把待領的目標獎勵與衝刺安慰獎逐項入帳。重入時不並行，而是排一輪補跑，不漏掉期間新完成的目標。
     * 回傳本次新入帳的銀兩合計。
     */
    public async settle(): Promise<number> {
        if (this._settling) {
            this._again = true;
            return 0;
        }
        this._settling = true;
        let total = 0;
        try {
            do {
                this._again = false;
                total += await this._settleOnce();
            } while (this._again);
        } finally {
            this._settling = false;
        }
        return total;
    }

    private async _settleOnce(): Promise<number> {
        const { session } = this._ports;
        let total = 0;
        for (const goal of pendingYear1Rewards(this._table, session.year1Goals)) {
            total += await this._claimOne(goal, 'reward');
        }
        const consolation = pendingYear1Consolation(this._table, session.year1Goals);
        if (consolation) total += await this._claimOne(consolation, 'consolation');
        return total;
    }

    private async _claimOne(goal: Year1GoalDef, kind: Year1RewardKind): Promise<number> {
        const { session, claim, toast } = this._ports;
        const outcome = await claim(goal, kind);
        if (!outcome.ok) return 0;
        await session.markYear1GoalClaimed(goal.id);
        if (outcome.silver > 0) session.excludeFromYearSilverIncome(outcome.silver);
        if (!outcome.replayed) toast(this._toastText(goal, kind, outcome.silver));
        return outcome.silver;
    }

    private _toastText(goal: Year1GoalDef, kind: Year1RewardKind, silver: number): string {
        const { t } = this._ports;
        if (kind === 'consolation') {
            return `${t(goal.consolationToastKey ?? 'year1.goal.top3_sprint.consolation')}${t('year1.toast.reward', String(silver))}`;
        }
        const parts = [`${t(goal.toastKey)}${silver > 0 ? t('year1.toast.reward', String(silver)) : ''}`];
        const title = goal.reward.titleId ? this._table.titles.find((item) => item.id === goal.reward.titleId) : undefined;
        if (title) parts.push(t('year1.toast.title', t(title.nameKey)));
        if (goal.reward.childFavor) parts.push(t('year1.toast.favor', String(goal.reward.childFavor)));
        return parts.join('　');
    }
}

/** 進度條填色寬度：ratio 夾在 0～1，取整數像素；0 代表不顯示填色 */
export function year1BarFillWidth(trackWidth: number, ratio: number): number {
    if (!Number.isFinite(trackWidth) || trackWidth <= 0 || !Number.isFinite(ratio)) return 0;
    return Math.round(trackWidth * Math.min(1, Math.max(0, ratio)));
}
