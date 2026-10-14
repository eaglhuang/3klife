// @spec-source → 關卡設計系統.md §C-2 關卡節點欄位、§D-1 戰前偵查（PROG-2-0252，WBS LVL-01）
/**
 * StageChainNodes — 連環破主鏈的關卡節點表（純邏輯，不依賴 cc）
 *
 * 把 encounters.json 裡帶 chainId 的遭遇戰整理成規格 C-2 的六欄：
 * Stage_ID、Chain_ID、Boss、Theme、Required_Loadout、Preview_Intel。
 * Boss 直接用 enemyGeneralId；Preview_Intel 由程式推出，不另存一份資料，避免兩邊不同步。
 * 順序解鎖沿用 StageChainProgress.isStageUnlocked。
 *
 * Unity 對照：像一張 ScriptableObject 的關卡清單，Editor 階段用 Validate 按鈕檢查欄位是否填齊、順序是否正確。
 */
import { ChainStage } from './StageChainProgress';

/** encounters.json 中，與節點表有關的欄位 */
export interface EncounterChainSource {
    id: string;
    chainId?: string;
    order?: number;
    enemyGeneralId?: string;
    theme?: string;
    requiredLoadout?: readonly string[];
}

/** 規格 D-1：戰前偵查可揭露的欄位（Formation_Preview 正式隱藏，不放進來） */
export interface PreviewIntel {
    enemyName: string;
    coreMechanic: string;
    riskTags: string[];
    recommendedLoadout: string[];
}

export interface StageChainNode {
    stageId: string;
    chainId: string;
    order: number;
    boss: string;
    theme: string;
    requiredLoadout: string[];
    previewIntel: PreviewIntel;
}

/**
 * 從遭遇戰資料建立主鏈節點表（只取有 chainId 的）。
 * 依 chainId、order 排序；enemyName 由呼叫端的名稱查表提供，沒有時用 id。
 */
export function buildStageChainNodes(
    sources: readonly EncounterChainSource[],
    resolveName: (generalId: string) => string = (generalId) => generalId,
): StageChainNode[] {
    return sources
        .filter((source) => !!source.chainId)
        .map((source): StageChainNode => {
            const boss = source.enemyGeneralId ?? '';
            const theme = source.theme ?? '';
            const requiredLoadout = [...(source.requiredLoadout ?? [])];
            return {
                stageId: source.id,
                chainId: source.chainId!,
                order: source.order ?? 0,
                boss,
                theme,
                requiredLoadout,
                previewIntel: {
                    enemyName: boss ? resolveName(boss) : '',
                    coreMechanic: theme,
                    riskTags: [],
                    recommendedLoadout: requiredLoadout,
                },
            };
        })
        .sort((a, b) => (a.chainId === b.chainId ? a.order - b.order : a.chainId.localeCompare(b.chainId)));
}

/**
 * 驗證節點表，回傳錯誤訊息；空陣列代表通過。
 * - Stage_ID 不可重複
 * - Boss、Theme 不可空白
 * - 同一主鏈的 order 必須是 1..n 連續且不重複
 */
export function validateStageChainNodes(nodes: readonly StageChainNode[]): string[] {
    const errors: string[] = [];
    const seenIds = new Set<string>();
    for (const node of nodes) {
        if (seenIds.has(node.stageId)) errors.push(`${node.stageId}: Stage_ID 重複`);
        seenIds.add(node.stageId);
        if (!node.boss.trim()) errors.push(`${node.stageId}: 缺 Boss`);
        if (!node.theme.trim()) errors.push(`${node.stageId}: 缺 Theme`);
    }

    const byChain = new Map<string, StageChainNode[]>();
    for (const node of nodes) {
        const list = byChain.get(node.chainId) ?? [];
        list.push(node);
        byChain.set(node.chainId, list);
    }
    for (const [chainId, list] of byChain) {
        const orders = list.map((n) => n.order).sort((a, b) => a - b);
        const contiguous = orders.every((order, index) => order === index + 1);
        if (!contiguous) errors.push(`${chainId}: order 必須是 1..${list.length} 連續不重複，實際為 ${orders.join(',')}`);
    }
    return errors;
}

/** 轉成 StageChainProgress 需要的形狀，接上順序解鎖判定 */
export function toChainStages(nodes: readonly StageChainNode[]): ChainStage[] {
    return nodes.map((node) => ({ id: node.stageId, chainId: node.chainId, order: node.order }));
}
