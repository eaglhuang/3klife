// @spec-source → 世家總覽英靈陳列室與雙卡戰後結算介面規格書 (doc_spec_0632) §3 DualCardSettlement；WBS SPI-12；PROG-2-2083
/**
 * DualCardSettlement — 名將陣亡後的「雙卡結算」彈窗資料（純邏輯，不依賴 cc）。
 *
 * - 英靈卡與虎符是兩條獨立產出線：只產其一時，另一半為 null，彈窗只演那一張。
 * - 英靈卡數值取死亡快照 Final_Stats（str/int/lea/pol/cha 轉成規格的 war/int/lead/pol/cha）。
 * - 虎符適性取武將 troopAptitude 對該兵種的等級。
 *
 * 暫定：
 * - legendaryDeeds 先留空：死亡結算當下拿不到戰報，事蹟摘要（SpiritArchiveSnapshot）另卡接。
 * - 武將沒有該兵種適性時 aptitudeTier 為空字串，由畫面決定不顯示。
 * Unity 對照：像戰後結算的 DTO，給 UI 彈窗佇列消費。
 */
import type { TigerTallyCard } from '../models/TigerTallyCard';
import type { InventoryRecord } from './InventoryProjection';
import { spiritCardIdOf } from './SpiritCardDeathSettlement';

export interface DualCardFinalStats { lead: number; war: number; int: number; pol: number; cha: number }

export interface DualCardSettlementPayload {
    fallenGeneralId: string;
    generalName: string;
    spiritCard: { cardId: string; finalStats: DualCardFinalStats; legendaryDeeds: string[] } | null;
    tigerTally: { tallyId: string; troopType: string; aptitudeTier: string } | null;
}

export interface DualCardFallenGeneral {
    id: string;
    templateId?: string;
    name?: string;
    troopAptitude?: Record<string, string>;
}

export interface DualCardSettlementInput {
    fallen: readonly DualCardFallenGeneral[];
    /** 這次產出或覆蓋英靈卡的模板 id */
    spiritTemplateIds: readonly string[];
    spiritRecords: readonly InventoryRecord[];
    /** 這次新產出的虎符 */
    producedTallies: readonly TigerTallyCard[];
}

/** 規格欄位 → 快照欄位 */
const STAT_MAP: Readonly<Record<keyof DualCardFinalStats, string>> = { lead: 'lea', war: 'str', int: 'int', pol: 'pol', cha: 'cha' };

function finalStatsOf(record: InventoryRecord | undefined): DualCardFinalStats {
    const raw = (record?.Attributes?.['Final_Stats'] ?? {}) as Record<string, unknown>;
    const out: DualCardFinalStats = { lead: 0, war: 0, int: 0, pol: 0, cha: 0 };
    for (const key of Object.keys(STAT_MAP) as (keyof DualCardFinalStats)[]) {
        const value = raw[STAT_MAP[key]];
        out[key] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }
    return out;
}

/** 依陣亡名單順序，每位至少產出一張卡才列入 */
export function buildDualCardSettlements(input: DualCardSettlementInput): DualCardSettlementPayload[] {
    const spiritIds = new Set(input.spiritTemplateIds);
    const payloads: DualCardSettlementPayload[] = [];
    for (const general of input.fallen) {
        const templateId = general.templateId ?? general.id;
        const tally = input.producedTallies.find((card) => card.sourceGeneralUid === general.id);
        const hasSpirit = spiritIds.has(templateId);
        if (!hasSpirit && !tally) continue;
        const cardId = spiritCardIdOf(templateId);
        const troopType = tally?.troopType ?? '';
        payloads.push({
            fallenGeneralId: general.id,
            generalName: general.name ?? general.id,
            spiritCard: hasSpirit
                ? { cardId, finalStats: finalStatsOf(input.spiritRecords.find((r) => r.Inventory_ID === cardId)), legendaryDeeds: [] }
                : null,
            tigerTally: tally ? { tallyId: tally.uid, troopType, aptitudeTier: general.troopAptitude?.[troopType] ?? '' } : null,
        });
    }
    return payloads;
}
