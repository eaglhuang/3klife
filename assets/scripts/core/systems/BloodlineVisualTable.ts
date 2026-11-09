// @spec-source → 血脈視覺契約補遺_2026-04-02.md；bloodline-symbol-slot-contract-v1.md；WBS BVC-02、BSS-04；PROG-2-2140
/**
 * BloodlineVisualTable — 血脈視覺對照表（純邏輯，不依賴 cc）
 *
 * - 六色因子各有固定的紋樣、材質、靈獸 family。
 * - 八種插槽各對應 crest、badge、icon、虎符兵牌；沒有專屬圖時退回通用佔位圖（使用者裁決：美術到了再換）。
 * - 色調與紋樣 id 仍由 CrestStyle 負責，這裡不另立一套色票。
 *
 * 暫定（完整契約稿不在 repo，規格只寫「要固定對應」）：
 * - 六色的紋樣、材質、靈獸名稱都是暫定值；資料檔以 provisional 標記，定案後可直接改資料。
 *
 * Unity 對照：像一張 ScriptableObject 對照表，查不到專屬 Sprite 時回傳預設 Sprite。
 */
import { ALL_FACTOR_COLORS, type FactorColor } from './FactorInheritance';

export type BloodlineSlotTier = 'primary' | 'secondary' | 'extended';
export type BloodlineGender = 'male' | 'female';

/** 契約定義的八種插槽，順序與 bloodline-symbol-slot-contract-v1 相同 */
export const BLOODLINE_SLOT_IDS = [
    'CHEST_CORE',
    'WAIST_CORE',
    'HAIR_ORNAMENT',
    'JADE_PENDANT',
    'SHOULDER_CLASP',
    'WEAPON_CHARM',
    'ROBE_EDGE',
    'TALLY_TOKEN',
] as const;
export type BloodlineSlotId = (typeof BLOODLINE_SLOT_IDS)[number];

/** 契約規定的層級 */
const SLOT_TIERS: Readonly<Record<BloodlineSlotId, BloodlineSlotTier>> = {
    CHEST_CORE: 'primary',
    WAIST_CORE: 'primary',
    HAIR_ORNAMENT: 'secondary',
    JADE_PENDANT: 'secondary',
    SHOULDER_CLASP: 'secondary',
    WEAPON_CHARM: 'extended',
    ROBE_EDGE: 'extended',
    TALLY_TOKEN: 'extended',
};

export interface BloodlineFactorVisual {
    pattern: string;
    material: string;
    beastFamily: string;
}

export interface BloodlineSlotUi {
    crest: string;
    badge: string;
    icon: string;
    tallyToken: string;
}

export interface BloodlineSlotRow {
    id: BloodlineSlotId;
    tier: BloodlineSlotTier;
    label: string;
    priorityFor: readonly BloodlineGender[];
    ui?: Partial<BloodlineSlotUi>;
}

export interface BloodlineVisualTable {
    placeholder: BloodlineSlotUi;
    factors: Readonly<Record<FactorColor, BloodlineFactorVisual>>;
    slots: readonly BloodlineSlotRow[];
}

export type ParseBloodlineVisualResult =
    | { ok: true; table: BloodlineVisualTable }
    | { ok: false; issues: string[] };

const UI_KEYS: readonly (keyof BloodlineSlotUi)[] = ['crest', 'badge', 'icon', 'tallyToken'];
const FACTOR_KEYS: readonly (keyof BloodlineFactorVisual)[] = ['pattern', 'material', 'beastFamily'];
const GENDERS: readonly string[] = ['male', 'female'];

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function checkFactors(factors: Record<string, Record<string, unknown>> | undefined, issues: string[]): void {
    const seen: Record<string, Set<unknown>> = { pattern: new Set(), material: new Set(), beastFamily: new Set() };
    for (const color of ALL_FACTOR_COLORS) {
        const row = factors?.[color];
        for (const key of FACTOR_KEYS) {
            const value = row?.[key];
            if (!isText(value)) {
                issues.push(`因子 ${color} 缺少 ${key}`);
            } else if (seen[key].has(value)) {
                issues.push(`因子 ${color} 的 ${key} 與其他顏色重複：${value}`);
            }
            seen[key].add(value);
        }
    }
}

function checkSlots(slots: unknown, issues: string[]): void {
    if (!Array.isArray(slots)) {
        issues.push('缺少 slots 陣列');
        return;
    }
    const ids = slots.map((slot) => (slot as { id?: unknown }).id);
    if (ids.join() !== BLOODLINE_SLOT_IDS.join()) {
        issues.push(`插槽必須依契約順序列出 ${BLOODLINE_SLOT_IDS.length} 種`);
    }
    for (const raw of slots as Array<Record<string, unknown>>) {
        const id = raw.id as BloodlineSlotId;
        if (raw.tier !== SLOT_TIERS[id]) issues.push(`插槽 ${String(id)} 的層級與契約不符`);
        if (!isText(raw.label)) issues.push(`插槽 ${String(id)} 缺少 label`);
        const priority = raw.priorityFor;
        if (!Array.isArray(priority) || priority.some((gender) => !GENDERS.includes(gender as string))) {
            issues.push(`插槽 ${String(id)} 的 priorityFor 不合法`);
        }
    }
}

/** 驗證資料檔：六色與八種插槽都要齊，紋樣、材質、靈獸不得跨色重複，佔位圖四種都要有 */
export function parseBloodlineVisualTable(raw: unknown): ParseBloodlineVisualResult {
    const issues: string[] = [];
    const data = (raw && typeof raw === 'object' ? raw : {}) as {
        placeholder?: Record<string, unknown>;
        factors?: Record<string, Record<string, unknown>>;
        slots?: unknown;
    };
    for (const key of UI_KEYS) {
        if (!isText(data.placeholder?.[key])) issues.push(`佔位圖缺少 ${key}`);
    }
    checkFactors(data.factors, issues);
    checkSlots(data.slots, issues);
    return issues.length === 0 ? { ok: true, table: raw as BloodlineVisualTable } : { ok: false, issues };
}

/** 因子視覺；未知色回 null，呼叫端照 CrestStyle 的中性樣式顯示 */
export function factorVisualOf(table: Readonly<BloodlineVisualTable>, color: unknown): BloodlineFactorVisual | null {
    const isFactor = typeof color === 'string' && (ALL_FACTOR_COLORS as readonly string[]).includes(color);
    return isFactor ? table.factors[color as FactorColor] : null;
}

/** 插槽對應的 UI 資產路徑：有專屬圖用專屬圖，其餘退回通用佔位圖；未知插槽全用佔位圖 */
export function slotUiOf(table: Readonly<BloodlineVisualTable>, slotId: string): BloodlineSlotUi {
    const row = table.slots.find((slot) => slot.id === slotId);
    return { ...table.placeholder, ...(row?.ui ?? {}) };
}

/** 某性別優先強化的插槽（契約「落地原則」） */
export function prioritySlotsFor(table: Readonly<BloodlineVisualTable>, gender: BloodlineGender): BloodlineSlotId[] {
    return table.slots.filter((slot) => slot.priorityFor.includes(gender)).map((slot) => slot.id);
}
