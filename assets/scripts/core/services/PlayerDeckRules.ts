// @spec-source → MVP遊戲驗證規格書.md (doc_spec_0045)、戰場虎符手牌（PROG-2-0022）
/**
 * PlayerDeckRules — 玩家出戰卡組的純規則（不依賴 cc）
 *
 * 卡組 = 虎符卡片 ID（即 tacticId）的有序清單，進戰場時原樣放進 IBattleEntryParams.selectedCardIds。
 * 這裡只管「清單合不合法」與「點一下加入 / 移除」，卡片目錄由呼叫端以 catalogIds 傳入，
 * 避免 core 反向依賴 battle。
 *
 * Unity 對照：像 DeckBuilder.cs 的 static helper，輸入 List<string> 輸出整理過的 List<string>，
 * 不碰 MonoBehaviour，EditMode Test 就能跑。
 */

/** 出戰卡組上限，與戰場手牌上限（TALLY_HAND_SIZE）一致 */
export const PLAYER_DECK_MAX_SIZE = 4;

export type DeckToggleOutcome = 'added' | 'removed' | 'full' | 'unknown';

export interface DeckToggleResult {
    deck: string[];
    outcome: DeckToggleOutcome;
}

/**
 * 整理卡組：去掉非字串 / 空字串 / 重複 / 不在目錄內的 ID，並截到上限。
 * catalogIds 省略時不檢查目錄（讀檔時用，目錄之後可能增減，未知 ID 留給戰場端警告並略過）。
 */
export function normalizeDeck(
    ids: readonly unknown[] | null | undefined,
    catalogIds?: readonly string[],
    maxSize: number = PLAYER_DECK_MAX_SIZE,
): string[] {
    const allowed = catalogIds ? new Set(catalogIds) : null;
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of ids ?? []) {
        if (typeof id !== 'string' || id.length === 0 || seen.has(id)) {
            continue;
        }
        if (allowed && !allowed.has(id)) {
            continue;
        }
        seen.add(id);
        result.push(id);
        if (result.length >= maxSize) {
            break;
        }
    }
    return result;
}

/** 點一張卡：已在卡組就移除，不在就加到最後；卡組已滿或不在目錄內則不變 */
export function toggleDeckCard(
    deck: readonly string[],
    cardId: string,
    catalogIds: readonly string[],
    maxSize: number = PLAYER_DECK_MAX_SIZE,
): DeckToggleResult {
    const current = normalizeDeck(deck, undefined, maxSize);
    if (current.includes(cardId)) {
        return { deck: current.filter((id) => id !== cardId), outcome: 'removed' };
    }
    if (!catalogIds.includes(cardId)) {
        return { deck: current, outcome: 'unknown' };
    }
    if (current.length >= maxSize) {
        return { deck: current, outcome: 'full' };
    }
    return { deck: [...current, cardId], outcome: 'added' };
}
