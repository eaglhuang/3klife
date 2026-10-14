// @spec-source → WBS v3 MVP-10 大廳內政畫面；DomesticTasks.ts 產出表（暫定）；PROG-2-0319
/**
 * DomesticPanelController — 大廳內政 5 大任務面板的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 把 DomesticPresenter 的 5 列資料轉成扁平 FlowView，key 與 domestic-main.json 的節點 id 一一對應
 *   - 點選任務 → 呼叫 GameSession.chooseDomesticTask；同季已選過的情況由規則擋下，畫面只顯示提示
 *
 * 規則（同季只能選一項、產出多少）全在 DomesticTasks，這裡不重算。
 *
 * Unity 對照：MVP 的 Presenter。Button onClick 只呼叫 choose()，
 * 畫面層拿 getFlowView() 一次刷新 Text 與 Button.interactable。
 */
import { DomesticSeasonLog, DomesticTaskId, DomesticTaskResult } from '../../core/systems/DomesticTasks';
import { buildDomesticRows, DomesticTaskRow } from '../../core/systems/DomesticPresenter';

/** 與 job-change 的 FlowView 同形：texts / actives / enabled 的 key 都是 domestic-main.json 的節點 id */
export interface DomesticFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface DomesticPanelDeps {
    /** 目前季紀錄（GameSession.domesticLog） */
    log: () => Readonly<DomesticSeasonLog>;
    /** 目前總季數（GameSession 的時鐘） */
    season: () => number;
    /** 正式環境接 GameSession.chooseDomesticTask；發錢包的回呼由呼叫端自己帶入 */
    choose: (taskId: DomesticTaskId) => Promise<DomesticTaskResult>;
}

/** 任務 id → 節點名稱片段（layout 節點 id 用 btn<Name> / <name>Output / <name>Chosen） */
const NODE_NAME: Readonly<Record<DomesticTaskId, string>> = Object.freeze({
    farming: 'Farming',
    commerce: 'Commerce',
    diplomacy: 'Diplomacy',
    arms: 'Arms',
    scouting: 'Scouting',
});

const REJECT_TEXT: Readonly<Record<string, string>> = Object.freeze({
    'already-chosen-this-season': '本季已選過內政任務，下一季再選',
    'unknown-task': '找不到此內政任務',
});

export class DomesticPanelController {
    private _notice: string | null = null;

    constructor(private readonly _deps: DomesticPanelDeps) {}

    /** 5 列資料（直接沿用 DomesticPresenter） */
    public rows(): DomesticTaskRow[] {
        return buildDomesticRows(this._deps.log(), this._deps.season());
    }

    /** 選一項任務；同季已選過時不呼叫 GameSession，直接回報提示 */
    public async choose(taskId: DomesticTaskId): Promise<DomesticTaskResult | null> {
        const row = this.rows().find((item) => item.taskId === taskId);
        if (!row) {
            this._notice = REJECT_TEXT['unknown-task'];
            return null;
        }
        if (!row.canChoose) {
            this._notice = REJECT_TEXT['already-chosen-this-season'];
            return null;
        }
        const result = await this._deps.choose(taskId);
        this._notice = result.ok
            ? `本季已選「${row.label}」：${row.outputText}`
            : (REJECT_TEXT[result.reason ?? ''] ?? '內政任務失敗');
        return result;
    }

    public getFlowView(): DomesticFlowView {
        const rows = this.rows();
        const texts: Record<string, string> = {
            seasonLabel: `第 ${this._deps.season()} 季`,
            noticeLabel: this._notice ?? '',
        };
        const actives: Record<string, boolean> = {
            noticeLabel: this._notice !== null,
        };
        const enabled: Record<string, boolean> = {};
        for (const row of rows) {
            const name = NODE_NAME[row.taskId];
            const key = name.charAt(0).toLowerCase() + name.slice(1);
            texts[`btn${name}Label`] = row.label;
            texts[`${key}Output`] = row.outputText;
            texts[`${key}Chosen`] = row.chosenThisSeason ? '本季已選' : '';
            actives[`${key}Chosen`] = row.chosenThisSeason;
            enabled[`btn${name}`] = row.canChoose;
        }
        enabled.btnClose = true;
        return { texts, actives, enabled };
    }
}
