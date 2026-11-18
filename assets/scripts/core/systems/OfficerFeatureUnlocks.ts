// @spec-source → 官職系統.md（F-2 階位表）；使用者裁決第 70 條「官職晉升解鎖節奏」；PROG-2-9151
/**
 * OfficerFeatureUnlocks — 官職階位對應的功能解鎖（純邏輯，不依賴 cc）
 *
 * 資料在 data/officer-feature-unlocks.json：每個功能寫明解鎖階位、顯示名稱、一句說明，
 * 以及對應的大廳選單項目 id（lobbyAction，省略代表只做說明、不控制按鈕）。
 * 這裡只做查表：能不能用、這次晉升多開了什麼、下一階會開什麼。
 *
 * 安全規則：資料沒載入、功能 id 查不到時一律視為已解鎖，絕不因為資料問題把玩家鎖在功能外；
 * 判斷只看「目前官職階位」，所以官職已高的舊存檔直接全開。
 *
 * Unity 對照：像 ScriptableObject 的功能解鎖表加一個 static helper，UI 只問 IsUnlocked(id, rank)。
 */
import { OFFICER_TIER_TITLES } from './OfficerDisplay';

export const OFFICER_FEATURE_TIER_MIN = 1;
export const OFFICER_FEATURE_TIER_MAX = 5;

export interface OfficerFeature {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    /** 對應的大廳選單項目 id；省略代表只做說明 */
    readonly lobbyAction?: string;
    /** 解鎖階位（1 為核心功能，開局就開） */
    readonly unlockTier: number;
}

export type ParseOfficerFeatureResult =
    | { ok: true; features: OfficerFeature[] }
    | { ok: false; issues: string[] };

/** 驗證資料檔：階位 1~5、功能 id 不重複、名稱與說明為非空字串、lobbyAction 不重複 */
export function parseOfficerFeatureUnlocks(raw: unknown): ParseOfficerFeatureResult {
    const issues: string[] = [];
    const tiers = raw && typeof raw === 'object' ? (raw as { tiers?: unknown }).tiers : undefined;
    if (!Array.isArray(tiers)) return { ok: false, issues: ['缺少 tiers 陣列'] };
    const features: OfficerFeature[] = [];
    const ids = new Set<string>();
    const actions = new Set<string>();
    for (const entry of tiers) {
        const row = (entry && typeof entry === 'object' ? entry : {}) as { unlockTier?: unknown; features?: unknown };
        const tier = row.unlockTier;
        if (typeof tier !== 'number' || !Number.isInteger(tier) || tier < OFFICER_FEATURE_TIER_MIN || tier > OFFICER_FEATURE_TIER_MAX) {
            issues.push(`unlockTier 必須是 ${OFFICER_FEATURE_TIER_MIN}~${OFFICER_FEATURE_TIER_MAX} 的整數`);
            continue;
        }
        if (!Array.isArray(row.features)) {
            issues.push(`階位 ${tier} 缺少 features 陣列`);
            continue;
        }
        for (const item of row.features) {
            const f = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            const id = typeof f.id === 'string' ? f.id : '';
            if (!id) { issues.push(`階位 ${tier} 有功能缺少 id`); continue; }
            if (ids.has(id)) issues.push(`功能 id 重複：${id}`);
            ids.add(id);
            if (typeof f.name !== 'string' || !f.name) issues.push(`功能 ${id} 缺少 name`);
            if (typeof f.description !== 'string' || !f.description) issues.push(`功能 ${id} 缺少 description`);
            const action = typeof f.lobbyAction === 'string' && f.lobbyAction ? f.lobbyAction : undefined;
            if (f.lobbyAction !== undefined && !action) issues.push(`功能 ${id} 的 lobbyAction 必須是非空字串`);
            if (action) {
                if (actions.has(action)) issues.push(`lobbyAction 重複：${action}`);
                actions.add(action);
            }
            features.push({ id, name: String(f.name ?? ''), description: String(f.description ?? ''), ...(action ? { lobbyAction: action } : {}), unlockTier: tier });
        }
    }
    return issues.length > 0 ? { ok: false, issues } : { ok: true, features };
}

let installed: readonly OfficerFeature[] | null = null;

/** 安裝資料檔；驗證失敗不覆寫（維持上一版，沒有上一版就是全開）並回報 issues */
export function installOfficerFeatureUnlocks(raw: unknown): ParseOfficerFeatureResult {
    const result = parseOfficerFeatureUnlocks(raw);
    if (result.ok) installed = result.features;
    return result;
}

/** 測試或重新載入用：清掉已安裝資料（回到全開） */
export function resetOfficerFeatureUnlocks(): void {
    installed = null;
}

function table(): readonly OfficerFeature[] {
    return installed ?? [];
}

function clampRank(rank: number): number {
    return Number.isFinite(rank) ? Math.min(OFFICER_FEATURE_TIER_MAX, Math.max(OFFICER_FEATURE_TIER_MIN, Math.floor(rank))) : OFFICER_FEATURE_TIER_MIN;
}

/** 官職階位的顯示名稱（鄉里義士…） */
export function rankTitleOf(rank: number): string {
    return OFFICER_TIER_TITLES[clampRank(rank) - 1] ?? '';
}

/** 功能在這個官職階位是否已開放；查不到功能或資料沒載入一律視為已開放 */
export function isFeatureUnlocked(featureId: string, rank: number): boolean {
    const feature = table().find((f) => f.id === featureId);
    return !feature || clampRank(rank) >= feature.unlockTier;
}

/** 大廳選單項目是否已開放；沒有登記在資料裡的項目一律視為已開放 */
export function isLobbyActionUnlocked(action: string, rank: number): boolean {
    return !lobbyActionLock(action, rank).locked;
}

export interface LobbyActionLock {
    readonly locked: boolean;
    /** 鎖著時需要的官職階位；沒鎖為 0 */
    readonly requiredTier: number;
    /** 鎖著時需要的官職名稱；沒鎖為空字串 */
    readonly requiredTitle: string;
}

export function lobbyActionLock(action: string, rank: number): LobbyActionLock {
    const feature = table().find((f) => f.lobbyAction === action);
    if (!feature || clampRank(rank) >= feature.unlockTier) return { locked: false, requiredTier: 0, requiredTitle: '' };
    return { locked: true, requiredTier: feature.unlockTier, requiredTitle: rankTitleOf(feature.unlockTier) };
}

/** 未解鎖按鈕上的字：兩行「🔒天下沙盤」「郡守開放」（按鈕寬度有限，分行字才不會縮太小）；沒鎖回原名稱 */
export function lockedActionLabel(name: string, lock: LobbyActionLock): string {
    return lock.locked ? `🔒${name}\n${lock.requiredTitle}開放` : name;
}

/** 點未解鎖按鈕的提示：「天下沙盤要升到「郡守」才開放」 */
export function lockedActionToast(name: string, lock: LobbyActionLock): string {
    return `${name}要升到「${lock.requiredTitle}」才開放`;
}

/** 從 prevRank 晉升到 nextRank（含 next 不含 prev）新解鎖的功能；沒晉升回空陣列。依階位、資料順序排列 */
export function newlyUnlocked(prevRank: number, nextRank: number): OfficerFeature[] {
    const prev = clampRank(prevRank);
    const next = clampRank(nextRank);
    if (next <= prev) return [];
    return table().filter((f) => f.unlockTier > prev && f.unlockTier <= next);
}

export interface NextRankPreview {
    readonly tier: number;
    readonly title: string;
    readonly features: readonly OfficerFeature[];
}

/** 下一個官職階位會開什麼；已是最高階或下一階沒有任何新功能回 null */
export function nextRankPreview(rank: number): NextRankPreview | null {
    const current = clampRank(rank);
    if (current >= OFFICER_FEATURE_TIER_MAX) return null;
    const tier = current + 1;
    const features = table().filter((f) => f.unlockTier === tier);
    return features.length === 0 ? null : { tier, title: rankTitleOf(tier), features };
}

/** 季報預告一行：「下一官職「郡守」將開放：天下沙盤、太守府、結緣…」；沒有預告回空字串 */
export function nextRankPreviewLine(rank: number, maxNames = 4): string {
    const preview = nextRankPreview(rank);
    if (!preview) return '';
    const names = preview.features.map((f) => f.name);
    const shown = names.slice(0, maxNames).join('、');
    return `下一官職「${preview.title}」將開放：${shown}${names.length > maxNames ? `等 ${names.length} 項` : ''}`;
}

/** 晉升彈窗最多列出幾項（與 rank-unlock-popup-main.json 的列數一致） */
export const RANK_UNLOCK_POPUP_ROWS = 8;

export interface RankUnlockPopupView {
    readonly texts: Record<string, string>;
    readonly actives: Record<string, boolean>;
}

/** 晉升彈窗內容；key 等於 rank-unlock-popup-main.json 的節點 id。沒有新解鎖功能回 null（不彈窗） */
export function buildRankUnlockPopupView(prevRank: number, nextRank: number): RankUnlockPopupView | null {
    const features = newlyUnlocked(prevRank, nextRank);
    if (features.length === 0) return null;
    const texts: Record<string, string> = {
        rankUnlockTitle: `晉升「${rankTitleOf(nextRank)}」`,
        rankUnlockSub: `新開放 ${features.length} 項功能`,
        rankUnlockMore: features.length > RANK_UNLOCK_POPUP_ROWS ? `…另有 ${features.length - RANK_UNLOCK_POPUP_ROWS} 項，可在選單中查看` : '',
        rankUnlockNext: nextRankPreviewLine(nextRank),
        rankUnlockOkLabel: '知道了',
    };
    const actives: Record<string, boolean> = {};
    for (let i = 0; i < RANK_UNLOCK_POPUP_ROWS; i++) {
        const f = features[i];
        texts[`rankUnlockLine${i}`] = f ? `${f.name}：${f.description}` : '';
        actives[`rankUnlockLine${i}`] = !!f;
    }
    return { texts, actives };
}
