// @spec-source → 使用者裁定 2026-11-23（武將名稱旁顯示縮小頭像）；PROG-2-9844
/**
 * GeneralNameTagModel — 武將名稱標籤（小頭像＋名字）的純邏輯（不依賴 cc）。
 *
 * 頭像只用已入遊戲的正式頭像路徑（GeneralArtPaths.avatarCandidates），不另搬美術庫檔案。
 * 頭像缺檔時由呼叫端改畫名字首字圓章。顏色走主題 token，缺 token 才用這裡的墊底值。
 */
import { avatarCandidates } from '../../core/systems/GeneralArtPaths';

/** 縮小頭像的邊長（設計像素） */
export const NAME_TAG_AVATAR_SIZE = 28;
/** 頭像與名字之間的間距 */
export const NAME_TAG_GAP = 6;

/** 主題 token 鍵（登錄於 ui-spec/themes/theme-registry.json 的 default 主題） */
export const NAME_TAG_TOKEN_KEYS = Object.freeze({
    ring: 'nameTag.ringColor',
    seal: 'nameTag.sealColor',
    sealText: 'nameTag.sealTextColor',
});

export interface NameTagStyle {
    readonly ringColor: string;
    readonly sealColor: string;
    readonly sealTextColor: string;
}

/** 主題缺 token 或格式錯誤時才使用；與 theme-registry default 的值相同 */
export const NAME_TAG_STYLE_FALLBACK: NameTagStyle = Object.freeze({
    ringColor: '#E8C88CA0',
    sealColor: '#A8322A',
    sealTextColor: '#FFF0D7',
});

const HEX_COLOR = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/** 名字首字（以 code point 取，避免切壞代理對）；空名回傳「?」。 */
export function nameTagInitial(name: string | null | undefined): string {
    const first = Array.from((name ?? '').trim())[0];
    return first ?? '?';
}

/** 頭像候選路徑（依序嘗試）；沒有武將 id 時回傳空陣列，呼叫端直接畫首字圓章。 */
export function nameTagAvatarCandidates(generalId: string | null | undefined): string[] {
    const id = (generalId ?? '').trim();
    return id ? avatarCandidates(id) : [];
}

/** 由主題 token 查表解析標籤樣式；格式不合的值退回墊底色。 */
export function resolveNameTagStyle(lookup: (key: string) => string | number | undefined): NameTagStyle {
    const pick = (key: string, fallback: string): string => {
        const value = lookup(key);
        return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback;
    };
    return {
        ringColor: pick(NAME_TAG_TOKEN_KEYS.ring, NAME_TAG_STYLE_FALLBACK.ringColor),
        sealColor: pick(NAME_TAG_TOKEN_KEYS.seal, NAME_TAG_STYLE_FALLBACK.sealColor),
        sealTextColor: pick(NAME_TAG_TOKEN_KEYS.sealText, NAME_TAG_STYLE_FALLBACK.sealTextColor),
    };
}
