// @spec-source → 因子解鎖系統.md §C 名士占卜、§E 功能 5「名士提前預覽（P1）：占卜可看到鎖住的因子方向」；PM 指定 2026-10-15 00:06Z 照做（規格 P1，WBS 標 P0 以規格為準）
/**
 * SageFactorPreview — 名士提前預覽鎖住的因子方向（純邏輯，不依賴 cc）
 *
 * 規格：付費占卜可提前預覽還鎖住的因子，只給「方向」（色系），不給因子名稱或精準結果。
 *
 * 暫定選擇（規格沒寫細節，可逆）：
 * - 「提前」指的是玩家等級還沒到、因此看不到的因子：只列出仍鎖住、且色系門檻高於目前發現等級的因子。
 * - 只回傳色系（方向），去重、依武將基因原順序；沒有色系的因子不列。
 * - 不改武將資料、不擲骰；覺醒仍走 SageDivination。
 *
 * Unity 對照：像一個 static 的 Query，讀武將資料回傳提示清單，不改場景。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { FACTOR_DISCOVERY_LEVEL, FactorColor, normalizeFactorColor } from './FactorInheritance';
import { isFactorLevelUnlocked } from './FactorVisibility';

/**
 * 回傳仍鎖住、且目前發現等級還看不到的因子色系（方向）。
 * 基因的門檻優先用 gene.discoveryLevel，沒有才用色系預設。
 */
export function previewLockedFactorDirections(general: GeneralConfig | undefined, discoveryLevel: number): FactorColor[] {
    if (!general) return [];
    const level = Number.isFinite(discoveryLevel) ? discoveryLevel : 0;
    const out: FactorColor[] = [];
    for (const gene of general.genes ?? []) {
        if (gene.isLocked === false) continue;
        const color = normalizeFactorColor(gene.type);
        if (!color) continue;
        const required = gene.discoveryLevel ?? FACTOR_DISCOVERY_LEVEL[color];
        if (isFactorLevelUnlocked(level, required)) continue;
        if (!out.includes(color)) out.push(color);
    }
    return out;
}

/** 教官窺探的方向用語（因子解鎖系統 §G，PROG-2-1785）；規格只給句型，用語暫定 */
const FACTOR_HINT_LABEL: Record<FactorColor, string> = {
    blue: '未顯的才能',
    pink: '未顯的適性',
    green: '祖傳的戰法種子',
    white: '隱藏的天賦',
    red: '過人的體魄',
    purple: '天命之力',
};

export function mentorPeekLine(mentorName: string, direction: FactorColor): string {
    return `教官 ${mentorName}：此子似乎還藏有${FACTOR_HINT_LABEL[direction]}…`;
}
