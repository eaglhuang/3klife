// @spec-source → 轉職與宿命系統.md §E-4 職能 UI 標籤（武官🔴／文官🔵／雙職能🟡）（PROG-2-1724）
/**
 * CareerTag — 武將職能標籤（純邏輯，不依賴 cc）
 *
 * - 5 歲宿命分流前（或年齡不明）沒有職能，不顯示標籤。
 * - 主職沿用 JobChangeWiring.resolvePrimaryClass（primaryClass → careerClass → 暫定後備），與退役分流同一套判定。
 * - 20 歲轉職追加了與主職不同的副職即為雙職能。
 * - 顏色依規格：武官紅、文官藍、雙職能黃；色碼為暫定，美術定稿後替換本表。
 *
 * Unity 對照：像 enum + ScriptableObject 對照表，UI 只拿 kind 去查文字與顏色。
 */
import { resolvePrimaryClass, type JobWiringGeneral } from './JobChangeWiring';
import { UNVEILING_AGE } from './Unveiling';

export type CareerTagKind = 'warrior' | 'scholar' | 'dual';

export const CAREER_TAG_LABEL: Readonly<Record<CareerTagKind, string>> = {
    warrior: '武官',
    scholar: '文官',
    dual: '雙職能',
};

/** 暫定色碼：武官紅、文官藍、雙職能黃 */
export const CAREER_TAG_COLOR: Readonly<Record<CareerTagKind, string>> = {
    warrior: '#C0392B',
    scholar: '#2E6FB7',
    dual: '#C9A227',
};

/** 武將的職能標籤；未滿宿命分流年齡或年齡不明回傳 null */
export function careerTagOf(general: JobWiringGeneral): CareerTagKind | null {
    if (typeof general.age !== 'number' || general.age < UNVEILING_AGE) return null;
    const primary = resolvePrimaryClass(general);
    if (general.subClass && general.subClass !== primary) return 'dual';
    return primary === 'Warrior' ? 'warrior' : 'scholar';
}

/** 職能標籤文字；沒有職能時回傳空字串 */
export function careerTagLabelOf(general: JobWiringGeneral): string {
    const kind = careerTagOf(general);
    return kind ? CAREER_TAG_LABEL[kind] : '';
}
