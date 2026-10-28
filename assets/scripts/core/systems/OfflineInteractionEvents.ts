// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §E-4、§F-3、§G（離線互動）；PROG-2-1193（JRN-04）
/**
 * OfflineInteractionEvents — 離線互動事件內容（純邏輯，不依賴 cc）。
 *
 * - 候選：名冊在世武將之間的動態關係；關係類型即 F-3 的 activeConflictTags。
 * - 同一登入窗、同一對角色只排 1 則主互動（F-3 規則 2，沿用 offlineInteractionKey）。
 * - 摘要＝§G 劇本句＋依關係類型的細節句，寫成 INTERACTION 日誌供晨報挑選。
 *
 * 暫定：細節句庫、重要度、紀錄上限待企劃定版；互動不改親密度或數值（不取代正式結算）。
 * Unity 對照：像從關係表挑一組角色、套 Localization 模板產生 Timeline Log 項目。
 */
import type { DynamicRelation, DynamicRelationType } from './KinRelation';
import type { JournalEntryInput } from './JournalLog';
import { canStartOfflineInteraction, offlineInteractionKey, recordOfflineInteraction } from './OfflineInteractionTrigger';
import { scoreOfflineRelation } from './NpcUtilityAI';

/** §G 離線互動劇本句 */
export const OFFLINE_INTERACTION_OPENING = '{GeneralA} 與 {GeneralB} 在你離席時發生了一段插曲。';

/** 暫定：互動日誌重要度（低於戰果，晨報名額有空才會選上） */
export const OFFLINE_INTERACTION_PRIORITY = 50;

/** 暫定：存檔保留的互動紀錄筆數 */
export const OFFLINE_INTERACTION_LOG_LIMIT = 20;

/** 暫定：各關係類型的細節句 */
export const OFFLINE_INTERACTION_DETAILS: Readonly<Record<DynamicRelationType, readonly string[]>> = {
    COMRADE: ['兩人在校場切磋武藝，不分高下。', '兩人對著沙盤爭論昨日戰法，誰也不讓誰。'],
    DYNAMIC_SWORN: ['兩人把酒論天下，相約來日同破強敵。', '兩人為一句玩笑話鬥起嘴來，轉眼又和好如初。'],
    SPOUSE: ['兩人月下閒談家事，相視而笑。', '兩人為了晚膳該吃什麼爭了半天。'],
    PARENT_CHILD: ['長輩考校晚輩的功課，晚輩答得頭頭是道。', '晚輩纏著長輩講當年征戰的往事。'],
};

export interface OfflineInteractionGeneral {
    id: string;
    name: string;
}

export interface OfflineInteractionCandidate {
    a: OfflineInteractionGeneral;
    b: OfflineInteractionGeneral;
    type: DynamicRelationType;
}

/** 兩人都在名冊（在世）的動態關係才是候選；名冊順序決定 a／b */
export function offlineInteractionCandidates(
    relations: readonly DynamicRelation[], generals: readonly OfflineInteractionGeneral[],
): OfflineInteractionCandidate[] {
    const byId = new Map(generals.map((g) => [g.id, g]));
    return relations.flatMap((r): OfflineInteractionCandidate[] => {
        const a = byId.get(r.uidA);
        const b = byId.get(r.uidB);
        return a && b && a.id !== b.id ? [{ a, b, type: r.type }] : [];
    });
}

/** F-3 的 activeConflictTags：候選關係類型，去重 */
export function offlineInteractionTags(candidates: readonly OfflineInteractionCandidate[]): string[] {
    return Array.from(new Set(candidates.map((c) => c.type)));
}

export interface OfflineInteractionEvent {
    key: string;
    log: string[];
    entry: JournalEntryInput;
}

/**
 * 從候選挑一組本登入窗尚未互動過的角色，產生日誌條目與更新後的紀錄；沒有可排的組合回 null。
 * seq 為日誌序號（條目數 +1），timestamp 由呼叫端給遊戲時間。
 */
export function pickOfflineInteraction(
    candidates: readonly OfflineInteractionCandidate[],
    log: readonly string[],
    windowId: string,
    random: () => number,
    seq: number,
    timestamp: string,
): OfflineInteractionEvent | null {
    const open = candidates.filter((c) => canStartOfflineInteraction(log, offlineInteractionKey(windowId, c.a.id, c.b.id)));
    if (open.length === 0) return null;
    // Utility AI 排序（PROG-2-1379）：只保留最高分那一群，再用原本的亂數挑；權重全相等時與未評分結果相同。
    const scores = open.map((c) => scoreOfflineRelation(c.type));
    const best = Math.max(...scores);
    const top = open.filter((_, i) => scores[i] === best);
    const chosen = top[Math.min(top.length - 1, Math.floor(random() * top.length))];
    const details = OFFLINE_INTERACTION_DETAILS[chosen.type];
    const detail = details[Math.min(details.length - 1, Math.floor(random() * details.length))];
    const key = offlineInteractionKey(windowId, chosen.a.id, chosen.b.id);
    return {
        key,
        log: recordOfflineInteraction(log, key).slice(-OFFLINE_INTERACTION_LOG_LIMIT),
        entry: {
            entryId: `OFFLINE_INTERACTION-${seq}`,
            timestamp,
            category: 'INTERACTION',
            relatedGeneralUids: [chosen.a.id, chosen.b.id],
            priority: OFFLINE_INTERACTION_PRIORITY,
            summary: OFFLINE_INTERACTION_OPENING.replace('{GeneralA}', chosen.a.name).replace('{GeneralB}', chosen.b.name) + detail,
        },
    };
}

/** 存檔正規化：只留字串，保留最後 OFFLINE_INTERACTION_LOG_LIMIT 筆 */
export function normalizeOfflineInteractionLog(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((k): k is string => typeof k === 'string' && k.length > 0).slice(-OFFLINE_INTERACTION_LOG_LIMIT);
}
