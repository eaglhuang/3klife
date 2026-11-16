// @spec-source → 戰場適性系統.md §天氣對戰法與機制的強約束（Weather Constraints）；PROG-2-0408（HUD 戰法按鈕可用狀態）
/**
 * TacticAvailabilityPresenter — 每個戰法目前能不能施放、不能的話原因是什麼（純邏輯，不依賴 cc）
 *
 * 檢查順序與 BattleSkillTargetingFlow.beginPlayerSkillFlow 一致：計謀點 → SP → 天氣 → 戰法自己的施放條件。
 * 只產生狀態與短文字，不碰節點；按鈕的變灰與文字由 BattleUIBridge / ActionCommandComposite 綁定。
 *
 * Unity 對照：Presenter 把 Model 判定轉成 Button 的 interactable 與 Label 字串，View 只負責套用。
 */
import { Weather } from '../../shared/CommonEnums';
import { checkTacticWeather } from '../../core/systems/WeatherTacticRestriction';
import { describeTacticCondition, type TacticCondition } from '../../core/systems/TacticCondition';

export const TACTIC_REASON_NO_POINTS = '計謀點不足';
export const TACTIC_REASON_NO_SP = 'SP 不足';
export const TACTIC_REASON_WEATHER = '天氣禁用';

export interface TacticAvailabilityInput {
    id: string;
    label: string;
    /** 戰法標籤（例如 fire），用來判定天氣強約束 */
    tags: readonly string[];
    /** 這個戰法目前沒達成的施放條件（例如火攻要起風）；都達成時不給（PROG-2-9333） */
    unmetCondition?: TacticCondition | null;
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
    /** 兩個字的原因，寫在計謀鈕第二行；沒有時按鈕寫「受限」 */
    shortReason?: string;
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
        if (tactic.unmetCondition) {
            const text = describeTacticCondition(tactic.unmetCondition);
            return { id: tactic.id, label: tactic.label, enabled: false, reason: text.full, shortReason: text.short };
        }
        return { id: tactic.id, label: tactic.label, enabled: true, reason: null };
    });
}
