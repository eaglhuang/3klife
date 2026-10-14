// @spec-source → WBS v5 OPEN-10（紅顏池與支援角色展示資料）；新手開場規格書（紅顏池與名將池分離）（PROG-2-0452，暫定）
/**
 * SupportPoolValidator — 紅顏池資料的一致性檢查，純 TS，不依賴 cc。
 *
 * 規則：紅顏池與名將池不可共用武將；紅顏候選必須在 support-cards 找得到；
 * 每張卡要有預覽台詞、至少一個效果標籤與立繪鍵；核心三位必須存在。
 * Unity 對照：像 Editor 裡的 OnValidate，資料進來先檢查，不通過就列出所有問題。
 */

export const CORE_SUPPORT_IDS = ['da-qiao', 'xiao-qiao', 'zhen-mi'] as const;

export interface PoolConfigLike {
    poolId: string;
    poolType: string;
    candidateIds: string[];
}

export interface SupportCardLike {
    id: string;
    previewLine?: string;
    effectTags?: string[];
    portraitKey?: string;
}

export interface SupportPoolIssue {
    path: string;
    message: string;
}

export function validateSupportPool(
    pools: readonly PoolConfigLike[],
    supportCards: readonly SupportCardLike[],
): SupportPoolIssue[] {
    const issues: SupportPoolIssue[] = [];
    const support = pools.find(p => p.poolType === 'support');
    const hero = pools.find(p => p.poolType === 'hero');
    if (!support) return [{ path: 'pools', message: '缺少紅顏池（poolType: support）' }];
    if (!hero) issues.push({ path: 'pools', message: '缺少名將池（poolType: hero），無法檢查分離' });

    const cardById = new Map(supportCards.map(c => [c.id, c] as const));
    for (const id of support.candidateIds) {
        const card = cardById.get(id);
        if (!card) {
            issues.push({ path: `support-pool.candidateIds`, message: `support-cards 中找不到 ${id}` });
            continue;
        }
        if (!card.previewLine || card.previewLine.trim() === '') issues.push({ path: `${id}.previewLine`, message: '缺少預覽台詞' });
        if (!card.effectTags || card.effectTags.length === 0) issues.push({ path: `${id}.effectTags`, message: '至少需要一個效果標籤' });
        if (!card.portraitKey) issues.push({ path: `${id}.portraitKey`, message: '缺少立繪鍵' });
    }

    if (hero) {
        const heroIds = new Set(hero.candidateIds);
        for (const id of support.candidateIds) {
            if (heroIds.has(id)) issues.push({ path: 'pools', message: `${id} 同時出現在紅顏池與名將池` });
        }
    }

    for (const coreId of CORE_SUPPORT_IDS) {
        if (!support.candidateIds.includes(coreId)) issues.push({ path: 'support-pool.candidateIds', message: `缺少核心紅顏 ${coreId}` });
    }
    return issues;
}
