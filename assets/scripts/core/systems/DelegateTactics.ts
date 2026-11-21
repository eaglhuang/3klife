// @spec-source → 戰場部署系統.md (doc_spec_0040) §委任 AI；PROG-2-9712（第一年連敗診斷：委任 AI 補強）
/**
 * DelegateTactics — 委任 AI 的選路、放招目標與主將出陣判斷（純邏輯，不依賴 cc）
 *
 * 第一年連敗的主因是委任 AI 太弱（同一存檔無頭模擬 5 關 × 20 種亂數比較，詳見 PROG-2-9712 notes）：
 *   1. 舊選路只挑「我方最少的路」，出兵口（depth 0）被敵兵堵住的路也照挑 → 每回合部署失敗；
 *   2. 每回合只出 1 隊（玩家上限 3 隊）；
 *   3. 從不放奧義、戰法，主將也從不出陣（出陣＝全軍攻擊加倍，是既有規則）。
 * 模擬也證明「迎敵選路」「優先剋制兵種」反而更差：五路對撞下空路能直接打到敵將，平均分路較好；
 * 剋制兵常是騎兵（兵力 1200），兵力池很快用完。所以選路維持平均分攤，只排除被堵住的出兵口。
 * 只調整委任 AI 的決策，不碰任何戰鬥規則。
 *
 * Unity 對照：AI 的 Utility 打分模組，輸入棋盤統計，輸出最佳選項。
 */

export interface DelegateLaneInput {
    /** 各路出兵口（depth 0）是否被占用或不能進入 */
    deployBlocked: readonly boolean[];
    /** 各路我方存活部隊數 */
    ownByLane: readonly number[];
}

/** 委任選路：排除出兵口被堵的路，挑我方最少的路，同數取較小路號；全被堵住回 -1 */
export function pickDelegateLaneSmart(input: DelegateLaneInput): number {
    let best = -1;
    for (let lane = 0; lane < input.deployBlocked.length; lane += 1) {
        if (input.deployBlocked[lane]) continue;
        if (best < 0 || (input.ownByLane[lane] ?? 0) < (input.ownByLane[best] ?? 0)) best = lane;
    }
    return best;
}

export interface DelegateTargetCandidate {
    id: string;
    /** 離我方出兵口的距離（depth 0 最近） */
    depth: number;
    currentHp: number;
}

/** 放招目標：最逼近我方的敵軍，同距離挑血量最多的；沒有敵軍回 null */
export function pickDelegateSkillTarget(enemies: readonly DelegateTargetCandidate[]): string | null {
    let best: DelegateTargetCandidate | null = null;
    for (const unit of enemies) {
        if (!best || unit.depth < best.depth || (unit.depth === best.depth && unit.currentHp > best.currentHp)) best = unit;
    }
    return best?.id ?? null;
}

/** 主將出陣門檻：主將血量比例至少這麼多才讓委任 AI 帶主將上場（暫定，PM 可調） */
export const DELEGATE_GENERAL_SORTIE_MIN_HP_RATE = 0.5;

/** 委任 AI 這回合要不要讓主將出陣 */
export function shouldDelegateGeneralSortie(input: { canSortie: boolean; hp: number; maxHp: number }): boolean {
    if (!input.canSortie || input.maxHp <= 0) return false;
    return input.hp / input.maxHp >= DELEGATE_GENERAL_SORTIE_MIN_HP_RATE;
}
