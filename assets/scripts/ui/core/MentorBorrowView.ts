// @spec-source → 培育系統.md（好友借用教官，MENT-14）；PROG-2-0746（選擇畫面視圖模型）
/**
 * MentorBorrowView — 好友借用教官的選擇列（純邏輯，不依賴 cc）
 *
 * 把好友清單與每位好友的借用檢查結果轉成畫面列：可借或擋下的原因。
 * 借用檢查由呼叫端注入（GameSession 用 canBorrow），這裡不碰帳本。
 * 文案缺 key 時退回 zh-TW 預設（同 UltimateTexts 的模式）。
 *
 * Unity 對照：像 Presenter，把 Model 的檢查結果轉成 ListView 的 ItemData。
 */
import type { BorrowBlockReason } from '../../core/systems/FriendBorrow';
import type { NpcFriendMentor } from '../../core/systems/NpcFriendMentor';

export const MENTOR_BORROW_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.general.mentor.borrow.star': '★{0}',
    'ui.general.mentor.borrow.ssr': 'SSR',
    'ui.general.mentor.borrow.ok': '可借用',
    'ui.general.mentor.borrow.blocked.SELF_BORROW': '不能借用自己的教官',
    'ui.general.mentor.borrow.blocked.NOT_SSR': '只能借用 SSR 教官',
    'ui.general.mentor.borrow.blocked.DAILY_LIMIT': '今天已借過一次',
    'ui.general.mentor.borrow.blocked.SAME_CARD_TODAY': '今天已借過這張卡',
    'ui.general.mentor.borrow.blocked.CARD_LOCKED': '這張卡仍在培育中',
};

export type MentorBorrowTextLookup = (key: string) => string;

const IDENTITY_LOOKUP: MentorBorrowTextLookup = (key) => key;

function textOf(lookup: MentorBorrowTextLookup, key: string, ...args: (string | number)[]): string {
    const localized = lookup(key);
    const template = localized === key ? (MENTOR_BORROW_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}

export interface MentorBorrowRow {
    friendId: string;
    name: string;
    /** 例如 SSR ★3；非 SSR 不顯示 SSR 字樣 */
    rankText: string;
    enabled: boolean;
    /** 可借時是「可借用」，擋下時是原因 */
    statusText: string;
}

/** 好友清單轉選擇列。check 回傳 null 代表可借，否則是擋下原因 */
export function mentorBorrowRows(
    friends: readonly NpcFriendMentor[],
    check: (friend: NpcFriendMentor) => BorrowBlockReason | null,
    lookup: MentorBorrowTextLookup = IDENTITY_LOOKUP,
): MentorBorrowRow[] {
    return friends.map((friend) => {
        const blocked = check(friend);
        const rankText = [friend.isSSR ? textOf(lookup, 'ui.general.mentor.borrow.ssr') : null, textOf(lookup, 'ui.general.mentor.borrow.star', friend.star)]
            .filter((part): part is string => part !== null)
            .join(' ');
        return {
            friendId: friend.friendId,
            name: friend.displayName,
            rankText,
            enabled: blocked === null,
            statusText: blocked === null
                ? textOf(lookup, 'ui.general.mentor.borrow.ok')
                : textOf(lookup, `ui.general.mentor.borrow.blocked.${blocked}`),
        };
    });
}
