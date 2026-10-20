// @spec-source → 戰場部署系統.md (doc_spec_0040) §E 第 9 項「編制預設 / 推薦」P2：儲存 sortie loadout 與戰前推薦
/**
 * SortieLoadoutPreset — 出征編制預設與推薦（純邏輯，不依賴 cc）
 *
 * 每位主將各存一組編制預設（參謀官 / 後勤官）。開戰前套用時，只保留目前仍可出戰、
 * 不是主將、且不重複的人選；失效的欄位回傳 null（視為不派），不自動替換成別人。
 *
 * 暫定（規格沒寫清楚）：
 *   - 一位主將只存一組預設，重新儲存會覆寫。
 *   - 推薦 = 套用預設的結果；不另外挑人，避免替玩家做決定（規格：推薦需玩家確認）。
 *
 * Unity 對照：像存讀一組「隊伍編成」：存的是 ID，讀回時逐一檢查角色是否還在名冊、還能上場。
 */
import type { SortieSupport } from '../managers/GameSession';

/** 主將 id → 編制預設（參謀官 / 後勤官的武將 id，null 表示不派） */
export type SortiePresetStore = Readonly<Record<string, SortieSupport>>;

/** 把目前的支援編制存成主將的預設；回傳新的 store，不修改舊的 */
export function savePresetFor(store: SortiePresetStore, commanderId: string, support: SortieSupport): SortiePresetStore {
    return { ...store, [commanderId]: { strategistUid: support.strategistUid, deputyUid: support.deputyUid } };
}

/**
 * 依目前可出戰名單解析預設：
 *   - 不是可出戰的人、或是主將本人 → 該欄 null
 *   - 參謀官與後勤官同一人 → 後勤官欄 null（保留先出現的參謀官）
 */
export function resolvePreset(
    preset: SortieSupport | undefined,
    commanderId: string,
    deployableIds: ReadonlySet<string>,
): SortieSupport {
    if (!preset) return { strategistUid: null, deputyUid: null };
    const usable = (uid: string | null): string | null =>
        uid && uid !== commanderId && deployableIds.has(uid) ? uid : null;
    const strategistUid = usable(preset.strategistUid);
    const deputyCandidate = usable(preset.deputyUid);
    return { strategistUid, deputyUid: deputyCandidate === strategistUid ? null : deputyCandidate };
}

/** 預設是否有任何一位仍然有效（沒有才不需要推薦） */
export function hasUsablePreset(resolved: SortieSupport): boolean {
    return resolved.strategistUid !== null || resolved.deputyUid !== null;
}
