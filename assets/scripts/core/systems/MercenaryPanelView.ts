// @spec-source → 傭兵系統（試用）文案表 UI_MERC_COUNTDOWN / UI_MERC_BOND / UI_MERC_CONFIRM / UI_MERC_FAREWELL / UI_MERC_NAMETAG；WBS MERC-07；PROG-2-0467
/**
 * MercenaryPanelView — 傭兵面板的文字與按鈕狀態（純邏輯，不依賴 cc）。
 *
 * - 倒數、結義進度、名牌（原主）文字依規格文案表產生。
 * - 結義按鈕只在可結義時開；點數不足時回報，不扣點。
 * - 已離隊（Expired）時只回傳告別文字。
 *
 * Unity 對照：像 Presenter 把 Model 轉成 Label 的 text 與 Button.interactable，畫面層不自己算。
 */
import { BOND_POINT_COST, BondRarity } from './MercenaryBondPermanent';
import { canBondMercenary, MercenaryState, TRIAL_DAYS } from './MercenaryBond';

export interface MercenaryPanelInput {
    /** 原主名字（名牌用） */
    originalOwnerName: string;
    /** 武將顯示名（確認與告別用） */
    generalName: string;
    /** 目前持有的結義點數 */
    bondPoints: number;
    /** 這位傭兵的稀有度，決定結義點數成本 */
    rarity: BondRarity;
}

export interface MercenaryPanelView {
    countdownText: string;
    bondText: string;
    nametagText: string;
    /** 可結義時才有確認文字 */
    confirmText: string | null;
    /** 已離隊時才有告別文字 */
    farewellText: string | null;
    bondEnabled: boolean;
    bondPointCost: number;
    insufficientPoints: boolean;
}

export function buildMercenaryPanelView(state: Readonly<MercenaryState>, input: Readonly<MercenaryPanelInput>): MercenaryPanelView {
    const cost = BOND_POINT_COST[input.rarity];
    const bondable = canBondMercenary(state);
    const insufficient = bondable && input.bondPoints < cost;
    return {
        countdownText: `結義倒數：${state.daysLeft} 日`,
        bondText: `結義進度：${state.bond}/${TRIAL_DAYS}`,
        nametagText: `原主：${input.originalOwnerName}`,
        confirmText: bondable ? `消耗 ${cost} 結義點數，將 ${input.generalName} 納為永久武將？` : null,
        farewellText: state.status === 'Expired' ? `${input.generalName} 已離隊。六日情緣，且作追憶。` : null,
        bondEnabled: bondable && !insufficient,
        bondPointCost: cost,
        insufficientPoints: insufficient,
    };
}
