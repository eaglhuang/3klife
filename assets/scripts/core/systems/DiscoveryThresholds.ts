// @spec-source → 因子解鎖系統.md (doc_spec_0009) §I 可配置項 DiscoveryThresholds；PROG-2-0508 PM 裁定：鍵名對齊 FACTOR_DISCOVERY_LEVEL 常數
/**
 * DiscoveryThresholds — 發現等級門檻設定的解析器（純邏輯，不依賴 cc）
 *
 * 規格示例原寫 `{ Phase1: 20, Phase2: 45 }`，與階段表語義不一致：
 *   - 階段 1：藍、粉，Lv1 開放（固定，不需設定）
 *   - 階段 2：綠、白，Lv20 開放 → 鍵名 Phase2
 *   - 階段 3：紫、紅，Lv45 開放 → 鍵名 Phase3
 * 因此本解析器只接受 `Phase2` / `Phase3`，舊鍵 `Phase1` 直接報錯，避免把 20 誤讀成階段 1。
 *
 * Unity 對照：像一個 ScriptableObject 的 OnValidate，讀進來先檢查欄位名與範圍，
 * 錯誤一次列出，不改原始資料。
 */
import { FACTOR_DISCOVERY_LEVEL } from './FactorInheritance';

export interface DiscoveryThresholds {
    /** 階段 2 開放綠、白的發現等級 */
    phase2: number;
    /** 階段 3 開放紫、紅的發現等級 */
    phase3: number;
}

export type DiscoveryThresholdsResult =
    | { ok: true; value: DiscoveryThresholds }
    | { ok: false; errors: string[] };

const LEGACY_PHASE1_KEY = 'Phase1';

function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** 解析設定物件；錯誤一次全部列出，不修改輸入。 */
export function parseDiscoveryThresholds(raw: unknown): DiscoveryThresholdsResult {
    const errors: string[] = [];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return { ok: false, errors: ['DiscoveryThresholds 必須是物件'] };
    }
    const record = raw as Record<string, unknown>;
    if (LEGACY_PHASE1_KEY in record) {
        errors.push('DiscoveryThresholds.Phase1 已停用：階段 1 固定為 Lv1，請改用 Phase2 / Phase3');
    }
    if (!isPositiveInteger(record.Phase2)) errors.push('DiscoveryThresholds.Phase2 必須是 ≥1 的整數');
    if (!isPositiveInteger(record.Phase3)) errors.push('DiscoveryThresholds.Phase3 必須是 ≥1 的整數');
    if (errors.length > 0) return { ok: false, errors };
    const value = { phase2: record.Phase2 as number, phase3: record.Phase3 as number };
    if (value.phase2 >= value.phase3) {
        return { ok: false, errors: ['DiscoveryThresholds.Phase2 必須小於 Phase3'] };
    }
    return { ok: true, value };
}

/** 由程式常數推出的門檻（綠白 = Phase2、紫紅 = Phase3）。 */
export function discoveryThresholdsFromConstants(): DiscoveryThresholds {
    return { phase2: FACTOR_DISCOVERY_LEVEL.green, phase3: FACTOR_DISCOVERY_LEVEL.purple };
}

/** 設定值是否與程式常數一致；不一致時代表設定檔與常數要對齊。 */
export function matchesFactorConstants(thresholds: DiscoveryThresholds): boolean {
    const expected = discoveryThresholdsFromConstants();
    return thresholds.phase2 === expected.phase2 && thresholds.phase3 === expected.phase3;
}
