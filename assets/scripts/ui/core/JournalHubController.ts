// @spec-source → WBS v7 JRN-06（晨報彈窗與派遣板的大廳入口）；PROG-2-0478
/**
 * JournalHubController — 大廳晨報彈窗與派遣板的畫面流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 把晨報行與派遣列裁到規格上限（晨報最多 3 則，派遣板最多 4 列），空時顯示空狀態
 *   - 輸出扁平 FlowView，key 與晨報／派遣板版面節點 id 一一對應
 *   - 資料來源（晨報 JRN-02、派遣 JRN-03）由呼叫端注入，本控制器不產生資料
 *
 * 暫定：空狀態字串規格未寫，先用暫定字串，待企劃定版後替換。
 * Unity 對照：Presenter。晨報與派遣板是同一個大廳入口的兩個區塊，各自吃注入的資料。
 */

export const MORNING_MAX_LINES = 3;
export const DISPATCH_MAX_ROWS = 4;

export interface DispatchBoardRow {
    id: string;
    title: string;
    scoreText: string;
}

export interface JournalHubFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface JournalHubDeps {
    /** 今日晨報文字行（JRN-02 產出，未實作前回傳空陣列）。 */
    morningLines: () => readonly string[];
    /** 派遣板列（JRN-03 產出，未實作前回傳空陣列）。 */
    dispatchRows: () => readonly DispatchBoardRow[];
}

export class JournalHubController {
    constructor(private readonly _deps: JournalHubDeps) {}

    /** 晨報行（最多 MORNING_MAX_LINES）。 */
    public morningLines(): string[] {
        return this._deps.morningLines().slice(0, MORNING_MAX_LINES);
    }

    /** 派遣板列（最多 DISPATCH_MAX_ROWS）。 */
    public dispatchRows(): DispatchBoardRow[] {
        return this._deps.dispatchRows().slice(0, DISPATCH_MAX_ROWS);
    }

    /** 扁平 FlowView：key 與晨報／派遣板版面節點 id 對應。 */
    public getFlowView(): JournalHubFlowView {
        const morning = this.morningLines();
        const dispatch = this.dispatchRows();
        const texts: Record<string, string> = {
            morningTitle: '晨報',
            morningEmptyLabel: morning.length === 0 ? '今日尚無晨報' : '',
            dispatchTitle: '派遣板',
            dispatchEmptyLabel: dispatch.length === 0 ? '目前沒有可派遣的任務' : '',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = {
            morningEmptyLabel: morning.length === 0,
            dispatchEmptyLabel: dispatch.length === 0,
        };
        for (let i = 0; i < MORNING_MAX_LINES; i++) {
            const line = morning[i];
            actives[`morningLine${i}`] = line !== undefined;
            texts[`morningLine${i}`] = line ?? '';
        }
        for (let i = 0; i < DISPATCH_MAX_ROWS; i++) {
            const row = dispatch[i];
            actives[`dispatchRow${i}`] = row !== undefined;
            texts[`dispatchRow${i}Name`] = row?.title ?? '';
            texts[`dispatchRow${i}Score`] = row?.scoreText ?? '';
        }
        return { texts, actives, enabled: { btnClose: true } };
    }
}
