// @spec-source → 結緣系統-shards/shard-b.md §I；PROG-2-1146 出生紀錄存讀檔
import type { BreedingBirthRecord } from './BreedingBirthRecord';
import { validateBreedingSession, validateChildRecord } from '../models/BreedingRecordSchema';

/** 舊檔／壞值不補造紀錄；child.UID 去重，首筆有效紀錄優先。每次都建立完整複本。 */
export function normalizeBreedingBirthRecords(raw: unknown): BreedingBirthRecord[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const records: BreedingBirthRecord[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const { session, child } = item as Partial<BreedingBirthRecord>;
        if (!session || typeof session !== 'object' || Array.isArray(session)
            || !child || typeof child !== 'object' || Array.isArray(child)) continue;
        if (validateBreedingSession(session).length || validateChildRecord(child).length) continue;
        if (session.Father_UID !== child.Father_ID || session.Mother_UID !== child.Mother_ID) continue;
        if (seen.has(child.UID)) continue;
        seen.add(child.UID);
        records.push({
            session: {
                Father_UID: session.Father_UID,
                Mother_UID: session.Mother_UID,
                Breeding_Mode: session.Breeding_Mode,
                EP_Estimate: session.EP_Estimate,
                Oracle_Hints: session.Oracle_Hints.map(hint => ({ Sage: hint.Sage, Comment: hint.Comment })),
            },
            child: {
                UID: child.UID,
                Father_ID: child.Father_ID,
                Mother_ID: child.Mother_ID,
                Age: child.Age,
                Status: child.Status,
                EP_Actual: child.EP_Actual,
                Is_Daqi: child.Is_Daqi,
                Omen_Type: child.Omen_Type,
            },
        });
    }
    return records;
}
