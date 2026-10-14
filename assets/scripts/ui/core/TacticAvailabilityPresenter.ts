// @spec-source → 戰場適性系統.md §天氣對戰法與機制的強約束（Weather Constraints）；PROG-2-0408（HUD 戰法按鈕可用狀態）
/**
 * TacticAvailabilityPresenter — 每個戰法目前能不能施放、不能的話原因是什麼（純邏輯，不依賴 cc）
 *
 * 檢查順序與 BattleSkillTargetingFlow.beginPlayerSkillFlow 一致：計謀點 → SP → 天氣。
 * 只產生狀態與短文字，不碰節點；按鈕的變灰與文字由 BattleUIBridge / ActionCommandComposite 綁定。
 *
 * Unity 對照：Presenter 把 Model 判定轉成 Button 的 interactable 與 Label 字串，View 只負責套用。
 */
import { Weather } from '../../shared/CommonEnums';
import { checkTacticWeather } from '../../core/systems/WeatherTacticRestriction';

export const TACTIC_REASON_NO_POINTS = '計謀點不足';
export const TACTIC_REASON_NO_SP = 'SP 不足';
export const TACTIC_REASON_WEATHER = '天氣禁用';

export interface TacticAvailabilityInput {
    id: string;
    label: string;
    /** 戰法標籤（例如 fire），用來判定天氣強約束 */
    tags: readonly string[];
}

export interface TacticAvailabilityState {
    weather: Weather;
    tacticPointEnabled: boolean;
    generalCanUseSkill: boolean;
}

export interface TacticAvailability {
    id: string;
    label: string;
    enabled: boolean;
    /** 不能施放時的短原因；可以施放時為 null */
    reason: string | null;
}

export function buildTacticAvailability(
    tactics: readonly TacticAvailabilityInput[],
    state: TacticAvailabilityState,
): TacticAvailability[] {
    return tactics.map((tactic) => {
        if (!state.tacticPointEnabled) return { id: tactic.id, label: tactic.label, enabled: false, reason: TACTIC_REASON_NO_POINTS };
        if (!state.generalCanUseSkill) return { id: tactic.id, label: tactic.label, enabled: false, reason: TACTIC_REASON_NO_SP };
        const weather = checkTacticWeather(tactic.tags, state.weather);
        if (!weather.allowed) return { id: tactic.id, label: tactic.label, enabled: false, reason: TACTIC_REASON_WEATHER };
        return { id: tactic.id, label: tactic.label, enabled: true, reason: null };
    });
}
