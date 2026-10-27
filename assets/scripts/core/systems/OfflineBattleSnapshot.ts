// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §E-5、§F-4、§I（Offline_Battle_Snapshots）；PROG-2-1184（JRN-05）
/**
 * OfflineBattleSnapshot — 離線戰鬥快照：自動解決／代勞結果的摘要與驗證鉤點（純邏輯，不依賴 cc）。
 *
 * - 只存摘要與驗證鉤點，不存逐格 replay（§F-4 規則 1）。
 * - 各 digest 以確定性雜湊產生：同樣輸入必得同樣快照。
 * - syncHashLink 串上一筆快照的 link（首筆接 EMPTY_SYNC_HASH），可整串回扣驗證（§F-4 規則 2）。
 *
 * 暫定：雜湊用 FNV-1a 32 位元（伺服端可換 sha256）；MAJOR／MINOR 門檻、保留筆數待企劃定案。
 * Unity 對照：Battle Report DTO，先以摘要形式保存。
 */
import { EMPTY_SYNC_HASH } from '../storage/SaveVersion';

export type OfflineBattleType = 'AUTO_RESOLVE' | 'ASSIST_SUPPORT' | 'OFFLINE_SKIRMISH';
export type OfflineBattleResultDigest = 'WIN_MAJOR' | 'WIN_MINOR' | 'LOSE_MINOR' | 'LOSE_MAJOR';

export interface OfflineBattleSnapshot {
    snapshotId: string;
    battleType: OfflineBattleType;
    seed: string;
    lineupDigest: string;
    tileStateDigest: string;
    tacticDigest: string;
    resultDigest: OfflineBattleResultDigest;
    syncHashLink: string;
}

export interface OfflineBattleInput {
    battleType: OfflineBattleType;
    seed: string;
    /** 我方出戰陣容（名稱或 id 與能力），進 lineupDigest */
    lineup: readonly unknown[];
    /** 地形／城寨狀態；沒有時傳空物件 */
    tileState: unknown;
    /** 戰法使用紀錄；沒有時傳空陣列 */
    tactics: readonly unknown[];
    win: boolean;
    playerStrength: number;
    enemyStrength: number;
}

/** 暫定：兵力比 ≥ 1.5 算大勝／大敗 */
export const OFFLINE_BATTLE_MAJOR_RATIO = 1.5;
/** 暫定：只留最近 20 筆快照 */
export const OFFLINE_BATTLE_SNAPSHOT_LIMIT = 20;

const BATTLE_TYPES: readonly OfflineBattleType[] = ['AUTO_RESOLVE', 'ASSIST_SUPPORT', 'OFFLINE_SKIRMISH'];
const RESULT_DIGESTS: readonly OfflineBattleResultDigest[] = ['WIN_MAJOR', 'WIN_MINOR', 'LOSE_MINOR', 'LOSE_MAJOR'];

/** 物件鍵排序後序列化，確保同內容同字串 */
function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
}

/** FNV-1a 32 位元，回傳 8 碼十六進位 */
export function snapshotDigest(value: unknown): string {
    const text = typeof value === 'string' ? value : canonical(value);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

export function offlineBattleResultDigest(win: boolean, playerStrength: number, enemyStrength: number): OfflineBattleResultDigest {
    const winner = Math.max(0, win ? playerStrength : enemyStrength);
    const loser = Math.max(0, win ? enemyStrength : playerStrength);
    const major = loser <= 0 ? winner > 0 : winner / loser >= OFFLINE_BATTLE_MAJOR_RATIO;
    if (win) return major ? 'WIN_MAJOR' : 'WIN_MINOR';
    return major ? 'LOSE_MAJOR' : 'LOSE_MINOR';
}

function linkOf(previousLink: string, body: Omit<OfflineBattleSnapshot, 'syncHashLink'>): string {
    return snapshotDigest(`${previousLink}|${canonical(body)}`);
}

/** 新增一筆快照到鏈尾，回傳新清單（只留最近 OFFLINE_BATTLE_SNAPSHOT_LIMIT 筆）與新快照 */
export function appendOfflineBattleSnapshot(
    snapshots: readonly OfflineBattleSnapshot[],
    snapshotId: string,
    input: Readonly<OfflineBattleInput>,
): { snapshots: OfflineBattleSnapshot[]; snapshot: OfflineBattleSnapshot } {
    const body: Omit<OfflineBattleSnapshot, 'syncHashLink'> = {
        snapshotId,
        battleType: input.battleType,
        seed: input.seed,
        lineupDigest: snapshotDigest(input.lineup),
        tileStateDigest: snapshotDigest(input.tileState),
        tacticDigest: snapshotDigest(input.tactics),
        resultDigest: offlineBattleResultDigest(input.win, input.playerStrength, input.enemyStrength),
    };
    const previous = snapshots.length > 0 ? snapshots[snapshots.length - 1].syncHashLink : EMPTY_SYNC_HASH;
    const snapshot: OfflineBattleSnapshot = { ...body, syncHashLink: linkOf(previous, body) };
    return { snapshots: snapshots.concat(snapshot).slice(-OFFLINE_BATTLE_SNAPSHOT_LIMIT), snapshot };
}

/**
 * 驗證鏈：每筆的 link 必須等於「前一筆 link＋本筆內容」的雜湊。
 * 被截掉的最舊快照無法重算，所以第一筆以 genesisLink 為前一筆（預設 EMPTY_SYNC_HASH，截斷後由呼叫端給已知 link）。
 * 回傳第一筆不符的索引，全部吻合回傳 -1。
 */
export function verifyOfflineBattleChain(snapshots: readonly OfflineBattleSnapshot[], genesisLink: string = EMPTY_SYNC_HASH): number {
    let previous = genesisLink;
    for (let i = 0; i < snapshots.length; i++) {
        const { syncHashLink, ...body } = snapshots[i];
        if (linkOf(previous, body) !== syncHashLink) return i;
        previous = syncHashLink;
    }
    return -1;
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function normalizeOfflineBattleSnapshots(raw: unknown): OfflineBattleSnapshot[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((s): s is OfflineBattleSnapshot => !!s && typeof s === 'object'
            && isText(s.snapshotId) && BATTLE_TYPES.includes(s.battleType) && typeof s.seed === 'string'
            && isText(s.lineupDigest) && isText(s.tileStateDigest) && isText(s.tacticDigest)
            && RESULT_DIGESTS.includes(s.resultDigest) && isText(s.syncHashLink))
        .map((s) => ({
            snapshotId: s.snapshotId, battleType: s.battleType, seed: s.seed, lineupDigest: s.lineupDigest,
            tileStateDigest: s.tileStateDigest, tacticDigest: s.tacticDigest, resultDigest: s.resultDigest, syncHashLink: s.syncHashLink,
        }))
        .slice(-OFFLINE_BATTLE_SNAPSHOT_LIMIT);
}

/** 暫定：敵襲自動迎戰寫日誌的重要度與摘要 */
export const OFFLINE_BATTLE_JOURNAL = {
    win: { priority: 70, summary: '邊境來犯，我軍自動迎戰告捷。' },
    lose: { priority: 65, summary: '邊境來犯，我軍自動迎戰失利。' },
} as const;

/** 下一筆快照 id：接最後一筆的序號（截斷後仍遞增），格式 OBS_0001 */
export function nextOfflineBattleSnapshotId(snapshots: readonly OfflineBattleSnapshot[]): string {
    const last = snapshots.length > 0 ? Number(/(\d+)$/.exec(snapshots[snapshots.length - 1].snapshotId)?.[1] ?? snapshots.length) : 0;
    return `OBS_${String(last + 1).padStart(4, '0')}`;
}
