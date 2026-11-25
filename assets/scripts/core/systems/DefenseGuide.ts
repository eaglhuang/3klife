// @spec-source → 關卡設計系統 shard-a §C-3（年終守城）；PROG-2-10019 守城玩家引導（只動戰前提示與 UI 閘門，不動戰場規則與數值）
/**
 * DefenseGuide — 年終守城的玩家引導文字與「未部署不得開戰」判定（純函式，不依賴 cc，可直接單元測試）。
 * 使用者 11/25 裁決：守城要先部署再開打；沒部署就警告並阻擋「結束回合（開戰）」與「自動代打」。
 */
export type DefenseGuideLookup = (key: string, ...args: string[]) => string;

/** 守城引導的 zh-TW 預設；與 resources/i18n/zh-TW.json 同步（測試會比對） */
export const DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.battle.defense.entry': '這是守城戰！先部署部隊再開戰，撐滿 {0} 回合即勝',
    'ui.battle.defense.banner_deploy': '守城備戰：從左側兵種卡拖到我方底線的格子部署部隊；部署後按「結束回合」開戰',
    'ui.battle.defense.banner_ready': '部隊已就位：按「結束回合」開戰，守住城寨',
    'ui.battle.defense.blocked_end_turn': '尚未部署部隊，不能開戰！先把兵種卡拖到我方底線格子',
    'ui.battle.defense.blocked_auto': '尚未部署部隊，不能自動代打！先把兵種卡拖到我方底線格子',
};

export function fallbackDefenseGuideText(key: string, ...args: string[]): string {
    const template = DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW[key];
    if (template === undefined) return key;
    return template.replace(/\{(\d+)\}/g, (_m, i: string) => args[Number(i)] ?? '');
}

/** 語系表未載入時 i18n.t 回傳 key 本身，這時改用 zh-TW 預設 */
export function withDefenseGuideFallback(lookup: DefenseGuideLookup): DefenseGuideLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackDefenseGuideText(key, ...args) : localized;
    };
}

/** 需要玩家先部署才能開戰：守城戰（玩家守方）且我方場上還沒有任何部隊 */
export function isDefenseDeployBlocked(isPlayerDefending: boolean, playerTroopCount: number): boolean {
    return isPlayerDefending && playerTroopCount <= 0;
}

/** 引導橫幅文字鍵：未部署顯示部署說明，部署後改顯示開戰說明 */
export function defenseBannerKey(playerTroopCount: number): string {
    return playerTroopCount > 0 ? 'ui.battle.defense.banner_ready' : 'ui.battle.defense.banner_deploy';
}
