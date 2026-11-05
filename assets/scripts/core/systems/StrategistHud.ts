// @spec-source → 關卡設計系統.md §D-4 軍師 HUD 正式資訊層、§I 互動物件回收與戰後摘要（PROG-2-1313，WBS LVL-06）
/**
 * StrategistHud — 軍師 HUD 四摘要欄的文字組成（純邏輯，不依賴 cc）
 *
 * 四欄：Theme_Hazard、Interactive_Object_Status、Stage_Salvage_Summary、Recommended_Loadout_Gap。
 * 規則（§D-4）：
 * - Theme_Hazard 只收「當前回合會發生」的危害，由呼叫端篩選，這裡不預先透出全部觸發點。
 * - Recommended_Loadout_Gap 只列缺口關鍵字（如「抗混亂」），不給最佳戰法答案。
 * - 互動物件只列呼叫端已揭露的物件狀態，埋伏點與 AI 路徑不在輸入中。
 *
 * Unity 對照：像 HUD 的 Presenter，只拿 ViewModel 上已公開的欄位組字，沒有的欄位不去 Scene 裡找。
 */

export const INTERACTIVE_OBJECT_KINDS = ['Rockfall_Node', 'Floodgate', 'Camp_Target', 'Trap_Cluster'] as const;
export type InteractiveObjectKind = (typeof INTERACTIVE_OBJECT_KINDS)[number];

export type InteractiveObjectState = 'alive' | 'triggered' | 'recovered';

export interface InteractiveObjectView {
    kind: InteractiveObjectKind;
    state: InteractiveObjectState;
}

export interface SalvageTotals {
    stone: number;
    wood: number;
    supply: number;
    intel: number;
    /** 武器材料（火燒偷襲戰掠奪，PROG-2-1509） */
    weaponMaterial: number;
    /** 教官經驗（火燒偷襲戰掠奪，PROG-2-1509） */
    instructorExp: number;
}

export interface StrategistHudInput {
    /** 本回合會發生的主題危害名稱（落石預警、水位上升等）；呼叫端只傳本回合的 */
    hazardsThisTurn: readonly string[];
    /** 呼叫端已揭露的互動物件 */
    interactiveObjects: readonly InteractiveObjectView[];
    /** 關卡級 Stage_Salvage 目前累計 */
    salvage: SalvageTotals;
    /** 缺少的對策關鍵字（如 抗混亂、反隱） */
    missingCounters: readonly string[];
    /** 本場正在執行的場景戰法與執行者（主戰場UI §6.3，PROG-2-1758）；一般戰鬥不傳 */
    executing?: StrategistExecution;
}

/** 參謀常駐行的資料：執行者姓名、智力、場景戰法名稱 */
export interface StrategistExecution {
    name: string;
    int: number;
    tactic: string;
    /** 情報需求（主戰場UI §6.3，PROG-2-1760）：只有設情報門檻的戰法才帶 */
    intel?: { current: number; required: number };
}

export interface StrategistHudSummary {
    themeHazard: string;
    interactiveObjectStatus: string;
    stageSalvageSummary: string;
    recommendedLoadoutGap: string;
    /** 參謀常駐行，例如「曹操 INT 91，正在執行：夜襲」；一般戰鬥為空字串 */
    executingTactic: string;
}

const KIND_LABEL: Readonly<Record<InteractiveObjectKind, string>> = {
    Rockfall_Node: '落石機關',
    Floodgate: '水門',
    Camp_Target: '營帳',
    Trap_Cluster: '陷阱',
};

const STATE_LABEL: Readonly<Record<InteractiveObjectState, string>> = {
    alive: '存活',
    triggered: '已觸發',
    recovered: '已回收',
};

const SALVAGE_LABEL: Readonly<Record<keyof SalvageTotals, string>> = {
    stone: '石材',
    wood: '木材',
    supply: '補給',
    intel: '情報',
    weaponMaterial: '武器材料',
    instructorExp: '教官經驗',
};

/** 一次掉落的資源清單（中文名稱 + 數量），略過 0；順序同軍師 HUD 回收欄（PROG-2-1852） */
export function salvageGainItems(gain: Partial<SalvageTotals>): { name: string; amount: number }[] {
    const items: { name: string; amount: number }[] = [];
    for (const key of Object.keys(SALVAGE_LABEL) as (keyof SalvageTotals)[]) {
        const amount = gain[key] ?? 0;
        if (amount > 0) items.push({ name: SALVAGE_LABEL[key], amount });
    }
    return items;
}

export function buildStrategistHudSummary(input: StrategistHudInput): StrategistHudSummary {
    return {
        themeHazard: input.hazardsThisTurn.length > 0 ? input.hazardsThisTurn.join('、') : '本回合無主題危害',
        interactiveObjectStatus: interactiveObjectStatusOf(input.interactiveObjects),
        stageSalvageSummary: salvageSummaryOf(input.salvage),
        recommendedLoadoutGap: input.missingCounters.length > 0 ? `缺少${input.missingCounters.join('、')}` : '對策槽無缺口',
        executingTactic: executingTacticOf(input.executing),
    };
}

/**
 * 軍師 HUD 的戰場日誌句（PROG-2-1744，暫定）：戰場尚無 HUD 欄位節點，先在回合開始寫進戰場日誌。
 * 只列有內容的欄位（執行中戰法、危害、物件、回收、缺口），都是預設空值時回傳空字串，不寫日誌。
 * 例：「軍師：曹操 INT 91，正在執行：火攻｜危害 火場延燒｜營帳：存活 2｜回收 石材 3｜缺少抗混亂」
 */
export function strategistHudLogLine(input: StrategistHudInput): string {
    const summary = buildStrategistHudSummary(input);
    const parts: string[] = [];
    if (summary.executingTactic) parts.push(summary.executingTactic);
    if (input.hazardsThisTurn.length > 0) parts.push(`危害 ${summary.themeHazard}`);
    if (input.interactiveObjects.length > 0) parts.push(summary.interactiveObjectStatus.split('\n').join('；'));
    if ((Object.keys(SALVAGE_LABEL) as (keyof SalvageTotals)[]).some((key) => input.salvage[key] > 0)) parts.push(`回收 ${summary.stageSalvageSummary}`);
    if (input.missingCounters.length > 0) parts.push(summary.recommendedLoadoutGap);
    return parts.length > 0 ? `軍師：${parts.join('｜')}` : '';
}

/** 「曹操 INT 91，正在執行：夜襲（情報 30 / 40）」；情報以 目前值 / 門檻 呈現，不用百分比（§6.3） */
function executingTacticOf(executing: StrategistExecution | undefined): string {
    if (!executing) return '';
    const intel = executing.intel ? `（情報 ${executing.intel.current} / ${executing.intel.required}）` : '';
    return `${executing.name} INT ${executing.int}，正在執行：${executing.tactic}${intel}`;
}

/** 依物件類別列出各狀態數量，例如「營帳：存活 2、已回收 1」；沒有的類別不列。 */
function interactiveObjectStatusOf(objects: readonly InteractiveObjectView[]): string {
    if (objects.length === 0) return '無互動物件';
    const lines: string[] = [];
    for (const kind of INTERACTIVE_OBJECT_KINDS) {
        const ofKind = objects.filter((object) => object.kind === kind);
        if (ofKind.length === 0) continue;
        const parts = (Object.keys(STATE_LABEL) as InteractiveObjectState[])
            .map((state) => ({ state, count: ofKind.filter((object) => object.state === state).length }))
            .filter((entry) => entry.count > 0)
            .map((entry) => `${STATE_LABEL[entry.state]} ${entry.count}`);
        lines.push(`${KIND_LABEL[kind]}：${parts.join('、')}`);
    }
    return lines.join('\n');
}

/** 戰後摘要只列數量大於 0 的收益，全部為 0 時回報「尚無收益」。 */
function salvageSummaryOf(salvage: SalvageTotals): string {
    const parts = (Object.keys(SALVAGE_LABEL) as (keyof SalvageTotals)[])
        .filter((key) => salvage[key] > 0)
        .map((key) => `${SALVAGE_LABEL[key]} ${salvage[key]}`);
    return parts.length > 0 ? parts.join('、') : '尚無收益';
}
