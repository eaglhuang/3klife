// @spec-source → 血統樹14人UI規格書 §3.4 效能防呆；WBS BUI-07；PROG-2-2079
/**
 * BloodlineTreeAvatarBudget — 血統樹頭像的貼圖預算（純邏輯，不依賴 cc）。
 *
 * - 規格 §3.4：同一畫面塞 15 張頭像會讓 DrawCall 與貼圖記憶體暴增，
 *   只讓底下 3 人（父母＋子代）掛真實 SpriteFrame，1、2 代先祖統一用共用低解析度圖示。
 * - 共用圖示沿用未知頭像剪影（男／女各一張），整棵樹最多多出 2 張貼圖。
 * - 虛擬祖先與佚名祖位沒有畫像，不掛圖（沿用 BloodlineTreeSlots.ancestorAvatarId）。
 *
 * Unity 對照：像 UI 只對前景三格用獨立 Texture，其他格共用同一張 Atlas 圖示來壓 Batch 數。
 */
import { ancestorAvatarId } from './BloodlineTreeSlots';

export type TreeAvatarSource = 'REAL' | 'SHARED_ICON' | 'NONE';

/** 掛真實頭像的排：3 = 父母（子代頭像在命頁標頭，不在樹上） */
export const TREE_REAL_AVATAR_ROWS: readonly number[] = [3];

/** 預算：真實頭像最多 2 張（父母），共用圖示最多 2 張貼圖（男／女） */
export const TREE_AVATAR_BUDGET = { realMax: 2, sharedIconTextureMax: 2 } as const;

export function treeAvatarSource(
    row: number,
    person: { uid: string; is_virtual?: boolean } | null | undefined,
): TreeAvatarSource {
    if (!ancestorAvatarId(person)) return 'NONE';
    return TREE_REAL_AVATAR_ROWS.includes(row) ? 'REAL' : 'SHARED_ICON';
}

export interface TreeAvatarCount {
    real: number;
    sharedIcon: number;
    none: number;
}

/** 統計一棵樹各來源的格數，供預算檢查與測試 */
export function countTreeAvatars(
    cells: readonly { row: number; person: { uid: string; is_virtual?: boolean } | null | undefined }[],
): TreeAvatarCount {
    const count: TreeAvatarCount = { real: 0, sharedIcon: 0, none: 0 };
    for (const cell of cells) {
        const source = treeAvatarSource(cell.row, cell.person);
        if (source === 'REAL') count.real++;
        else if (source === 'SHARED_ICON') count.sharedIcon++;
        else count.none++;
    }
    return count;
}
