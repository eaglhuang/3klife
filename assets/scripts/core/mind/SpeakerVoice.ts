// @spec-source → 武將台詞性別化（PROG-2-10083）：全遊戲台詞共用的「第一人稱／稱呼」查表
/**
 * 台詞發話者的聲線：依性別＋性格＋年齡層決定第一人稱，純 TS、同輸入同輸出。
 * 所有台詞模板（心智、大廳泡泡、事件、AI prompt）都用 {self} 佔位，由這裡統一代入，
 * 不要各處再寫死「某」「老夫」之類的自稱。
 * 男：某（勇／智／忠）、咱（玩）；女：妾身（智／忠）、本姑娘（勇）、人家（玩）；未滿 16 歲不分男女用「我」；60 歲以上男「老夫」、女「老身」。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';

export type VoiceGender = 'M' | 'F';
export type VoiceAgeGroup = 'CHILD' | 'ADULT' | 'ELDER';

export interface VoiceProfile {
    /** 名冊的 gender 欄（'男'／'女'，也容許 'F'／'female'）；缺值視為男（舊資料預設） */
    gender?: string;
    type?: GeneralPersonalityType;
    age?: number;
}

/** 少年門檻：與學府入學年齡一致，未滿此歲數一律用「我」 */
export const VOICE_ADULT_AGE = 16;

export function voiceGenderOf(gender: string | undefined): VoiceGender {
    if (gender === undefined) return 'M';
    const g = gender.trim().toLowerCase();
    return g === '女' || g === 'f' || g === 'female' ? 'F' : 'M';
}

/** 年長門檻：滿此歲數男用「老夫」、女用「老身」 */
export const VOICE_ELDER_AGE = 60;

export function voiceAgeGroupOf(age: number | undefined): VoiceAgeGroup {
    if (age === undefined || !Number.isFinite(age)) return 'ADULT';
    if (age < VOICE_ADULT_AGE) return 'CHILD';
    return age >= VOICE_ELDER_AGE ? 'ELDER' : 'ADULT';
}

const SELF_MALE: Readonly<Record<GeneralPersonalityType, string>> = { Brave: '某', Wise: '某', Loyal: '某', Playful: '咱' };
const SELF_FEMALE: Readonly<Record<GeneralPersonalityType, string>> = { Brave: '本姑娘', Wise: '妾身', Loyal: '妾身', Playful: '人家' };

/** 第一人稱自稱 */
export function selfOf(profile: Readonly<VoiceProfile>): string {
    const group = voiceAgeGroupOf(profile.age);
    if (group === 'CHILD') return '我';
    if (group === 'ELDER') return voiceGenderOf(profile.gender) === 'F' ? '老身' : '老夫';
    const type = profile.type ?? 'Loyal';
    return (voiceGenderOf(profile.gender) === 'F' ? SELF_FEMALE : SELF_MALE)[type];
}

/** 要併進台詞槽位的聲線欄位；目前只有 self，之後加稱呼／語尾也從這裡出 */
export function voiceSlots(profile: Readonly<VoiceProfile>): Record<string, string> {
    return { self: selfOf(profile) };
}

/** 把槽位裡的 gender／age 字串（槽位只能放字串）轉成聲線欄位；槽位已有 self 就不覆蓋 */
export function withVoiceSlots(slots: Readonly<Record<string, string>>, type: GeneralPersonalityType): Record<string, string> {
    if (slots.self !== undefined) return { ...slots };
    const age = slots.age === undefined || slots.age === '' ? undefined : Number(slots.age);
    return { ...voiceSlots({ gender: slots.gender, type, age }), ...slots };
}
