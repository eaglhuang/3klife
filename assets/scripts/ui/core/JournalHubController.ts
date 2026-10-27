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
    /** 可派遣的武將（PROG-2-1186 選將列）；未提供時只有「自動挑選」。 */
    dispatchGenerals?: () => readonly { id: string; name: string }[];
}

export const DISPATCH_AUTO_PICK_LABEL = '自動挑選';

export class JournalHubController {
    /** 選將列目前人選；null 表示自動挑選 */
    private _pickedId: string | null = null;

    constructor(private readonly _deps: JournalHubDeps) {}

    private _generals(): readonly { id: string; name: string }[] {
        return this._deps.dispatchGenerals?.() ?? [];
    }

    /** 目前指定的武將 id；自動挑選或人選已不可派時回傳 undefined */
    public pickedGeneralId(): string | undefined {
        return this._generals().find((g) => g.id === this._pickedId)?.id;
    }

    /** 在「自動挑選」與可派武將間循環：step 1 下一位、-1 上一位 */
    public cyclePick(step: 1 | -1): void {
        const ids: (string | null)[] = [null, ...this._generals().map((g) => g.id)];
        const current = Math.max(0, ids.indexOf(this.pickedGeneralId() ?? null));
        this._pickedId = ids[(current + step + ids.length) % ids.length];
    }

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
        const picked = this._generals().find((g) => g.id === this._pickedId);
        texts.dispatchPickerLabel = `派遣武將：${picked?.name ?? DISPATCH_AUTO_PICK_LABEL}`;
        const canPick = this._generals().length > 0;
        return { texts, actives, enabled: { btnClose: true, btnPrevDispatchGeneral: canPick, btnNextDispatchGeneral: canPick } };
    }
}
