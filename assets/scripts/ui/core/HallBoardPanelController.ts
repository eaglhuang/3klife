// @spec-source → WBS v5 HALL-03（雙牆任務板）、HALL-07（點位）、HALL-06（自告奮勇列）；大廳系統 E-3（PROG-2-0456，暫定）；戰法場景規格書 B-1（Q16 方案 B，PROG-2-0459）
/**
 * HallBoardPanelController — 大廳任務牆與武將點位的畫面流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 依目前牆別（軍事 / 內政）產生任務列，已接取的任務以 GameSession 的指派狀態覆蓋（不讀靜態的 Is_Accepted）
 *   - 接取任務：指派給出戰主將；沒有主將時只回報提示，不呼叫 GameSession
 *   - 天下沙盤（Expedition 牆）與軍事 / 內政雙牆共用同一條接取入口（Q16 方案 B），大廳只是呈現面
 *   - 產生點位列（HALL-07），由呼叫端注入刷新函式
 *   - 輸出扁平的 FlowView，key 與 hall-board-main.json 的節點 id 一一對應
 *
 * Unity 對照：Presenter。Button onClick 只呼叫 accept()/switchBoard()，
 * 畫面層拿 getFlowView() 一次刷新 Text、Active 與 Button.interactable。
 */
import { HallBoardKey, HallPlayerState } from '../../core/systems/HallMissionBoard';
import { buildHallBoardRows, HallTaskRow } from '../../core/systems/HallMissionBoardPresenter';
import { HallTask, LobbyHub } from '../../core/systems/LobbyHubSchema';
import { HallSpotRow } from '../../core/systems/HallCharacterPresenter';

export const HALL_BOARD_MAX_ROWS = 6;
export const HALL_BOARD_SPOT_SLOTS = 4;

/** 目前官階／沙盤階段／情報度尚未由 GameSession 提供，先用新手預設值（暫定）。 */
export const HALL_DEFAULT_PLAYER: HallPlayerState = Object.freeze({ rankTier: 1, worldStage: 1, intel: 0 });

export interface HallBoardFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface HallBoardPanelDeps {
    hub: () => LobbyHub;
    player: () => HallPlayerState;
    /** GameSession.hallAssignments：任務 id → 指派武將 id */
    assignments: () => Readonly<Record<string, string>>;
    /** GameSession.leadGeneralId：接取時的指派武將 */
    leadGeneralId: () => string | null;
    /** GameSession.assignHallTask */
    assign: (taskId: string, generalId: string) => Promise<boolean>;
    /** 點位刷新（GameSession.refreshHallSpots）；回傳目前點位列 */
    refreshSpots: () => HallSpotRow[];
    /** 點位顯示名稱：武將 id → 顯示名（找不到時顯示 id） */
    displayName: (generalId: string) => string;
}

const BOARD_TITLE: Readonly<Record<HallBoardKey, string>> = Object.freeze({
    Military: '大廳・軍事任務牆',
    Domestic: '大廳・內政任務牆',
    Expedition: '天下沙盤・遠征',
});

const NOTICE_TEXT: Readonly<Record<string, string>> = Object.freeze({
    'no-lead': '請先設定出戰主將，才能接取任務',
    'assign-failed': '接取失敗，請確認武將仍在名冊內',
    'no-row': '此格目前沒有任務',
});

export class HallBoardPanelController {
    private _board: HallBoardKey = 'Military';
    private _notice: string | null = null;

    constructor(private readonly _deps: HallBoardPanelDeps) {}

    public get board(): HallBoardKey {
        return this._board;
    }

    public switchBoard(board: HallBoardKey): void {
        this._board = board;
        this._notice = null;
    }

    /** 目前牆的任務列，已接取者以指派狀態覆蓋，置頂規則沿用 buildHallBoardRows。 */
    public rows(): HallTaskRow[] {
        const hub = this._deps.hub();
        const assigned = this._deps.assignments();
        const current = hub.Mission_Boards[this._board];
        if (!current) return [];
        const overlaid: LobbyHub = {
            ...hub,
            Mission_Boards: {
                ...hub.Mission_Boards,
                [this._board]: {
                    ...current,
                    Tasks: current.Tasks.map((task) => (
                        task.Task_ID in assigned ? { ...task, Is_Accepted: true } : task
                    )),
                },
            },
        };
        return buildHallBoardRows(overlaid, this._board, this._deps.player()).slice(0, HALL_BOARD_MAX_ROWS);
    }

    /** 第 index 列對應的任務資料（彈窗與委任用）；沒有該列時回傳 undefined。 */
    public taskAt(index: number): HallTask | undefined {
        const row = this.rows()[index];
        if (!row) return undefined;
        return this._deps.hub().Mission_Boards[this._board]?.Tasks.find((task) => task.Task_ID === row.taskId);
    }

    /** 接取第 index 列任務：指派給出戰主將。 */
    public async accept(index: number): Promise<boolean> {
        const row = this.rows()[index];
        if (!row) {
            this._notice = NOTICE_TEXT['no-row'];
            return false;
        }
        const leadId = this._deps.leadGeneralId();
        if (!leadId) {
            this._notice = NOTICE_TEXT['no-lead'];
            return false;
        }
        const ok = await this._deps.assign(row.taskId, leadId);
        this._notice = ok ? null : NOTICE_TEXT['assign-failed'];
        return ok;
    }

    /** 點位列資料（會觸發一次刷新，60 秒內沿用舊點位）。 */
    public spotRows(): HallSpotRow[] {
        return this._deps.refreshSpots().slice(0, HALL_BOARD_SPOT_SLOTS);
    }

    /** 扁平 FlowView：key 與 hall-board-main.json 的節點 id 對應。 */
    public getFlowView(): HallBoardFlowView {
        const rows = this.rows();
        const spots = this.spotRows();
        const leadId = this._deps.leadGeneralId();
        const texts: Record<string, string> = {
            hallBoardTitle: BOARD_TITLE[this._board],
            btnHallBoardMilitaryLabel: '軍事',
            btnHallBoardDomesticLabel: '內政',
            btnHallBoardExpeditionLabel: '天下沙盤',
            noticeLabel: this._notice ?? '',
        };
        const actives: Record<string, boolean> = {};
        const enabled: Record<string, boolean> = {
            btnHallBoardMilitary: true,
            btnHallBoardDomestic: true,
            btnHallBoardExpedition: true,
        };
        for (let i = 0; i < HALL_BOARD_MAX_ROWS; i++) {
            const row = rows[i];
            actives[`hallRow${i}`] = row !== undefined;
            texts[`hallRow${i}Title`] = row?.title ?? '';
            texts[`hallRow${i}Meta`] = row ? `${row.difficultyText} · ${row.requiredRankText} · ${row.rewardText}` : '';
            texts[`hallRow${i}Status`] = row?.accepted ? '已接取' : '';
            texts[`btnHallRow${i}Label`] = row?.accepted ? '已接取' : '接取';
            enabled[`btnHallRow${i}`] = row ? row.canAccept && leadId !== null : false;
        }
        for (let i = 0; i < HALL_BOARD_SPOT_SLOTS; i++) {
            const spot = spots[i];
            actives[`spot${i}`] = spot !== undefined;
            texts[`spot${i}Name`] = spot ? this._deps.displayName(spot.id) : '';
            texts[`spot${i}Tag`] = spot ? spotTag(spot) : '';
        }
        return { texts, actives, enabled };
    }
}

function spotTag(spot: HallSpotRow): string {
    if (spot.favorite && spot.assigned) return '收藏 · 已派任務';
    if (spot.favorite) return '收藏';
    if (spot.assigned) return '已派任務';
    return '';
}
