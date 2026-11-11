// @spec-source → 新手開場規格書 OPEN-05 / PROG-2-2236（issue #2086 第 2 項）
/**
 * 開場宿命轉蛋的十連名單 → 結果畫面要的條目。
 * 抽卡已在開場流程（DestinyGacha）完成並開局，這裡只轉成 PROG-2-2221 滿版結果畫面能直接顯示的資料，
 * 不扣貨幣、不寫抽卡紀錄。找不到資料的 id 略過，稀有度沒填時當 rare。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { LocalGachaResultEntry } from '../../core/services/LocalGachaService';

export const DESTINY_OPENING_RESULT_POOL_ID = 'hero-pool';

export function buildDestinyOpeningResults(
    rolledIds: readonly string[],
    generals: readonly GeneralConfig[],
): LocalGachaResultEntry[] {
    const byId = new Map(generals.map(general => [general.id, general]));
    const results: LocalGachaResultEntry[] = [];
    for (const id of rolledIds) {
        const general = byId.get(id);
        if (!general) continue;
        const rarityTier = general.rarityTier ?? 'rare';
        results.push({
            general,
            rarityTier,
            drawIndex: results.length + 1,
            displayText: `宿命轉蛋 #${results.length + 1} [${rarityTier}] ${general.name}`,
            poolId: DESTINY_OPENING_RESULT_POOL_ID,
            actionType: 'LOCAL_GACHA_PULL',
            currencyKey: 'gems',
        });
    }
    return results;
}
