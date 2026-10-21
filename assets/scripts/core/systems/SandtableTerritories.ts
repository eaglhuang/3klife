// @spec-source → 官職系統.md §功能清單 #4「世界沙盤解鎖」；PROG-2-0965（沙盤標記放在領地）
/**
 * SandtableTerritories — 世界沙盤的領地清單與驗證（純邏輯，不依賴 cc）
 *
 * PM 裁定（2026-10-21，暫定）：領地先用東漢十三州作為州節點，標記每領地最多一個。
 * 資料來源為 data/sandtable-territories.json，驗證通過才覆寫；失敗沿用內建清單（與資料檔相同）。
 * 世界沙盤（TIME-10）接入後，領地來源可替換，這裡的介面不變。
 *
 * Unity 對照：像沙盤地圖的 ScriptableObject 清單，OnValidate 通過才套用，格式錯就沿用內建預設。
 */

export interface SandtableTerritory {
    /** 拼音小寫，例如 sili、yu；存檔與標記都以 id 記錄 */
    readonly id: string;
    /** 語系鍵，名稱放在 territory.<id>.name */
    readonly nameKey: string;
}

export type ParseSandtableTerritoriesResult =
    | { ok: true; rows: SandtableTerritory[] }
    | { ok: false; issues: string[] };

const TERRITORY_ID = /^[a-z]+$/;

/** 內建清單（與 data/sandtable-territories.json 相同） */
const BUILT_IN_TERRITORIES: readonly SandtableTerritory[] = [
    { id: 'sili', nameKey: 'territory.sili.name' },
    { id: 'yu', nameKey: 'territory.yu.name' },
    { id: 'yan', nameKey: 'territory.yan.name' },
    { id: 'xu', nameKey: 'territory.xu.name' },
    { id: 'qing', nameKey: 'territory.qing.name' },
    { id: 'ji', nameKey: 'territory.ji.name' },
    { id: 'you', nameKey: 'territory.you.name' },
    { id: 'bing', nameKey: 'territory.bing.name' },
    { id: 'liang', nameKey: 'territory.liang.name' },
    { id: 'yi', nameKey: 'territory.yi.name' },
    { id: 'jing', nameKey: 'territory.jing.name' },
    { id: 'yang', nameKey: 'territory.yang.name' },
    { id: 'jiao', nameKey: 'territory.jiao.name' },
];

let installedTerritories: readonly SandtableTerritory[] = BUILT_IN_TERRITORIES;

/** 驗證資料檔（JSON 的 territories 陣列）：id 為拼音小寫、不可重複、nameKey 不可為空 */
export function parseSandtableTerritories(raw: unknown): ParseSandtableTerritoriesResult {
    const list = (raw as { territories?: unknown } | null)?.territories;
    if (!Array.isArray(list)) return { ok: false, issues: ['territories 必須為陣列'] };
    const issues: string[] = [];
    const seen = new Set<string>();
    const rows: SandtableTerritory[] = [];
    list.forEach((item, index) => {
        const row = item as Partial<SandtableTerritory> | null;
        if (!row || typeof row.id !== 'string' || !TERRITORY_ID.test(row.id)) {
            issues.push(`territories[${index}].id 必須為拼音小寫`);
            return;
        }
        if (seen.has(row.id)) {
            issues.push(`territories[${index}].id 重複：${row.id}`);
            return;
        }
        if (typeof row.nameKey !== 'string' || row.nameKey.length === 0) {
            issues.push(`territories[${index}].nameKey 不可為空`);
            return;
        }
        seen.add(row.id);
        rows.push({ id: row.id, nameKey: row.nameKey });
    });
    if (issues.length > 0) return { ok: false, issues };
    if (rows.length === 0) return { ok: false, issues: ['territories 不可為空'] };
    return { ok: true, rows };
}

/** 驗證通過才安裝；失敗保留目前清單，回傳 issues 給呼叫端記 log */
export function installSandtableTerritories(raw: unknown): ParseSandtableTerritoriesResult {
    const result = parseSandtableTerritories(raw);
    if (result.ok) installedTerritories = result.rows;
    return result;
}

export function sandtableTerritories(): readonly SandtableTerritory[] {
    return installedTerritories;
}

export function isSandtableTerritory(id: string): boolean {
    return installedTerritories.some(territory => territory.id === id);
}
