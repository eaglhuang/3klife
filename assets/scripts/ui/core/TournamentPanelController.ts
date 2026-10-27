// @spec-source → 名將挑戰賽系統.md (doc_spec_0007)；PROG-2-1191（挑戰賽彈窗）
/**
 * TournamentPanelController — 名將挑戰賽彈窗：賽季卡、報名、參戰（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 顯示賽季、相位、剩餘日、積分與段位、今日剩餘次數（含免費／付費）、出戰陣容
 *   - 報名／參戰後顯示結果或拒絕原因
 *   - 輸出扁平 FlowView，key 與 tournament-main 版面節點 id 一一對應
 *
 * 暫定：段位與相位中文名、拒絕原因文案待企劃定版；額外參戰幣別為金錢。
 * Unity 對照：Presenter。
 */
import type { RankTier, TournamentPhase } from '../../core/systems/TournamentSeason';
import {
    TOURNAMENT_LOCAL_CONFIG, type TournamentEntryReason, type TournamentRegisterReason, type TournamentSeriesResult,
    type TournamentStatus,
} from '../../core/systems/TournamentLocal';

export const TOURNAMENT_PHASE_LABEL: Record<TournamentPhase, string> = {
    PREPARATION: '培育期',
    COMPETITION: '競賽期',
    ENDED: '已結束',
};

export const TOURNAMENT_TIER_LABEL: Record<RankTier, string> = {
    BRONZE: '青銅',
    SILVER: '白銀',
    GOLD: '黃金',
    PLATINUM: '白金',
    DIAMOND: '鑽石',
    LEGEND: '傳說',
};

export const TOURNAMENT_REASON_LABEL: Record<TournamentRegisterReason | TournamentEntryReason, string> = {
    'ended': '本季已結束，請等下一季。',
    'empty-team': '名冊沒有可出戰的武將。',
    'prep-daily-limit': '培育期每天只能重新報名 1 次。',
    'competition-replace-limit': '競賽期整季只能替換 1 次陣容。',
    'not-competition': '競賽期才能參戰。',
    'no-team': '名冊沒有可出戰的武將。',
    'daily-limit': '今日參戰次數已用完。',
    'payment-declined': '金錢不足，無法額外參戰。',
};

export interface TournamentPanelDeps {
    now: () => number;
    status: (nowMs: number) => TournamentStatus;
    register: (nowMs: number) => { ok: boolean; reason?: TournamentRegisterReason };
    play: (nowMs: number) => { ok: boolean; reason?: TournamentEntryReason; result?: TournamentSeriesResult };
    generalName: (generalId: string) => string | undefined;
}

export interface TournamentPanelFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class TournamentPanelController {
    private _message = '';

    constructor(private readonly _deps: TournamentPanelDeps) {}

    /** 打開時清掉上次訊息 */
    public reset(): void {
        this._message = '';
    }

    public register(): boolean {
        const result = this._deps.register(this._deps.now());
        this._message = result.ok ? '已報名，陣容鎖定為目前戰力前三。' : TOURNAMENT_REASON_LABEL[result.reason ?? 'empty-team'];
        return result.ok;
    }

    public play(): boolean {
        const played = this._deps.play(this._deps.now());
        this._message = played.ok && played.result ? seriesText(played.result) : TOURNAMENT_REASON_LABEL[played.reason ?? 'no-team'];
        return played.ok;
    }

    public get message(): string {
        return this._message;
    }

    public getFlowView(): TournamentPanelFlowView {
        const cfg = TOURNAMENT_LOCAL_CONFIG;
        const status = this._deps.status(this._deps.now());
        const competing = status.phase === 'COMPETITION';
        const used = cfg.maxDailyEntries - status.entriesLeftToday;
        const freeLeft = Math.max(0, cfg.dailyFreeEntries - used);
        const entries = !competing
            ? '競賽期才能參戰'
            : status.entriesLeftToday === 0
                ? '今日參戰次數已用完'
                : `今日剩 ${status.entriesLeftToday} 次（${freeLeft > 0 ? `免費 ${freeLeft} 次` : `每次 ${cfg.extraEntryCost} 金`}）`;
        const team = status.team
            ? `出戰：${status.team.generals.map((id) => this._deps.generalName(id) ?? id).join('、')}（戰力 ${status.team.totalPower}）`
            : '尚未報名（競賽期首次參戰自動報名）';
        return {
            texts: {
                trnTitle: '名將挑戰賽',
                trnSeasonLabel: `第 ${status.seasonIndex} 季｜${TOURNAMENT_PHASE_LABEL[status.phase]}｜剩 ${status.daysLeft} 日`,
                trnRankLabel: `積分 ${status.points}｜${TOURNAMENT_TIER_LABEL[status.tier]}`,
                trnEntriesLabel: entries,
                trnTeamLabel: team,
                trnResultLabel: this._message,
                btnRegisterLabel: status.team ? '重新報名' : '報名',
                btnPlayLabel: competing && status.entriesLeftToday > 0 && freeLeft === 0 ? `參戰（${cfg.extraEntryCost} 金）` : '參戰',
                btnCloseLabel: '關閉',
            },
            actives: { trnResultLabel: this._message !== '' },
            enabled: {
                btnRegister: status.phase !== 'ENDED',
                btnPlay: competing && status.entriesLeftToday > 0,
                btnClose: true,
            },
        };
    }
}

/** 系列賽結果一句話：勝負、比分、積分變化 */
export function seriesText(result: TournamentSeriesResult): string {
    const wins = result.games.filter((g) => g).length;
    const losses = result.games.length - wins;
    const delta = result.pointsDelta >= 0 ? `+${result.pointsDelta}` : `${result.pointsDelta}`;
    return `${result.win ? '勝' : '敗'} ${wins}:${losses}｜積分 ${delta} → ${result.pointsAfter}（${TOURNAMENT_TIER_LABEL[result.tierAfter]}）${result.paidExtra ? `｜花費 ${TOURNAMENT_LOCAL_CONFIG.extraEntryCost} 金` : ''}`;
}
