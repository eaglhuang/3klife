// @spec-source → 戰法場景規格書.md (doc_spec_0039) §E 垂直能量條；關卡設計系統.md (doc_spec_0049) §D-4 軍師 HUD；PROG-2-1851
/**
 * StrategistHudView — 戰場軍師 HUD 的顯示內容（純邏輯，不依賴 cc）
 *
 * 摘要文字與戰場日誌同一份，面板只負責套上去。
 */
import { strategistHudLogLine, type StrategistHudInput } from '../../core/systems/StrategistHud';
import { wisdomFillRatio, wisdomMeterText } from './WisdomMeter';

export interface StrategistHudView {
    /** 軍師摘要；四欄都空時為空字串，面板隱藏摘要條 */
    summaryText: string;
    /** 「智謀 45/100」 */
    wisdomText: string;
    /** 能量條填充比例 0~1 */
    wisdomRatio: number;
}

export function strategistHudViewOf(input: StrategistHudInput, wisdomMeter: number): StrategistHudView {
    return {
        summaryText: strategistHudLogLine(input),
        wisdomText: wisdomMeterText(wisdomMeter),
        wisdomRatio: wisdomFillRatio(wisdomMeter),
    };
}
