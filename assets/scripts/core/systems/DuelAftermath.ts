// @spec-source → 戰場武將單挑對決與斬將功能規格書 (doc_spec_0314) §4.1 名聲 +15、§4.2 斬將陣亡結算、TC-DUEL-03/04；PROG-2-9132
/**
 * DuelAftermath — 單挑戰果在戰場外的養成／傳承結算（純邏輯，不依賴 cc）。
 *
 * 戰場在單挑分出勝負時發 DuelOutcomeApplied 事件（BattleGeneralDuelFlow），戰後由 recordBattle 一次收進來：
 * - 勝方是我方主將：名聲 +15，同一場只算一次（BattleFameSource.DUEL_VICTORY；教學戰勝方照領，§4 教學戰註記）。
 * - 敗方是我方主將且被斬（killed）：標陣亡，之後由 GameSession._settleDeaths 走既有的虎符＋英靈卡陣亡結算，
 *   並寫戰歿遺書（doc_spec_0312 §5.2）。負傷敗逃（fled）不產卡、不寫遺書。
 * - 敵方主將不在存檔名冊（俘虜另走待處置清單），敵方贏的名聲與敵將被斬都不入帳。
 *
 * 武將代號：事件的 winnerGeneralId／loserGeneralId 是 GeneralUnit.id，與存檔名冊 GeneralConfig.id 是同一個值
 * （戰場以名冊武將建立己方主將，BattleUIBridge 也用同一個 id 呼叫 recordBattle），所以直接用 id 對名冊，不用 templateId。
 *
 * Unity 對照：像戰鬥結束後的 BattleResultProcessor，把戰場事件佇列轉成角色存檔的改動清單。
 */
import { Faction } from '../config/Constants';
import { GENERAL_STATUS_DEAD } from './GeneralAging';
import { GENERAL_FAME_AWARD, gainGeneralFame, type GeneralFameHolder } from './GeneralRankProgress';
import type { TallyLine } from './TallyLineSpec';

/** 戰場單挑結果事件中，戰場外要用的欄位（與 DuelOutcomeAppliedEvent 相容的子集；core 不 import battle/runtime） */
export interface DuelOutcomeRecord {
    winner: Faction;
    loser: Faction;
    winnerGeneralId: string | null;
    loserGeneralId: string | null;
    killed: boolean;
    fled: boolean;
    tutorial: boolean;
}

export interface DuelAftermathPlan {
    /** 我方主將單挑勝出的名聲入帳；同一場同一人贏幾次都只有一筆（使用者 2026-11-17 裁決，PROG-2-9385） */
    fame: Array<{ generalId: string; gain: number }>;
    /** 我方主將被斬的名冊代號（去重） */
    fallenIds: string[];
}

/** 單挑獲勝名聲（與戰場 BattleFameSource.DUEL_VICTORY 同源：GENERAL_FAME_AWARD.duelWin） */
export const DUEL_VICTORY_FAME: number = GENERAL_FAME_AWARD.duelWin;

/** 事件清單 → 名聲與陣亡計畫；只認名冊內的我方主將。 */
export function planDuelAftermath(
    events: readonly DuelOutcomeRecord[],
    rosterIds: ReadonlySet<string>,
    /** 這場已由「主將被擒」君主處置接手的名冊 id（PROG-2-9140）：不再依 killed 直接陣亡，只有被斬首才陣亡 */
    captureHandledIds: ReadonlySet<string> = new Set(),
): DuelAftermathPlan {
    const fame: DuelAftermathPlan['fame'] = [];
    const fallen = new Set<string>();
    const famed = new Set<string>();
    for (const event of events) {
        if (event.winner === Faction.Player && event.winnerGeneralId && rosterIds.has(event.winnerGeneralId) && !famed.has(event.winnerGeneralId)) {
            famed.add(event.winnerGeneralId);
            fame.push({ generalId: event.winnerGeneralId, gain: DUEL_VICTORY_FAME });
        }
        // 教學戰不會被斬（killed 本來就假），這裡再擋一次，避免上游改動後教學戰誤殺名冊武將
        if (event.killed && !event.tutorial && event.loser === Faction.Player && event.loserGeneralId && rosterIds.has(event.loserGeneralId) && !captureHandledIds.has(event.loserGeneralId)) {
            fallen.add(event.loserGeneralId);
        }
    }
    return { fame, fallenIds: [...fallen] };
}

type DuelRosterGeneral = GeneralFameHolder & { id: string; name?: string; status?: string };

export interface DuelAftermathApplied<T extends DuelRosterGeneral> {
    roster: T[];
    /** 名聲帶來的升階（沿用 GeneralRankPromoted 事件的資料） */
    promotions: Array<{ generalId: string; rank: number }>;
    /** 單挑獲勝提示列（名聲入帳） */
    fameNotices: TallyLine[];
    /** 這次才被標陣亡的武將（戰歿遺書與陣亡提示的對象） */
    fallen: T[];
}

/** 名聲先入帳，再把被斬者標陣亡；已陣亡者不重複標。回傳新名冊，不改輸入。 */
export function applyDuelAftermath<T extends DuelRosterGeneral>(roster: readonly T[], plan: DuelAftermathPlan): DuelAftermathApplied<T> {
    let next = [...roster];
    const promotions: DuelAftermathApplied<T>['promotions'] = [];
    const fameNotices: TallyLine[] = [];
    for (const { generalId, gain } of plan.fame) {
        const index = next.findIndex((g) => g.id === generalId);
        if (index < 0) continue;
        const gained = gainGeneralFame(next[index], gain);
        next[index] = gained.general;
        gained.promotedRanks.forEach((rank) => promotions.push({ generalId, rank }));
        fameNotices.push(duelFameSpec(next[index].name ?? generalId, gain));
    }
    const fallen: T[] = [];
    next = next.map((g) => {
        if (!plan.fallenIds.includes(g.id) || (g.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD) return g;
        const dead = { ...g, status: GENERAL_STATUS_DEAD };
        fallen.push(dead);
        return dead;
    });
    return { roster: next, promotions, fameNotices, fallen };
}

/** 「單挑獲勝，名聲 +15」提示（i18n Key＋參數，保底繁中在 TallyLineSpec） */
export function duelFameSpec(generalName: string, gain: number): TallyLine {
    return { key: 'SCRIPT_DUEL_FAME', args: [generalName, String(gain)] };
}

/** 「單挑落敗被斬，戰歿沙場」提示 */
export function duelFallenSpec(generalName: string): TallyLine {
    return { key: 'SCRIPT_DUEL_FALLEN', args: [generalName] };
}
