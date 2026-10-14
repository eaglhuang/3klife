// @spec-source → 新手開場規格書 第四幕（紅顏登場：與名將池分離）、5.4；WBS OPEN-10；PROG-2-0466
/**
 * RedFaceShowcase — 紅顏池展示列資料（純邏輯，不依賴 cc）。
 *
 * - 只取紅顏池（support）的候選，排除與名將池重疊的武將（規格：名將與紅顏不得混雜）。
 * - 核心三位（大喬、小喬、甄姬）置頂，其餘保持池內原順序。
 * - 找不到卡資料的候選略過，不丟錯。
 *
 * Unity 對照：像 ScrollView 的資料來源（DataSource），先 Filter 再把精選項目排到最前。
 */

export const RED_FACE_CORE_IDS = ['da-qiao', 'xiao-qiao', 'zhen-mi'] as const;

export interface RedFacePoolLike {
    candidateIds: readonly string[];
}

export interface RedFaceCardLike {
    id: string;
    name?: string;
    previewLine?: string;
    effectTags?: readonly string[];
    portraitKey?: string;
}

export interface RedFaceShowcaseRow {
    id: string;
    name: string;
    previewLine: string;
    effectTags: string[];
    portraitKey: string;
    isCore: boolean;
}

export function buildRedFaceShowcase(
    pool: Readonly<RedFacePoolLike>,
    cards: readonly RedFaceCardLike[],
    generalPoolIds: readonly string[],
): RedFaceShowcaseRow[] {
    const cardById = new Map(cards.map((card) => [card.id, card] as const));
    const generalIds = new Set(generalPoolIds);
    const rows: RedFaceShowcaseRow[] = [];
    for (const id of pool.candidateIds) {
        if (generalIds.has(id)) continue;
        const card = cardById.get(id);
        if (!card) continue;
        rows.push({
            id,
            name: card.name ?? id,
            previewLine: card.previewLine ?? '',
            effectTags: [...(card.effectTags ?? [])],
            portraitKey: card.portraitKey ?? '',
            isCore: (RED_FACE_CORE_IDS as readonly string[]).includes(id),
        });
    }
    return [...rows.filter((row) => row.isCore), ...rows.filter((row) => !row.isCore)];
}
