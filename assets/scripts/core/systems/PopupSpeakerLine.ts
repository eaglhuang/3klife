// @spec-source → 彈窗武將頭像與台詞規格書 (doc_spec_1343)；PROG-2-10129
/**
 * PopupSpeakerLine — 少年投靠、名士占卜、家族血統樹三個彈窗的「頭像旁一句台詞」（純 TS，不依賴 cc）。
 *
 * 台詞樣板放 i18n（`ui.popup_speaker.<彈窗>.<性格>`），槽位 {self} 一律由 SpeakerVoice 依性別、性格、年齡代入，
 * 所以女將會自稱妾身／本姑娘／人家、少年自稱「我」，不要在樣板裡寫死某、老夫之類的自稱。
 * 同一彈窗、同一性格只有一句；換說話的人才會換句，不隨機。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import { fillSlots } from '../mind/MindLineTemplates';
import { voiceSlots, type VoiceProfile } from '../mind/SpeakerVoice';

export type PopupSpeakerKind = 'youth-pick' | 'sage-oracle' | 'bloodline-tree';

export const POPUP_SPEAKER_KINDS: readonly PopupSpeakerKind[] = ['youth-pick', 'sage-oracle', 'bloodline-tree'];
export const POPUP_SPEAKER_TYPES: readonly GeneralPersonalityType[] = ['Brave', 'Wise', 'Loyal', 'Playful'];

/** 連武將都查不到時的預設（義氣：語氣最中性） */
export const POPUP_SPEAKER_DEFAULT_TYPE: GeneralPersonalityType = 'Loyal';

/** 台詞 i18n 鍵 */
export function popupSpeakerLineKey(kind: PopupSpeakerKind, type: GeneralPersonalityType): string {
    return `ui.popup_speaker.${kind}.${type}`;
}

/** 名士的聲線：六位名士在名冊裡多半沒有性格欄位，這裡給固定設定（年長者用老夫） */
export const SAGE_VOICE: Readonly<Record<string, VoiceProfile>> = {
    'zhuge-liang': { gender: '男', type: 'Wise', age: 40 },
    'hua-tuo': { gender: '男', type: 'Loyal', age: 65 },
    'sima-hui': { gender: '男', type: 'Wise', age: 62 },
    'xu-shao': { gender: '男', type: 'Playful', age: 45 },
    'pang-tong': { gender: '男', type: 'Brave', age: 35 },
    'zuo-ci': { gender: '男', type: 'Playful', age: 70 },
};

/**
 * 取一句台詞。translate 取不到（回傳原鍵或空字串）時回空字串，呼叫端就不畫對話框，
 * 不用萬用句硬補（keep §3 fallback 原則）。
 */
export function popupSpeakerLine(
    kind: PopupSpeakerKind,
    profile: Readonly<VoiceProfile>,
    translate: (key: string) => string,
): string {
    const key = popupSpeakerLineKey(kind, profile.type ?? POPUP_SPEAKER_DEFAULT_TYPE);
    const template = translate(key);
    if (!template || template === key) return '';
    return fillSlots(template, voiceSlots(profile));
}

/** 名冊多半沒填性格：依武將 id 穩定雜湊挑一型，同一人永遠同一型，不同人才有不同口吻 */
export function popupTypeOfId(id: string): GeneralPersonalityType {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return POPUP_SPEAKER_TYPES[h % POPUP_SPEAKER_TYPES.length];
}

/** 名冊武將轉聲線欄位；找不到人（undefined）時只留 override，其餘走預設（男、義氣、成年） */
export function popupVoiceOf(
    general: Readonly<{ id?: string; gender?: string; age?: number; personality?: { type: GeneralPersonalityType } }> | undefined,
    override: Readonly<VoiceProfile> = {},
): VoiceProfile {
    return {
        gender: general?.gender,
        type: general?.personality?.type ?? (general?.id ? popupTypeOfId(general.id) : undefined),
        age: general?.age,
        ...override,
    };
}
