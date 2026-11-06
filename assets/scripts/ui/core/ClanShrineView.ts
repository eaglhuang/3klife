// @spec-source → 祠堂聲望與家族福祉 (doc_spec_0310) §3；PROG-2-1958
/**
 * ClanShrineView — 祠堂聲望畫面的檢視模型（純邏輯，不依賴 cc）
 *
 * 把聲望值、階層、今日供奉可否領取轉成畫面文字與按鈕狀態：聲望值、階層稱號、距下一階差額、
 * 目前福祉清單、供奉按鈕（不能領時灰掉並說明原因）。規則全在 core，這裡只照單顯示。
 */
import { CLAN_PRESTIGE_THRESHOLDS, CLAN_PRESTIGE_TIER_NAMES } from '../../core/systems/GenerationalLegacy';
import { clanPrestigeBenefitOf } from '../../core/systems/MvpLoopController';

export interface ClanShrineViewInput {
    prestige: number;
    /** 聲望階層 1~5 */
    tier: number;
    /** 今天能否領供奉（core 判定：Lv.5 且今天尚未領） */
    canClaim: boolean;
    /** 供奉每次發的補元散數量，用於按鈕字樣 */
    offeringPills: number;
}

export interface ClanShrineView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export const CLAN_SHRINE_CLAIM_BUTTON_ID = 'btnClaimShrine';

function tierNameOf(tier: number): string {
    const i = Math.min(CLAN_PRESTIGE_TIER_NAMES.length, Math.max(1, Math.floor(tier))) - 1;
    return CLAN_PRESTIGE_TIER_NAMES[i];
}

/** 該階福祉逐項說明；高階含低階的起點與精力上限，沒有加成的階回「尚無福祉」 */
export function clanShrineBenefitLines(tier: number): string[] {
    const b = clanPrestigeBenefitOf(tier);
    const lines: string[] = [];
    if (b.statBonusPct > 0) lines.push(`子嗣五維 +${b.statBonusPct}%`);
    if (b.startRank > 0) lines.push(`子嗣起始將階 ${b.startRank}`);
    if (b.academyVitalityMax !== null) lines.push(`學府精力上限 ${b.academyVitalityMax}`);
    if (b.guaranteedPurpleFactor) lines.push('子嗣保證紫因子');
    if (b.extraMentorSlot) lines.push('教官欄位 +1');
    if (b.dailyShrinePill) lines.push('每日祠堂供奉');
    return lines.length > 0 ? lines : ['尚無福祉'];
}

export function clanShrineView(input: Readonly<ClanShrineViewInput>): ClanShrineView {
    const prestige = Number.isFinite(input.prestige) ? Math.max(0, Math.floor(input.prestige)) : 0;
    const tier = Math.min(CLAN_PRESTIGE_TIER_NAMES.length, Math.max(1, Math.floor(input.tier)));
    const next = CLAN_PRESTIGE_THRESHOLDS[tier];
    const benefit = clanPrestigeBenefitOf(tier);
    const claimLabel = input.canClaim
        ? `領取供奉（補元散 ×${input.offeringPills}）`
        : benefit.dailyShrinePill ? '今日供奉已領取' : '聲望達 Lv.5 解鎖每日供奉';
    return {
        texts: {
            shrineTitle: '祠堂',
            shrinePrestige: `家族聲望 ${prestige}`,
            shrineTier: `Lv.${tier}　${tierNameOf(tier)}`,
            shrineProgress: next === undefined ? '已達最高階' : `距 Lv.${tier + 1}「${tierNameOf(tier + 1)}」還差 ${Math.max(0, next - prestige)}`,
            shrineBenefits: `目前福祉\n${clanShrineBenefitLines(tier).join('、')}`,
            shrineClaimLabel: claimLabel,
        },
        actives: {},
        enabled: { [CLAN_SHRINE_CLAIM_BUTTON_ID]: input.canClaim },
    };
}
