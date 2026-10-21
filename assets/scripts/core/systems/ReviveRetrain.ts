// @spec-source → 同名武將系統.md §復生重練與血脈灌注；重複卡分流與血脈灌注補遺_2026-04-04.md §復生重練；WBS SAME-04（PROG-2-1064）
/**
 * ReviveRetrain — 復生重練（純邏輯，不依賴 cc）
 *
 * 規則（規格偽代碼）：
 *   NewBody = CreateSameHeroTemplate(Bloodline_ID)
 *   NewBody.Embedded_Spirit_Card = ExistingSpiritCard
 *   NewBody.Rebirth_Count += 1
 *
 * 新本體是同名新身，沿用既有英靈卡（以卡的 uid 嵌回），轉數依 applyDuplicatePull 累加（上限 5 轉）。
 * 不修改英靈卡本身，只回傳新本體的資料。
 *
 * Unity 對照：像換一個新的 Prefab 實例，但把舊的 ScriptableObject 資料引用（英靈卡）掛回新實例上。
 */
import { applyDuplicatePull } from './Rebirth';

export interface ReviveRetrainInput {
    /** 同名武將的模板 id（Bloodline_ID 對應的同名本體） */
    templateId: string;
    /** 既有英靈卡的 uid，新本體會嵌回這張卡 */
    spiritCardUid: string;
    /** 既有本體目前的轉數；缺欄位視為 1 轉 */
    currentRebirthCount?: number;
}

export interface ReviveRetrainResult {
    /** 新本體的 uid（由呼叫端產生，保證唯一） */
    newBodyUid: string;
    templateId: string;
    /** 新本體轉數（+1，上限 5） */
    rebirthCount: number;
    /** 已達 5 轉仍重練時為 true，呼叫端可轉成結義點數（GCH-06） */
    overflow: boolean;
    /** 嵌回的英靈卡 uid */
    embeddedSpiritCardUid: string;
}

export function reviveRetrain(input: ReviveRetrainInput, newBodyUid: string): ReviveRetrainResult {
    const pull = applyDuplicatePull(input.currentRebirthCount);
    return {
        newBodyUid,
        templateId: input.templateId,
        rebirthCount: pull.rebirthCount,
        overflow: pull.overflow,
        embeddedSpiritCardUid: input.spiritCardUid,
    };
}
