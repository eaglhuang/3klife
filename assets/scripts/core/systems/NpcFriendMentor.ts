// @spec-source → 教官系統（支援卡）.md §L 好友借用教官；FriendBorrow.ts（MENT-14）；PROG-2-0723
/**
 * NpcFriendMentor — MVP 版「好友」：從資料表讀一組 NPC 好友教官（純邏輯，不依賴 cc）
 *
 * 真正的好友系統（好友清單、好友展示教官槽）屬 server 後續；這裡只把資料表的列轉成借用候選。
 * 暫定：好友名稱與候選卡皆取自 npc-friend-mentors.json，不代表任何真實玩家。
 */
import type { BorrowCandidate } from './FriendBorrow';

export interface NpcFriendMentor {
    friendId: string;
    displayName: string;
    supportTemplateId: string;
    isSSR: boolean;
    star: number;
}

/** 解析資料表：缺欄位、型別錯、星等不是有限正整數的列丟棄；同 friendId 只留第一筆 */
export function parseNpcFriendMentors(raw: { data?: unknown } | readonly unknown[] | null | undefined): NpcFriendMentor[] {
    const list = Array.isArray(raw) ? raw : (raw as { data?: unknown[] } | null | undefined)?.data ?? [];
    const seen = new Set<string>();
    const out: NpcFriendMentor[] = [];
    for (const item of list as Array<Partial<NpcFriendMentor>>) {
        if (!item || typeof item.friendId !== 'string' || seen.has(item.friendId)) continue;
        if (typeof item.displayName !== 'string' || typeof item.supportTemplateId !== 'string' || typeof item.isSSR !== 'boolean') continue;
        if (!Number.isInteger(item.star) || (item.star as number) < 0) continue;
        seen.add(item.friendId);
        out.push({ friendId: item.friendId, displayName: item.displayName, supportTemplateId: item.supportTemplateId, isSSR: item.isSSR, star: item.star as number });
    }
    return out;
}

/** 好友的借用候選：借用流程只需要卡 id、是否 SSR、當下星等 */
export function borrowCandidateOf(friend: NpcFriendMentor): BorrowCandidate {
    return { supportTemplateId: friend.supportTemplateId, isSSR: friend.isSSR, star: friend.star };
}
