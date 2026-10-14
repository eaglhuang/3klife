// @spec-source → Data Schema文件（本機端與Server端）.md「Root Save 外殼」與 Save_Version 規則；熱更新與版本控制規格書.md §Save_Version 逐版遷移；PROG-2-0334（WBS DS-01 / DS-03）
/**
 * SaveVersion — 存檔的 semver 版號、逐版遷移鏈與規格 envelope（純邏輯，不依賴 cc）
 *
 * 決策（PM 裁定 2026-10-14 (b)）：本機存檔保留扁平 PlayerSaveSnapshot，不改磁碟格式。
 *   - 新增選填的 saveVersion（semver 字串，例如 "1.0.0"），與既有整數 schemaVersion 並存。
 *   - 舊檔沒有 saveVersion：依整數 schemaVersion 對應（n → "n.0.0"），不破壞既有存檔。
 *   - toSaveEnvelope / fromSaveEnvelope 把扁平存檔轉成規格的五欄 envelope，供日後同步用；不寫入本機磁碟。
 *
 * 遷移鏈：每一步註冊 from → to（semver），依版號逐步升級到最新版。
 *
 * Unity 對照：類似 ScriptableObject 的版本欄位 + 一串 [FormerlySerializedAs] 式的升級函式，
 * 讀檔時從舊版號一路跑到最新版號。
 */

export const SAVE_VERSION_LATEST = '1.0.0';

export type SaveVersionString = string;

export interface SemverParts {
    major: number;
    minor: number;
    patch: number;
}

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseSemver(value: unknown): SemverParts | null {
    if (typeof value !== 'string') return null;
    const match = SEMVER_PATTERN.exec(value);
    if (!match) return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** 回傳 <0 / 0 / >0，與 Array.sort 比較函式同義 */
export function compareSemver(a: string, b: string): number {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb) throw new Error(`[SaveVersion] 不是合法的 semver：${a} / ${b}`);
    return (pa.major - pb.major) || (pa.minor - pb.minor) || (pa.patch - pb.patch);
}

/**
 * 取得存檔的 semver 版號：優先用 saveVersion，否則由整數 schemaVersion 對應。
 * 都沒有或不合法時視為最舊的 1.0.0。
 */
export function saveVersionOf(snapshot: { saveVersion?: unknown; schemaVersion?: unknown }): SaveVersionString {
    if (parseSemver(snapshot.saveVersion)) return snapshot.saveVersion as string;
    const legacy = snapshot.schemaVersion;
    if (typeof legacy === 'number' && Number.isInteger(legacy) && legacy >= 1) {
        return `${legacy}.0.0`;
    }
    return '1.0.0';
}

export interface SemverMigrationStep<T extends Record<string, unknown> = Record<string, unknown>> {
    from: SaveVersionString;
    to: SaveVersionString;
    migrate: (data: T) => T;
}

export interface SemverMigrationResult<T> {
    data: T;
    version: SaveVersionString;
    /** 實際跑過的步驟（from → to），供測試與除錯 */
    applied: Array<{ from: string; to: string }>;
}

/**
 * 從存檔的版號逐步遷移到 latest。每一步必須 from 等於目前版號、to 大於 from 且不超過 latest；
 * 找不到可接的步驟時拋錯，避免半套升級後默默覆蓋存檔。版號已等於或超過 latest 時不動資料。
 */
export function runSemverMigrations<T extends Record<string, unknown>>(
    data: T,
    steps: readonly SemverMigrationStep<T>[],
    latest: SaveVersionString = SAVE_VERSION_LATEST,
): SemverMigrationResult<T> {
    let current = saveVersionOf(data as { saveVersion?: unknown; schemaVersion?: unknown });
    let working = data;
    const applied: Array<{ from: string; to: string }> = [];
    while (compareSemver(current, latest) < 0) {
        const candidates = steps
            .filter((step) => step.from === current && compareSemver(step.to, current) > 0 && compareSemver(step.to, latest) <= 0)
            .sort((a, b) => compareSemver(a.to, b.to));
        const next = candidates[0];
        if (!next) {
            throw new Error(`[SaveVersion] 找不到從 ${current} 升級的遷移步驟（目標 ${latest}）`);
        }
        working = next.migrate(working);
        applied.push({ from: current, to: next.to });
        current = next.to;
    }
    return { data: { ...working, saveVersion: current }, version: current, applied };
}

// ── 規格 envelope（Root Save 外殼）──────────────────────────────────────────

/** 尚未有同步 hash 時的空值（sha256 of 空字串），與規格範例一致 */
export const EMPTY_SYNC_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export interface SaveEnvelope<TData = Record<string, unknown>> {
    Player_ID: string;
    Save_Version: SaveVersionString;
    Last_Sync_Hash: string;
    Data: TData;
    Action_Records: unknown[];
}

export interface SaveEnvelopeOptions {
    playerId?: string;
    lastSyncHash?: string;
    actionRecords?: unknown[];
}

/** 扁平存檔 → 規格 envelope。Data 內不再重複 saveVersion（外殼已有）。 */
export function toSaveEnvelope<T extends { saveVersion?: unknown }>(snapshot: T, options: SaveEnvelopeOptions = {}): SaveEnvelope<Omit<T, 'saveVersion'>> {
    const { saveVersion: _ignored, ...data } = snapshot;
    return {
        Player_ID: options.playerId ?? 'local-player',
        Save_Version: saveVersionOf(snapshot as { saveVersion?: unknown; schemaVersion?: unknown }),
        Last_Sync_Hash: options.lastSyncHash ?? EMPTY_SYNC_HASH,
        Data: data,
        Action_Records: options.actionRecords ? [...options.actionRecords] : [],
    };
}

/** envelope → 扁平存檔；Save_Version 寫回 saveVersion。Player_ID 等同步欄位不進存檔本體。 */
export function fromSaveEnvelope<TData extends Record<string, unknown>>(envelope: SaveEnvelope<TData>): TData & { saveVersion: SaveVersionString } {
    return { ...envelope.Data, saveVersion: envelope.Save_Version };
}
