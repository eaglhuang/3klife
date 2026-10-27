// @spec-source → 血統樹14人UI規格書 §2.2 樹狀資料子節點、§3.3 資料流、§3.4 效能防呆；BUI-02；PROG-2-1028
/**
 * BloodlineNodeCards — 血統樹 14 位先祖的節點卡資料映射（純邏輯，不依賴 cc）。
 *
 * - 依 PEDIGREE_SLOTS 固定順序產出 14 張卡，不依賴資料來源的插入順序。
 * - 規格的排列：上排 8 人（slot 長度 3）、中排 4 人、下排 2 人（父母）。
 * - 只有父母掛真立繪，其餘先祖用共用低解析度 icon（§3.4），資源載入由 BUI-07 另卡處理。
 * - 來源缺資料或名稱為空時回傳 empty 卡，不拋例外。
 *
 * Unity 對照：像 Prefab 列表實例化，數量與順序由 Layout 固定，每張卡只吃自己那一筆資料；
 * 資料缺了就留空的 Slot，不會讓整排報錯。
 */
import { PEDIGREE_SLOTS, pedigreeSlotGeneration, type PedigreeSlot } from '../services/BloodlineGraph';

export const NODE_CARD_ICON = 'shared-low-res-icon';

export interface AncestorGene {
    label: string;
    colorCode: string;
}

export interface AncestorStats {
    force: number;
    command: number;
}

/** 單一先祖的來源資料，由上層 presenter 從武將資料組出。 */
export interface AncestorSource {
    name: string;
    location: string;
    factorStars: number;
    portraitPath?: string | null;
    stats: AncestorStats;
    genes: readonly AncestorGene[];
    tags: readonly string[];
}

export type NodePortrait = { kind: 'SPRITE'; path: string } | { kind: 'ICON'; key: string };

export type NodeCardView =
    | { slot: PedigreeSlot; row: 1 | 2 | 3; empty: true }
    | {
          slot: PedigreeSlot;
          row: 1 | 2 | 3;
          empty: false;
          name: string;
          location: string;
          factorStars: number;
          portrait: NodePortrait;
          stats: AncestorStats;
          genes: AncestorGene[];
          tags: string[];
      };

/**
 * 產出 14 張先祖卡，順序與規格一致。
 * row：1 = 上排 8 人（三代祖先）、2 = 中排 4 人（祖父母）、3 = 下排 2 人（父母）。
 */
export function buildNodeCards(sources: Partial<Record<PedigreeSlot, AncestorSource | null>>): NodeCardView[] {
    return PEDIGREE_SLOTS.map((slot) => {
        const row = (4 - pedigreeSlotGeneration(slot)) as 1 | 2 | 3;
        const source = sources[slot];
        if (!source || source.name.trim().length === 0) {
            return { slot, row, empty: true };
        }
        const isParent = slot === 'F' || slot === 'M';
        return {
            slot,
            row,
            empty: false,
            name: source.name,
            location: source.location,
            factorStars: normalizeStars(source.factorStars),
            portrait: isParent && source.portraitPath
                ? { kind: 'SPRITE', path: source.portraitPath }
                : { kind: 'ICON', key: NODE_CARD_ICON },
            stats: { ...source.stats },
            genes: source.genes.map((gene) => ({ ...gene })),
            tags: [...source.tags],
        };
    });
}

function normalizeStars(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
}
