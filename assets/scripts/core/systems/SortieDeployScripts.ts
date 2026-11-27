// @spec-source → 戰場部署系統.md (doc_spec_0040) §G 劇本相關；PROG-2-1766
/**
 * SortieDeployScripts — 戰場部署時顯示的文字（純邏輯，不依賴 cc）。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */
import { checkDeploy, type DeployRequest, type SortieState } from './SortieDeploy';

export const DELEGATE_OFF_LINE = '委任已關閉：回到手動部署';
export const DELEGATE_UNAVAILABLE_LINE = '這場戰鬥沒有出征軍勢，無法委任';
export const FOOD_EMPTY_LINE = '糧草耗盡……無法再出兵！';
const FOOD_SHORT_LINE = '糧草不足，無法部署';

/** 後勤官支援句；沒有後勤官或加成為 0 時回 null，不顯示 */
export function deputySupportLine(deputyName: string | null | undefined, foodCapBonus: number): string | null {
    if (!deputyName || foodCapBonus <= 0) return null;
    return `後勤官 ${deputyName} 押運補給，軍糧上限 +${foodCapBonus}！`;
}

export function delegateOnLine(generalName: string): string {
    return `${generalName} 接管指揮權——委任自動出兵。`;
}

/** 部署因糧草失敗時的提示：糧草已歸零才算耗盡，還有糧只是不夠這一隊 */
export function foodShortMessage(currentFood: number): string {
    return currentFood <= 0 ? FOOD_EMPTY_LINE : FOOD_SHORT_LINE;
}

// ── 軍勢／糧草常駐顯示與出牌不足提示（doc_spec_1341，PROG-2-10104）──────────────
// 判定邏輯仍由 SortieDeploy.checkDeploy 負責；以下只把結果換成「看得到、說得清楚」的資料。

/** 一項資源的需求、現有與缺口；gap = max(0, need - have) */
export interface ResourceGap {
    need: number;
    have: number;
    gap: number;
}

export type DeployShortKind = 'ok' | 'troops' | 'food' | 'both' | 'field';

export interface DeployShortfall {
    troops: ResourceGap;
    food: ResourceGap;
    fieldFull: boolean;
    /** 場上已滿優先於資源不足（規格 §4） */
    kind: DeployShortKind;
}

/** 這一隊派出去的需求／現有／缺口；成本一律走 checkDeploy（含虎符糧耗折扣），不複製公式 */
export function describeDeployShortfall(state: SortieState, request: DeployRequest): DeployShortfall {
    const check = checkDeploy(state, request);
    const gapOf = (need: number, have: number): ResourceGap => ({ need, have, gap: Math.max(0, need - have) });
    const troops = gapOf(check.cost.troopCost, state.poolCurrent);
    const food = gapOf(check.cost.foodCost, state.food);
    const fieldFull = check.reasons.includes('FIELD_UNIT_LIMIT');
    let kind: DeployShortKind = 'ok';
    if (fieldFull) kind = 'field';
    else if (troops.gap > 0 && food.gap > 0) kind = 'both';
    else if (troops.gap > 0) kind = 'troops';
    else if (food.gap > 0) kind = 'food';
    return { troops, food, fieldFull, kind };
}

export interface ResourceSnapshot {
    /** 沒有出征帳本（舊路徑）時不顯示軍勢 */
    troops?: { cur: number; max: number };
    food: { cur: number; max: number };
}

/** 常駐資源列用的目前值與總量；非名冊出征只回糧草（fallbackFood 來自舊路徑的戰場糧草） */
export function resourceSnapshot(state: SortieState | null, fallbackFood: { cur: number; max: number }): ResourceSnapshot {
    if (!state) return { food: { cur: fallbackFood.cur, max: fallbackFood.max } };
    return {
        troops: { cur: state.poolCurrent, max: state.poolMax },
        food: { cur: state.food, max: state.maxFood },
    };
}

export type ResourceTone = 'normal' | 'low' | 'empty';

/** 狀態色：剩餘 < 25% 總量轉紅，歸零標「用完了」（規格 §3.3） */
export function resourceTone(cur: number, max: number): ResourceTone {
    if (cur <= 0) return 'empty';
    if (max > 0 && cur / max < 0.25) return 'low';
    return 'normal';
}

/** 進度條填滿比例 0~1 */
export function resourceFillRatio(cur: number, max: number): number {
    if (!(max > 0)) return 0;
    return Math.max(0, Math.min(1, cur / max));
}

/** 選卡預覽：派出後會剩多少（只算可付的部分，不會出現負數） */
export function resourceAfterDeploy(snapshot: ResourceSnapshot, cost: { troopCost: number; foodCost: number }): ResourceSnapshot {
    return {
        troops: snapshot.troops ? { cur: Math.max(0, snapshot.troops.cur - cost.troopCost), max: snapshot.troops.max } : undefined,
        food: { cur: Math.max(0, snapshot.food.cur - cost.foodCost), max: snapshot.food.max },
    };
}

/** 一個 i18n 鍵加上位置參數（{0}{1}…）；UI 層自己呼叫 i18n.t，這裡不寫死中文 */
export interface I18nCall {
    key: string;
    args: string[];
}

/** 第一層 Toast：點了灰卡立即出現，直接講缺多少（規格 §5.1） */
export function deployShortToast(sf: DeployShortfall, unitName: string): I18nCall | null {
    switch (sf.kind) {
        case 'field': return { key: 'battle.deploy.toast.field', args: [] };
        case 'both': return { key: 'battle.deploy.toast.both', args: [String(sf.troops.gap), String(sf.food.gap)] };
        case 'troops': return { key: 'battle.deploy.toast.troops', args: [unitName, String(sf.troops.need), String(sf.troops.have), String(sf.troops.gap)] };
        case 'food':
            if (sf.food.have <= 0) return { key: 'battle.deploy.toast.foodEmpty', args: [] };
            return { key: 'battle.deploy.toast.food', args: [unitName, String(sf.food.need), String(sf.food.have), String(sf.food.gap)] };
        default: return null;
    }
}

/** 卡面缺額帶文字：兩者皆缺分兩行，場上已滿優先（規格 §4） */
export function deployShortBand(sf: DeployShortfall): I18nCall[] {
    switch (sf.kind) {
        case 'field': return [{ key: 'battle.deploy.short.field', args: [] }];
        case 'both': return [
            { key: 'battle.deploy.short.troops', args: [String(sf.troops.gap)] },
            { key: 'battle.deploy.short.food', args: [String(sf.food.gap)] },
        ];
        case 'troops': return [{ key: 'battle.deploy.short.troops', args: [String(sf.troops.gap)] }];
        case 'food': return [{ key: 'battle.deploy.short.food', args: [String(sf.food.gap)] }];
        default: return [];
    }
}

/** 說明面板標題鍵（規格 §5.2）；場上已滿沿用 field 標題 */
export function deploySheetTitleKey(kind: DeployShortKind): string {
    switch (kind) {
        case 'food': return 'battle.deploy.sheet.title.food';
        case 'both': return 'battle.deploy.sheet.title.both';
        case 'field': return 'battle.deploy.sheet.title.field';
        default: return 'battle.deploy.sheet.title.troops';
    }
}

export interface DeployHelpContext {
    /** 場上有可撤回的我方部隊 */
    canRetreat: boolean;
    /** 主將尚未到最高階（升階會補兵） */
    canPromote: boolean;
    /** 改派建議（已通過 checkDeploy）；沒有就是 null */
    redirect: { troopName: string; troopCost: number; foodCost: number } | null;
}

/** 「怎麼補」清單：只列當下真能做的項目（規格 §5.3）；全沒有時回「都補不了」 */
export function deployHowToFix(sf: DeployShortfall, ctx: DeployHelpContext): I18nCall[] {
    const lines: I18nCall[] = [];
    const lackTroops = sf.troops.gap > 0;
    if (lackTroops && ctx.canRetreat) lines.push({ key: 'battle.deploy.how.retreat', args: [] });
    if (ctx.redirect && !sf.fieldFull) {
        lines.push({ key: 'battle.deploy.how.redirect', args: [ctx.redirect.troopName, String(ctx.redirect.troopCost), String(ctx.redirect.foodCost)] });
    }
    if (lackTroops && ctx.canPromote) lines.push({ key: 'battle.deploy.how.promote', args: [] });
    if (sf.food.gap > 0) lines.push({ key: 'battle.deploy.how.foodFixed', args: [] });
    if (lines.length === 0) lines.push({ key: 'battle.deploy.how.none', args: [] });
    return lines;
}
