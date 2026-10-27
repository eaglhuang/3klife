// @spec-source → 武將人物介面規格書 §7 技頁：Tactics（顯示主戰法、已習得／可習得／未解鎖三列表，三態規則：彩色可點、半透明顯示需求、灰階顯示鎖定理由）；WBS GDUI-10；PROG-2-1042
/**
 * TacticsTabView — 武將技頁的檢視模型（純邏輯，不依賴 cc）。
 *
 * - 三態：LEARNED（已習得，彩色可點詳情）、LEARNABLE（可習得，半透明，顯示學習需求 TP）、LOCKED（未解鎖，灰階，顯示鎖定理由）。
 * - 戰法名稱、等級、TP 消耗、類型、簡述由呼叫端注入的 lookup 提供；查無定義時顯示 id，不補假資料。
 * - 同一戰法只會出現在一個列表：已習得優先，其次可習得，最後未解鎖。
 * - 主戰法的狀態依同一套規則判定；不在任何列表中的主戰法視為未解鎖，理由為空字串。
 *
 * Unity 對照：像 ScrollView 的 ViewModel，把 Model 的三組 id 排成三個 Row 清單，每列只讀顯示欄位，不回寫 Model。
 */
import { tacticLearnThreshold } from './TacticLearning';

export type TacticTabState = 'LEARNED' | 'LEARNABLE' | 'LOCKED';

/** 三態對應的呈現方式（規格 §7：彩色／半透明／灰階）。 */
export const TACTIC_TAB_STATE_STYLE: Readonly<Record<TacticTabState, 'color' | 'translucent' | 'grayscale'>> = Object.freeze({
    LEARNED: 'color',
    LEARNABLE: 'translucent',
    LOCKED: 'grayscale',
});

export interface TacticDefinitionView {
    name: string;
    /** 戰法等級；沒有等級資料時為 null，不顯示等級 */
    level: number | null;
    tpCost: number;
    type: string;
    summary: string;
}

export interface LockedTacticInput {
    tacticId: string;
    /** 鎖定理由（由上游資料提供，例如未達某等級） */
    reason: string;
}

export interface TacticsTabInput {
    mainTacticId: string | null;
    learned: readonly string[];
    learnable: readonly string[];
    locked: readonly LockedTacticInput[];
    lookup: (tacticId: string) => TacticDefinitionView | undefined;
}

export interface TacticRow {
    tacticId: string;
    state: TacticTabState;
    name: string;
    /** 等級、TP 消耗與類型，例如「Lv3 · TP 30 · 攻擊」；查無定義時為空字串 */
    meta: string;
    /** 已習得顯示簡述；可習得顯示需求 TP；未解鎖顯示鎖定理由 */
    detail: string;
}

export interface TacticsTabView {
    main: TacticRow | null;
    learned: TacticRow[];
    learnable: TacticRow[];
    locked: TacticRow[];
}

function detailOf(state: TacticTabState, def: TacticDefinitionView | undefined, reason: string): string {
    if (state === 'LEARNED') return def?.summary ?? '';
    if (state === 'LEARNABLE') return `需要 TP ${tacticLearnThreshold(def?.tpCost ?? 0)}`;
    return reason;
}

function rowOf(tacticId: string, state: TacticTabState, input: TacticsTabInput, reason = ''): TacticRow {
    const def = input.lookup(tacticId);
    const meta = def
        ? [def.level !== null ? `Lv${def.level}` : null, `TP ${def.tpCost}`, def.type].filter((part): part is string => part !== null).join(' · ')
        : '';
    return { tacticId, state, name: def?.name ?? tacticId, meta, detail: detailOf(state, def, reason) };
}

/** 依已習得、可習得、未解鎖三組 id 建出技頁檢視模型；同一戰法只保留一個狀態。 */
export function buildTacticsTabView(input: TacticsTabInput): TacticsTabView {
    const learned = Array.from(new Set(input.learned));
    const learnedSet = new Set(learned);
    const learnable = Array.from(new Set(input.learnable)).filter((id) => !learnedSet.has(id));
    const taken = new Set(learned.concat(learnable));
    const lockedReasons = new Map<string, string>();
    for (const item of input.locked) {
        if (!taken.has(item.tacticId) && !lockedReasons.has(item.tacticId)) lockedReasons.set(item.tacticId, item.reason);
    }

    let main: TacticRow | null = null;
    if (input.mainTacticId) {
        const id = input.mainTacticId;
        if (learnedSet.has(id)) main = rowOf(id, 'LEARNED', input);
        else if (learnable.includes(id)) main = rowOf(id, 'LEARNABLE', input);
        else main = rowOf(id, 'LOCKED', input, lockedReasons.get(id) ?? '');
    }

    return {
        main,
        learned: learned.map((id) => rowOf(id, 'LEARNED', input)),
        learnable: learnable.map((id) => rowOf(id, 'LEARNABLE', input)),
        locked: Array.from(lockedReasons, ([id, reason]) => rowOf(id, 'LOCKED', input, reason)),
    };
}
