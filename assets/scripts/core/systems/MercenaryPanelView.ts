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
import { ILLUSTRATION_STAGE_MAX, ILLUSTRATION_STAGE_MIN } from './MercenaryIllustration';
import { AFFECTION_CAP } from './MercenaryAffection';
import { evaluateOath, oathConditionLines, oathText, SWORN_MORALE_BONUS, type OathTextLookup } from './MercenaryOath';

export interface MercenaryPanelInput {
    /** 原主名字（名牌用） */
    originalOwnerName: string;
    /** 武將顯示名（確認與告別用） */
    generalName: string;
    /** 目前持有的結義點數 */
    bondPoints: number;
    /** 這位傭兵的稀有度，決定結義點數成本 */
    rarity: BondRarity;
    /** 文案查詢（i18n）；沒給就用 zh-TW 預設 */
    lookup?: OathTextLookup;
    /** 已結義後的義兄弟名字；尚未結義或沒有時為 null（PROG-2-10201） */
    swornPartnerName?: string | null;
}

export interface MercenaryPanelView {
    countdownText: string;
    bondText: string;
    /** 插畫階段文字，例如「插畫 3/5」 */
    illustrationText: string;
    nametagText: string;
    /** 好感 x/60 */
    affectionText: string;
    /** 持有／需要結義點數 */
    pointsText: string;
    /** 結義條件清單（多行，✓／○）；已離隊時為空字串 */
    conditionsText: string;
    /** 義兄弟與同陣士氣說明；試用中提示結義後的效果，已離隊為 null */
    swornText: string | null;
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
    // 與 GameSession 結義判定一致：倒數歸零且好感滿門檻才可結義（點數另算）
    const bondable = canBondMercenary(state) && (state.affection ?? 0) >= AFFECTION_CAP;
    const insufficient = bondable && input.bondPoints < cost;
    const lookup = input.lookup;
    const evaluation = evaluateOath(state, { cost, bondPoints: input.bondPoints, lookup });
    let swornText: string | null = null;
    if (state.status === 'Bonded' && input.swornPartnerName) {
        swornText = oathText(lookup, 'swornPartner', input.swornPartnerName, SWORN_MORALE_BONUS);
    } else if (state.status === 'Trial') {
        swornText = oathText(lookup, 'swornPending', SWORN_MORALE_BONUS);
    }
    return {
        countdownText: oathText(lookup, 'countdown', state.daysLeft),
        bondText: oathText(lookup, 'progress', state.bond, TRIAL_DAYS),
        illustrationText: oathText(lookup, 'illustration', state.illustrationStage ?? ILLUSTRATION_STAGE_MIN, ILLUSTRATION_STAGE_MAX),
        nametagText: oathText(lookup, 'nametag', input.originalOwnerName),
        affectionText: oathText(lookup, 'affection', state.affection ?? 0, AFFECTION_CAP),
        pointsText: oathText(lookup, 'points', input.bondPoints, cost),
        conditionsText: oathConditionLines(evaluation),
        swornText,
        confirmText: bondable ? oathText(lookup, 'confirm', cost, input.generalName) : null,
        farewellText: state.status === 'Expired' ? oathText(lookup, 'farewell', input.generalName) : null,
        bondEnabled: bondable && !insufficient,
        bondPointCost: cost,
        insufficientPoints: insufficient,
    };
}
