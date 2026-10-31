// @spec-source → 奧義系統.md (doc_spec_0030)「UTEAMHEAL 團隊回復家族」；SYS-SKILL-ULT-0003
/**
 * 團隊回復（SYS-SKILL-ULT-0003）— 純邏輯，不依賴 cc。
 *
 * 一次施放對施放陣營全體存活單位結算：群體補血、淨化負面狀態、士氣回復、護盾。
 * 瀕死優先：依血量比例由低到高處理，同比例以 id 排序保持確定性。
 * 補血與士氣不得越過上限；淨化只動白名單內的負面狀態，依固定順序移除，不會誤刪正面狀態。
 *
 * PM 暫定（可逆）：規格只給文字的欄位，數字集中在 TEAM_RECOVER_PARAMS。
 * 減傷、抗性、反擊率等持續型附帶效果待後續片接 aura。
 */
import { StatusEffect } from '../../shared/CommonEnums';

export interface TeamRecoverParams {
    /** 補血量 = 最大 HP × healPct */
    healPct: number;
    /** 每個單位最多淨化幾個負面狀態 */
    cleanseCount: number;
    /** 士氣回復量（0..100 的點數） */
    moraleRestore: number;
    /** 護盾量 = 最大 HP × shieldPct */
    shieldPct: number;
}

/** 淨化白名單與移除順序：控制類優先 */
export const TEAM_RECOVER_CLEANSE_ORDER: readonly StatusEffect[] = [StatusEffect.Stun, StatusEffect.Rooted, StatusEffect.Slow, StatusEffect.Weak];

export const MORALE_CAP = 100;

/** 奧義 id → 回復參數（資料表，數值暫定） */
export const TEAM_RECOVER_PARAMS: Readonly<Record<string, TeamRecoverParams>> = {
    // 全軍士氣回復 25%，並解除 1 個控制狀態
    'ult-liu-bei-1': { healPct: 0, cleanseCount: 1, moraleRestore: 25, shieldPct: 0 },
    // 全軍回復 20% HP（2 回合減傷待後續片）
    'ult-liu-bei-3': { healPct: 0.2, cleanseCount: 0, moraleRestore: 0, shieldPct: 0 },
    // 移除 1 個負面狀態（抗性提升待後續片）
    'ult-cao-zhi-3': { healPct: 0, cleanseCount: 1, moraleRestore: 0, shieldPct: 0 },
    // 全軍護盾：暫定 15% 最大 HP（反擊率待後續片）
    'ult-sun-quan-4': { healPct: 0, cleanseCount: 0, moraleRestore: 0, shieldPct: 0.15 },
};

export function teamRecoverParamsOf(ultimateId: string | null | undefined): TeamRecoverParams | null {
    return ultimateId ? TEAM_RECOVER_PARAMS[ultimateId] ?? null : null;
}

export interface RecoverTarget {
    id: string;
    currentHp: number;
    maxHp: number;
    morale: number;
    /** 目前身上的狀態 */
    effects: readonly StatusEffect[];
}

export interface RecoverOutcome {
    id: string;
    healed: number;
    moraleGained: number;
    shield: number;
    cleansed: StatusEffect[];
}

/** 瀕死優先的處理順序：血量比例低者先，同比例依 id */
export function recoverOrder<T extends RecoverTarget>(targets: readonly T[]): T[] {
    const ratio = (t: RecoverTarget) => (t.maxHp > 0 ? t.currentHp / t.maxHp : 1);
    return [...targets].sort((a, b) => ratio(a) - ratio(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 依白名單順序挑出要淨化的負面狀態；正面狀態永遠不在名單內 */
export function cleansePick(effects: readonly StatusEffect[], count: number): StatusEffect[] {
    if (count <= 0) return [];
    return TEAM_RECOVER_CLEANSE_ORDER.filter((e) => effects.includes(e)).slice(0, count);
}

/** 對一批存活目標結算回復；回傳順序即瀕死優先順序 */
export function resolveTeamRecover(ultimateId: string, targets: readonly RecoverTarget[]): RecoverOutcome[] {
    const p = teamRecoverParamsOf(ultimateId);
    if (!p) return [];
    return recoverOrder(targets.filter((t) => t.currentHp > 0)).map((t) => ({
        id: t.id,
        healed: Math.max(0, Math.min(t.maxHp - t.currentHp, Math.round(t.maxHp * p.healPct))),
        moraleGained: Math.max(0, Math.min(MORALE_CAP - t.morale, p.moraleRestore)),
        shield: Math.round(t.maxHp * p.shieldPct),
        cleansed: cleansePick(t.effects, p.cleanseCount),
    }));
}
