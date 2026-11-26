// @spec-source → 新手前 10～20 分鐘稽核 C6；PROG-2-10068
/**
 * 信箱裡「季報紀要」列的畫面資料（純 TS，不依賴 cc，可單元測試）。
 * 文字走 i18n（四語系 key 在 assets/resources/i18n/*.json），查不到時退回 zh-TW 預設。
 * Unity 對照：ViewModel；MindRequestPanel 只負責把它畫出來。
 */
import type { SeasonDigestNote } from '../../../core/systems/SeasonDigest';

/** 等同 services().i18n.t：查不到時回傳 key 本身 */
export type DigestTextLookup = (key: string, ...args: string[]) => string;

interface DigestEntry { key: string; fallback: string }

export const SEASON_DIGEST_TEXTS = Object.freeze({
    kind: { key: 'ui.season_digest.kind', fallback: '季報紀要' },
    mission: { key: 'ui.season_digest.mission', fallback: '任務回報彙整：本季完成 {0} 件、成功 {1} 件。\n{2}' },
    chronicleEncounter: { key: 'ui.season_digest.chronicle_encounter', fallback: '【天下大勢】{0}\n【市井奇遇】{1}：{2}\n不急，想接就點「去看看」，不接就當沒看到。' },
    chroniclePlain: { key: 'ui.season_digest.chronicle_plain', fallback: '【天下大勢】{0}\n本季街上沒有奇遇，只有一堆八卦。' },
    open: { key: 'ui.season_digest.btn_open', fallback: '去看看' },
    ack: { key: 'ui.season_digest.btn_ack', fallback: '知道了' },
    unread: { key: 'ui.season_digest.unread', fallback: '新' },
    mailboxTitle: { key: 'ui.season_digest.mailbox_title', fallback: '季報信箱' },
    mailboxEntry: { key: 'ui.season_digest.mailbox_entry', fallback: '季報信箱' },
    toast: { key: 'ui.season_digest.toast', fallback: '任務回報和市井奇遇先收進右下角「信箱」了，不急著看，報表不會跑。' },
});

export function digestText(lookup: DigestTextLookup | undefined, entry: DigestEntry, ...args: string[]): string {
    const localized = lookup ? lookup(entry.key, ...args) : entry.key;
    if (localized !== entry.key) return localized;
    return entry.fallback.replace(/\{(\d+)\}/g, (_match, index: string) => args[Number(index)] ?? '');
}

export interface SeasonDigestRowView {
    id: string;
    kindLabel: string;
    text: string;
    unread: boolean;
    /** 有可開的下一步（市井奇遇尚未抉擇時開三國季報） */
    canOpen: boolean;
    openLabel: string;
    ackLabel: string;
}

/**
 * 紀要列：未讀在前、同為未讀或已讀時新的在前。
 * encounterOpen 回傳該紀要對應的市井奇遇是否還能抉擇（由宿主查季報狀態）。
 */
export function buildDigestRows(
    notes: readonly SeasonDigestNote[],
    lookup?: DigestTextLookup,
    encounterOpen: (note: SeasonDigestNote) => boolean = () => false,
): SeasonDigestRowView[] {
    return notes
        .slice()
        .sort((a, b) => Number(a.read) - Number(b.read) || b.season - a.season)
        .map((note) => {
            const [a = '', b = '', c = ''] = note.args;
            const text = note.kind === 'mission'
                ? digestText(lookup, SEASON_DIGEST_TEXTS.mission, a, b, c).trimEnd()
                : b.length > 0
                    ? digestText(lookup, SEASON_DIGEST_TEXTS.chronicleEncounter, a, b, c)
                    : digestText(lookup, SEASON_DIGEST_TEXTS.chroniclePlain, a);
            return {
                id: note.id,
                kindLabel: digestText(lookup, SEASON_DIGEST_TEXTS.kind),
                text,
                unread: !note.read,
                canOpen: note.kind === 'chronicle' && encounterOpen(note),
                openLabel: digestText(lookup, SEASON_DIGEST_TEXTS.open),
                ackLabel: digestText(lookup, SEASON_DIGEST_TEXTS.ack),
            };
        });
}
