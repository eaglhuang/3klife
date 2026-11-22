// @spec-source → PROG-2-2221 / PROG-2-2236（結果主角挑選與立繪縮放）
/**
 * 抽卡結果排序：滿版結算的大立繪取最高稀有度那位（同階取先抽到的）。
 * 純函式獨立成檔，讓開場結算與一般抽卡共用，也不必載入整個抽卡流程就能測。
 */
import type { LocalGachaResultEntry } from '../../core/services/LocalGachaService';

const RARITY_RANK: Readonly<Record<string, number>> = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };

export function pickTopGachaResult(results: readonly LocalGachaResultEntry[]): LocalGachaResultEntry | undefined {
    return results.reduce<LocalGachaResultEntry | undefined>((best, entry) =>
        !best || (RARITY_RANK[entry.rarityTier] ?? 0) > (RARITY_RANK[best.rarityTier] ?? 0) ? entry : best, undefined);
}

/** 結果卡稀有度標籤（與卡面角標一致）；未知階級原樣大寫 */
export function pullResultRarityLabel(rarityTier: string | null | undefined): string {
    switch ((rarityTier || '').toLowerCase()) {
        case 'mythic': return 'UR';
        case 'legendary': return 'SSR';
        case 'epic': return 'SR';
        case 'rare': return 'R';
        case 'common': return 'N';
        default: return (rarityTier || 'R').toUpperCase();
    }
}

const RARITY_LABEL_RANK: Readonly<Record<string, number>> = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

/**
 * 統計這一輪實際出現的稀有度（含 N），由高到低；只列出張數大於 0 的。
 * 不寫死三種：未知標籤排在最後，保留出現順序。
 */
export function countPullResultRarities(tiers: readonly (string | null | undefined)[]): Array<{ label: string; count: number }> {
    const counts = new Map<string, number>();
    for (const tier of tiers) {
        const label = pullResultRarityLabel(tier);
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts, ([label, count]) => ({ label, count }))
        .sort((a, b) => (RARITY_LABEL_RANK[b.label] ?? 0) - (RARITY_LABEL_RANK[a.label] ?? 0));
}

/**
 * 把統計條目分配到固定數量的統計列節點：前幾個各佔一格，最後一格收容剩下的（用全形空格接起來）。
 * 空格填空字串，不會留下殘字。
 */
export function raritySummarySlots(entries: readonly string[], slotCount: number): string[] {
    const slots: string[] = [];
    for (let i = 0; i < slotCount; i += 1) {
        slots.push(i === slotCount - 1 ? entries.slice(i).join('　') : (entries[i] ?? ''));
    }
    return slots;
}

/**
 * 頭像框實際顯示的寬高比：框的本地寬高乘上節點的世界縮放。
 * 父層若不是等比縮放，只用本地寬高裁切會把立繪壓扁，所以裁切比例要用世界縮放算。
 */
export function renderedBoxAspect(width: number, height: number, worldScaleX: number, worldScaleY: number): number {
    const w = Math.abs(width * worldScaleX);
    const h = Math.abs(height * worldScaleY);
    return w > 0 && h > 0 ? w / h : 1;
}

/** 等比縮放放進框內（object-fit: contain）；換結果主角立繪時用，與版面轉換的 contain 規則一致。 */
export function fitContain(boxWidth: number, boxHeight: number, naturalWidth: number, naturalHeight: number): { width: number; height: number } {
    const w = Math.max(1, naturalWidth || 1);
    const h = Math.max(1, naturalHeight || 1);
    const scale = Math.min(Math.max(1, boxWidth) / w, Math.max(1, boxHeight) / h);
    return { width: w * scale, height: h * scale };
}

/**
 * 把來源圖裁成指定寬高比（object-fit: cover）：多出來的邊切掉，水平置中、垂直靠上（頭像臉在上半）。
 * 回傳裁切矩形（相對來源圖左上角，單位像素）；結果卡頭像不拉伸、不留空。
 */
export function coverCropRect(srcWidth: number, srcHeight: number, aspect: number): { x: number; y: number; width: number; height: number } {
    const w = Math.max(1, srcWidth);
    const h = Math.max(1, srcHeight);
    const target = aspect > 0 ? aspect : w / h;
    if (w / h > target) {
        const cropW = h * target;
        return { x: (w - cropW) / 2, y: 0, width: cropW, height: h };
    }
    const cropH = w / target;
    return { x: 0, y: 0, width: w, height: cropH };
}
