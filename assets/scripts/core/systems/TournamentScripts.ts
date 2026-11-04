// @spec-source → 名將挑戰賽系統.md (doc_spec_0007) §G 劇本相關；PROG-2-1746
/**
 * TournamentScripts — 名將挑戰賽劇本句（純邏輯，不依賴 cc）。
 *
 * 文字照規格 §G；系列賽對手是匿名鏡像，沒有武將名，{OpGeneral} 暫以「對手」代替。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */

/** 對手武將名缺時的代稱（暫定） */
export const TOURNAMENT_OPPONENT_FALLBACK = '對手';

export function tournamentOpeningLine(seasonIndex: number, cupName: string, terrain: string, weather: string): string {
    return `第 ${seasonIndex} 屆【${cupName}】正式開幕！地形：${terrain}、天氣：${weather}`;
}

export function tournamentPrepHintLine(daysLeft: number): string {
    return `距離競賽期還有 ${daysLeft} 天——務必配置克制陣容！`;
}

export function tournamentMatchStartLine(general: string, opGeneral: string = TOURNAMENT_OPPONENT_FALLBACK): string {
    return `你的 ${general} vs 對手 ${opGeneral}——五戰三勝，一決高下！`;
}

export function tournamentWinLine(general: string, cupName: string): string {
    return `漂亮！${general} 在【${cupName}】中擊敗對手，晉級下一輪！`;
}

export function tournamentFinalLine(general: string, opGeneral: string = TOURNAMENT_OPPONENT_FALLBACK): string {
    return `巔峰對決！一場定勝負——${general} vs ${opGeneral}！`;
}

export function tournamentSeasonEndLine(seasonIndex: number, cupName: string, rank: string): string {
    return `第 ${seasonIndex} 屆【${cupName}】落幕！你的最終排名：${rank}`;
}

export function tournamentBossIntelLine(bossName: string, weaknessTags: readonly string[]): string {
    return `情報：本季 BOSS【${bossName}】弱點——${weaknessTags.join('、')}！`;
}

/**
 * 參戰後的開頭句：決賽用「巔峰對決」，非決賽勝利用「漂亮！…晉級下一輪」，落敗不加開頭句（回傳空字串）。
 */
export function tournamentSeriesHeadline(input: { general: string; cupName: string; win: boolean; isFinal: boolean }): string {
    if (input.isFinal) return tournamentFinalLine(input.general);
    return input.win ? tournamentWinLine(input.general, input.cupName) : '';
}
