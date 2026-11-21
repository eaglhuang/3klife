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
