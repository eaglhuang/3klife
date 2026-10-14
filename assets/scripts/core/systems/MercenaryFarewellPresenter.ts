// @spec-source → WBS v3 MERC-05（退場流程與告別信）；文字鍵 UI_MERC_FAREWELL（MercenaryDeparture.FAREWELL_TEXT_KEY）
/**
 * MercenaryFarewellPresenter — 傭兵離隊告別信的文字組裝，純邏輯，不依賴 cc。
 *
 * 只產出標題與內文字串，不碰 UI；Cocos View 負責把它顯示成信件。
 * 文字為暫定，待文案確認後再換成多語系字串表。
 * Unity 對照：像 Presenter 把 Model 轉成 ViewModel，View 只綁定字串，不做判斷。
 */
import type { DepartureReason } from './MercenaryDeparture';

export interface FarewellLetterView {
    title: string;
    body: string;
}

const REASON_BODY: Readonly<Record<DepartureReason, string>> = Object.freeze({
    'trial-expired': '六日試用期滿，未能與您結義，只得告辭離去。日後若有機會，願再為您效力。',
    'upkeep-unpaid': '欠薪已久，無以為繼，只得告辭離去。若日後薪餉足備，願再來投效。',
});

/** 組裝告別信：依離隊原因帶出不同內文，武將名稱由呼叫端傳入。 */
export function buildFarewellLetter(generalName: string, reason: DepartureReason): FarewellLetterView {
    return {
        title: `${generalName} 的告別信`,
        body: REASON_BODY[reason],
    };
}
