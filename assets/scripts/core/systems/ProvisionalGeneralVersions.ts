/**
 * ProvisionalGeneralVersions — 暫定版本表（PROG-2-0709，純邏輯，不依賴 cc）
 *
 * PM 暫定：正式版本資料企劃未提供前，先用現有武將資料推出每位武將一個 V1 版本，
 * 讓圖鑑有資料可顯示。正式資料到位後以企劃表取代，這個函式只作為暫定來源。
 *
 * Unity 對照：像開發期的假資料 ScriptableObject，接口與正式表相同，之後整個換掉。
 */
import type { GeneralVersionRecord } from '../models/GeneralVersion';

export interface ProvisionalGeneralSource {
    id: string;
    name: string;
    title?: string;
}

/** 把武將 id（如 cao-cao）轉成 Template_ID 的名稱段（Cao_Cao）。 */
function nameSegment(id: string): string {
    return id
        .split(/[-_]+/)
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('_');
}

/** 每位武將推一個 V1 版本；血源 ID 與 Template 名稱段相同。 */
export function deriveProvisionalVersionTable(generals: ProvisionalGeneralSource[]): GeneralVersionRecord[] {
    const records: GeneralVersionRecord[] = [];
    const seen = new Set<string>();
    for (const g of generals) {
        const segment = nameSegment(g.id);
        if (!segment || seen.has(segment)) continue;
        seen.add(segment);
        records.push({
            Template_ID: `${segment}_V1`,
            Bloodline_ID: `BL_${segment}`,
            Display_Name: g.name,
            Version_Title: g.title ?? '',
            Is_Limited: false,
        });
    }
    return records;
}

/**
 * 圖鑑的暫定輸入（PROG-2-0719）：版本表取「已知武將」與「名冊武將」的並集，已擁有集合取名冊武將的 Template_ID。
 * 「已擁有」依 PM 裁定暫定為整份名冊，不只看目前這一位武將。
 */
export function galleryInputsFromGenerals(
    known: ProvisionalGeneralSource[],
    roster: ProvisionalGeneralSource[],
): { table: GeneralVersionRecord[]; owned: Set<string> } {
    const table = deriveProvisionalVersionTable([...known, ...roster]);
    const owned = new Set(deriveProvisionalVersionTable(roster).map((v) => v.Template_ID));
    return { table, owned };
}
