// @spec-source → WBS v3 MVP-10 大廳內政畫面；DomesticTasks.ts 產出表（暫定）；PROG-2-0319
/**
 * DomesticPanelController — 大廳內政 5 大任務面板的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 把 DomesticPresenter 的 5 列資料轉成扁平 FlowView，key 與 domestic-main.json 的節點 id 一一對應
 *   - 點選任務 → 呼叫 GameSession.chooseDomesticTask；同季已選過的情況由規則擋下，畫面只顯示提示
 *   - 換將 → 依該任務產出高低輪流指派武將（PROG-2-1159，產出依 §F 屬性公式）
 *
 * 規則（同季只能選一項、產出多少）全在 DomesticTasks，這裡不重算。
 *
 * Unity 對照：MVP 的 Presenter。Button onClick 只呼叫 choose()，
 * 畫面層拿 getFlowView() 一次刷新 Text 與 Button.interactable。
 */
import { domesticOutputFor, DomesticSeasonLog, DomesticStats, DomesticTaskId, DomesticTaskResult } from '../../core/systems/DomesticTasks';
import { planAutoGovernance } from '../../core/systems/DomesticAutoGovernance';
import { bonusPercentText, magistrateGoldBonus } from '../../core/systems/ChildMagistrate';

/** 可擔任郡城縣令的子嗣（PROG-2-1162） */
export interface MagistrateCandidate {
    id: string;
    name: string;
    pol: number;
}
import { buildDomesticRows, DomesticGovernor, DomesticTaskRow } from '../../core/systems/DomesticPresenter';

/** 可指派到內政任務格的武將 */
export interface DomesticGovernorCandidate {
    id: string;
    name: string;
    stats: DomesticStats;
}

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
    /** 以下為任務格指派武將（GOV-04 / PROG-2-1159）；不提供時畫面不顯示換將 */
    candidates?: () => DomesticGovernorCandidate[];
    /** 目前各任務格指派的武將 id */
    assignedUid?: (taskId: DomesticTaskId) => string | null;
    /** uid = null 表示卸下；回傳是否成功 */
    assign?: (taskId: DomesticTaskId, uid: string | null) => boolean;
    /** 自動治理開關（§E #7，PROG-2-1161）；setAutoMode 回傳開啟時補了幾格 */
    autoMode?: () => boolean;
    setAutoMode?: (on: boolean) => number;
    /** 子嗣郡城縣令（§E #9，PROG-2-1162）；不提供時畫面不顯示縣令欄 */
    magistrateCandidates?: () => MagistrateCandidate[];
    magistrateUid?: () => string | null;
    setMagistrate?: (uid: string | null) => boolean;
}

/** 任務 id → 節點名稱片段（layout 節點 id 用 btn<Name> / <name>Output / <name>Chosen） */
const NODE_NAME: Readonly<Record<DomesticTaskId, string>> = Object.freeze({
    farming: 'Farming',
    commerce: 'Commerce',
    diplomacy: 'Diplomacy',
    arms: 'Arms',
    scouting: 'Scouting',
});

const NODE_TASKS = Object.keys(NODE_NAME) as DomesticTaskId[];

const REJECT_TEXT: Readonly<Record<string, string>> = Object.freeze({
    'already-chosen-this-season': '本季已選過內政任務，下一季再選',
    'unknown-task': '找不到此內政任務',
});

export class DomesticPanelController {
    private _notice: string | null = null;

    constructor(private readonly _deps: DomesticPanelDeps) {}

    /** 5 列資料（直接沿用 DomesticPresenter） */
    public rows(): DomesticTaskRow[] {
        return buildDomesticRows(this._deps.log(), this._deps.season(), (taskId) => this._governorOf(taskId), this._goldBonus());
    }

    /**
     * 換將：依該任務產出由高到低輪流切換武將，最後一位之後回到「未指派」。
     * 已指派在其他任務格的武將跳過（一位武將同時只管一格）。
     */
    public cycleGovernor(taskId: DomesticTaskId): void {
        const { candidates, assignedUid, assign } = this._deps;
        if (!candidates || !assignedUid || !assign) return;
        const busy = new Set(NODE_TASKS.filter((t) => t !== taskId).map((t) => assignedUid(t)).filter((uid): uid is string => !!uid));
        const order = candidates()
            .filter((c) => !busy.has(c.id))
            .sort((a, b) => domesticOutputFor(taskId, b.stats).amount - domesticOutputFor(taskId, a.stats).amount);
        const current = assignedUid(taskId);
        const index = order.findIndex((c) => c.id === current);
        const next = index + 1 < order.length ? order[index + 1] : null;
        if (!next && current === null) {
            this._notice = '沒有可指派的武將';
            return;
        }
        if (!assign(taskId, next?.id ?? null)) {
            this._notice = '無法指派此武將';
            return;
        }
        const output = domesticOutputFor(taskId, next?.stats);
        this._notice = next ? `指派「${next.name}」：每季產出 +${output.amount}` : '已卸下武將，產出改回基本值';
    }

    /** 自動治理（§F）：空格依親和度補上閒置武將；已指派的格子不動。回傳新指派幾格 */
    public autoAssign(): number {
        const { candidates, assignedUid, assign } = this._deps;
        if (!candidates || !assignedUid || !assign) return 0;
        const picks = planAutoGovernance(candidates(), assignedUid);
        const done = picks.filter((pick) => assign(pick.task, pick.generalUid)).length;
        this._notice = done > 0
            ? '太守府已自動安排武將執行內政。'
            : (NODE_TASKS.every((t) => assignedUid(t)) ? '任務格皆已有主事' : '沒有可指派的閒置武將');
        return done;
    }

    /** 手動／自動治理切換；開啟時立即補空格 */
    public toggleAutoMode(): void {
        const { autoMode, setAutoMode } = this._deps;
        if (!autoMode || !setAutoMode) return;
        const on = !autoMode();
        const filled = setAutoMode(on);
        this._notice = on
            ? (filled > 0 ? `自動治理已啟用，太守府補上 ${filled} 格主事。` : '自動治理已啟用')
            : '已改回手動治理';
    }

    /** 縣令換人：依加成由高到低輪替子嗣（已任內政主事者跳過），最後回到未任命 */
    public cycleMagistrate(): void {
        const { magistrateCandidates, magistrateUid, setMagistrate, assignedUid } = this._deps;
        if (!magistrateCandidates || !magistrateUid || !setMagistrate) return;
        const busy = new Set(NODE_TASKS.map((t) => assignedUid?.(t)).filter((uid): uid is string => !!uid));
        const order = magistrateCandidates().filter((c) => !busy.has(c.id)).sort((a, b) => b.pol - a.pol);
        const current = magistrateUid();
        const index = order.findIndex((c) => c.id === current);
        const next = index + 1 < order.length ? order[index + 1] : null;
        if (!next && current === null) {
            this._notice = '沒有可任命的子嗣';
            return;
        }
        if (!setMagistrate(next?.id ?? null)) {
            this._notice = '無法任命此子嗣';
            return;
        }
        this._notice = next
            ? `任命「${next.name}」為郡城縣令：黃金產出 +${bonusPercentText(magistrateGoldBonus(next.pol))}`
            : '已卸下郡城縣令';
    }

    private _magistrate(): MagistrateCandidate | null {
        const uid = this._deps.magistrateUid?.();
        if (!uid) return null;
        return this._deps.magistrateCandidates?.().find((c) => c.id === uid) ?? null;
    }

    private _goldBonus(): number {
        const magistrate = this._magistrate();
        return magistrate ? magistrateGoldBonus(magistrate.pol) : 0;
    }

    private _governorOf(taskId: DomesticTaskId): DomesticGovernor | null {
        const uid = this._deps.assignedUid?.(taskId);
        if (!uid) return null;
        return this._deps.candidates?.().find((c) => c.id === uid) ?? null;
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
        const canAssign = !!(this._deps.candidates && this._deps.assignedUid && this._deps.assign);
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
            texts[`${key}Governor`] = row.governorName ? `主事：${row.governorName}` : '主事：未指派';
            texts[`btnGov${name}Label`] = '換將';
            actives[`btnGov${name}`] = canAssign;
            enabled[`btnGov${name}`] = canAssign;
        }
        enabled.btnClose = true;
        texts.btnAutoGovLabel = '自動指派';
        const hasMagistrate = !!(this._deps.magistrateCandidates && this._deps.magistrateUid && this._deps.setMagistrate);
        const magistrate = this._magistrate();
        texts.magistrateLabel = magistrate
            ? `郡城縣令：${magistrate.name}（黃金產出 +${bonusPercentText(magistrateGoldBonus(magistrate.pol))}）`
            : (hasMagistrate && this._deps.magistrateCandidates!().length > 0 ? '郡城縣令：未任命（子嗣可任）' : '郡城縣令：尚無子嗣可任');
        texts.btnMagistrateLabel = '換人';
        actives.magistrateLabel = hasMagistrate;
        actives.btnMagistrate = hasMagistrate;
        enabled.btnMagistrate = hasMagistrate;
        const hasMode = !!(this._deps.autoMode && this._deps.setAutoMode);
        texts.btnAutoModeLabel = this._deps.autoMode?.() ? '自動治理：開' : '自動治理：關';
        actives.btnAutoMode = hasMode;
        enabled.btnAutoMode = hasMode;
        actives.btnAutoGov = canAssign;
        enabled.btnAutoGov = canAssign;
        return { texts, actives, enabled };
    }
}
