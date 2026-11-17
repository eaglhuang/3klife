// @spec-source → doc_spec_1178 §5（情報遮蔽）、§6（四鈕條件）、§7.1（可派武將）、§7.2（成功率）、§8（委任選將）；doc_spec_0455（自告奮勇）；PROG-2-9130
/**
 * HallMissionRules — 大廳任務的成功率、可派武將判定、耗費檢查與委任選將（純邏輯，不依賴 cc）。
 *
 * 成功率（§7.2）：
 *   基礎 = clamp(0.5 + (戰力 − 門檻) / 門檻 × 0.5, 0.05, 0.95)
 *   重點屬性修正 = clamp((屬性 − 70) × 0.003, −0.06, +0.09)
 *   自告奮勇 = +0.5（只加給自告奮勇者）
 *   最終 = clamp(基礎 + 修正 + 自告奮勇, 0.05, 1.0)
 * 數值全部來自 hall-mission-balance.json，這裡不寫死。
 *
 * Unity 對照：像一組 static 規則函式，UI 只問「能不能派、成功率多少、缺什麼」。
 */
import {
    type HallKeyStat, type HallMission, type HallMissionAmounts, type HallMissionBalance,
} from './HallMissionData';

export type HallGeneralBlock = 'dead' | 'retired' | 'not-graduated' | 'nurturing' | 'traveling' | 'on-mission' | 'offline-dispatch' | 'low-energy';

export const HALL_BLOCK_TEXT: Readonly<Record<HallGeneralBlock, string>> = Object.freeze({
    dead: '已陣亡',
    retired: '已退役',
    'not-graduated': '尚未畢業',
    nurturing: '培育中',
    traveling: '趕路中',
    'on-mission': '出任務中',
    'offline-dispatch': '離線派遣中',
    'low-energy': '精力不足',
});

/** 一位武將在這個判定當下的事實（由 GameSession 從名冊與各系統狀態彙整） */
export interface HallGeneralFacts {
    id: string;
    name: string;
    /** estimateSortiePower */
    power: number;
    /** 目前精力 */
    vitality: number;
    stats: Readonly<Partial<Record<HallKeyStat, number>>>;
    /** 與精力無關的不可派原因（出征中、趕路中、已在其他任務…）；null 表示無 */
    block: HallGeneralBlock | null;
    /** 自告奮勇者（doc_spec_0455） */
    volunteer?: boolean;
}

export interface HallSuccessRateParts { base: number; keyStatAdjust: number; volunteerBonus: number; final: number }

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** 成功率（§7.2）；戰力或門檻非法時最低保底 */
export function hallSuccessRateOf(mission: Readonly<Pick<HallMission, 'powerRequired' | 'keyStat'>>, general: Readonly<Pick<HallGeneralFacts, 'power' | 'stats' | 'volunteer'>>, balance: Readonly<HallMissionBalance>): HallSuccessRateParts {
    const r = balance.rate;
    const power = Number.isFinite(general.power) ? general.power : 0;
    const need = mission.powerRequired > 0 ? mission.powerRequired : 1;
    const base = clamp(r.base + ((power - need) / need) * r.powerSlope, r.baseMin, r.baseMax);
    const stat = general.stats[mission.keyStat];
    const keyStatAdjust = typeof stat === 'number' && Number.isFinite(stat) ? clamp((stat - r.keyStatBaseline) * r.keyStatPerPoint, r.keyStatMin, r.keyStatMax) : 0;
    const volunteerBonus = general.volunteer === true ? r.volunteerBonus : 0;
    return { base, keyStatAdjust, volunteerBonus, final: clamp(base + keyStatAdjust + volunteerBonus, r.finalMin, r.finalMax) };
}

/** 完美加成條件（§9）：自告奮勇、重點屬性 ≥ 門檻、派出前情報度已 100 */
export function hallPerfectEligible(mission: Readonly<Pick<HallMission, 'keyStat' | 'intel'>>, general: Readonly<Pick<HallGeneralFacts, 'stats' | 'volunteer'>>, balance: Readonly<HallMissionBalance>): boolean {
    const stat = general.stats[mission.keyStat];
    return general.volunteer === true || (typeof stat === 'number' && stat >= balance.perfectKeyStatThreshold) || mission.intel >= 100;
}

/** 這位武將現在能不能接這個任務：回傳阻擋原因，可派為 null（§7.1，精力在此一併檢查） */
export function hallGeneralBlockOf(mission: Readonly<Pick<HallMission, 'energyCost'>>, general: Readonly<Pick<HallGeneralFacts, 'block' | 'vitality'>>): HallGeneralBlock | null {
    if (general.block) return general.block;
    return general.vitality >= mission.energyCost ? null : 'low-energy';
}

export interface HallCandidate {
    id: string;
    name: string;
    rate: number;
    volunteer: boolean;
    block: HallGeneralBlock | null;
    vitality: number;
}

/**
 * 候選排序（§7.1）：可派的在前，自告奮勇者優先，其餘依成功率高到低；不可派的列在最後。
 * 同分取精力高者，再取代號字典序，結果固定。
 */
export function rankHallCandidates(mission: Readonly<HallMission>, generals: readonly HallGeneralFacts[], balance: Readonly<HallMissionBalance>): HallCandidate[] {
    const rows: HallCandidate[] = generals.map((g) => ({
        id: g.id, name: g.name, volunteer: g.volunteer === true, vitality: g.vitality,
        rate: hallSuccessRateOf(mission, g, balance).final,
        block: hallGeneralBlockOf(mission, g),
    }));
    return rows.sort((a, b) => {
        if ((a.block === null) !== (b.block === null)) return a.block === null ? -1 : 1;
        if (a.volunteer !== b.volunteer) return a.volunteer ? -1 : 1;
        if (a.rate !== b.rate) return b.rate - a.rate;
        if (a.vitality !== b.vitality) return b.vitality - a.vitality;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

/** 委任選將（§8）：可派者中最終成功率最高；同分精力較高；再同分代號字典序。沒有可派者回傳 null */
export function pickDelegateGeneral(mission: Readonly<HallMission>, generals: readonly HallGeneralFacts[], balance: Readonly<HallMissionBalance>): string | null {
    let best: HallCandidate | null = null;
    for (const c of rankHallCandidates(mission, generals, balance)) {
        if (c.block !== null) continue;
        if (best === null || c.rate > best.rate || (c.rate === best.rate && (c.vitality > best.vitality || (c.vitality === best.vitality && c.id < best.id)))) best = c;
    }
    return best ? best.id : null;
}

export interface HallShortage { resource: 'grain' | 'silver' | 'troops'; need: number; have: number }

export const HALL_RESOURCE_NAME: Readonly<Record<HallShortage['resource'], string>> = Object.freeze({ grain: '糧草', silver: '黃金', troops: '城市兵源' });

/** 耗費檢查：回傳所有不足的資源（§5、§6：付不起時要標出缺什麼） */
export function hallShortagesOf(costs: Readonly<HallMissionAmounts>, stock: Readonly<HallMissionAmounts>): HallShortage[] {
    const out: HallShortage[] = [];
    for (const resource of ['grain', 'troops', 'silver'] as const) {
        if (costs[resource] > Math.max(0, Math.floor(stock[resource]))) out.push({ resource, need: costs[resource], have: Math.max(0, Math.floor(stock[resource])) });
    }
    return out;
}

export function hallShortageText(shortages: readonly HallShortage[]): string {
    return shortages.map((s) => `${HALL_RESOURCE_NAME[s.resource]}不足（需 ${s.need}，現有 ${s.have}）`).join('、');
}

/** 成功率預覽區間（§5）：實際值 ±邊界，取整到 step（預設 ±15、5%），情報未滿時用 */
export function hallRatePreview(rate: number, balance: Readonly<HallMissionBalance>): { low: number; high: number; text: string } {
    const step = balance.rate.previewStep * 100;
    const margin = balance.rate.previewMargin * 100;
    const pct = rate * 100;
    const low = clamp(Math.round((pct - margin) / step) * step, 0, 100);
    const high = clamp(Math.round((pct + margin) / step) * step, 0, 100);
    return { low, high, text: `${low}%～${high}%` };
}

/** 成功率顯示：情報 100 顯示確切百分比，否則顯示區間 */
export function hallRateText(rate: number, intel: number, balance: Readonly<HallMissionBalance>): string {
    return intel >= 100 ? `${Math.round(rate * 100)}%` : hallRatePreview(rate, balance).text;
}
