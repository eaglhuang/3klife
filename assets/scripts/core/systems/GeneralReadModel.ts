// @spec-source → 武將人物介面規格書 §10 Data Read Model、§12 狀態與鎖定；WBS GDUI-13；PROG-2-1022
/**
 * GeneralReadModel — 人物頁 Data Read Model 映射層（純邏輯，不依賴 cc）。
 *
 * - §10 表中每個欄位一個 mapper：合法值回 VALUE，缺漏或不合法一律回 NO_DATA，不填假資料。
 * - 屬性揭露沿用 StatRevelation.revealStat；層級不合法時退回 HIDDEN，避免洩漏精確值。
 * - 本檔只驗形狀，不假設 Ancestors_JSON、Bloodline_Ultimate 等來源的內部結構。
 *
 * Unity 對照：像 ViewModel 層：Presenter 只吃 ViewModel，欄位沒資料就顯示空狀態，不在 Presenter 裡硬塞預設值。
 */
import { isRevelationLevel, revealStat, type RevealedStat, type RevelationLevel } from './StatRevelation';

export const PERSON_PAGE_TABS = ['Overview', 'Stats', 'Bloodline', 'Tactics', 'Equip', 'Aptitude'] as const;
export type PersonPageTab = (typeof PERSON_PAGE_TABS)[number];

export const STORY_DOCK_STATES = ['COLLAPSED', 'HALF', 'EXPANDED'] as const;
export type StoryDockState = (typeof STORY_DOCK_STATES)[number];

export const STORY_STRIP_MIN_CELLS = 5;
export const STORY_STRIP_MAX_CELLS = 6;

export type ReadModelValue<T> = { state: 'VALUE'; value: T } | { state: 'NO_DATA' };

/** 屬性揭露結果：缺數值為 NO_DATA，其餘依揭露層級 */
export type StatDisclosure = { state: 'NO_DATA' } | { state: 'REVEALED'; revealed: RevealedStat };

type Raw = Readonly<Record<string, unknown>>;

function valueOf<T>(value: T | undefined): ReadModelValue<T> {
    return value === undefined ? { state: 'NO_DATA' } : { state: 'VALUE', value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
    return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** Profile_Presentation.Default_Tab：只允許六個分頁 */
export function mapDefaultTab(raw: Raw): ReadModelValue<PersonPageTab> {
    const tab = raw.Profile_Presentation && isRecord(raw.Profile_Presentation) ? raw.Profile_Presentation.Default_Tab : undefined;
    return oneOf(PERSON_PAGE_TABS, tab) ? valueOf(tab) : { state: 'NO_DATA' };
}

/** Profile_Presentation.Story_Strip_Cells：5~6 格字串，不足或超出都視為沒有資料 */
export function mapStoryStripCells(raw: Raw): ReadModelValue<string[]> {
    const cells = isRecord(raw.Profile_Presentation) ? raw.Profile_Presentation.Story_Strip_Cells : undefined;
    if (!isStringArray(cells)) return { state: 'NO_DATA' };
    return cells.length >= STORY_STRIP_MIN_CELLS && cells.length <= STORY_STRIP_MAX_CELLS ? valueOf(cells) : { state: 'NO_DATA' };
}

/** Profile_Presentation.Bloodline_StoryDock_State：COLLAPSED / HALF / EXPANDED */
export function mapStoryDockState(raw: Raw): ReadModelValue<StoryDockState> {
    const state = isRecord(raw.Profile_Presentation) ? raw.Profile_Presentation.Bloodline_StoryDock_State : undefined;
    return oneOf(STORY_DOCK_STATES, state) ? valueOf(state) : { state: 'NO_DATA' };
}

/** Ancestors_JSON：14 人祖先血統圖，只驗為物件或陣列，內容由血統樹線自行解讀 */
export function mapAncestors(raw: Raw): ReadModelValue<Record<string, unknown> | unknown[]> {
    const ancestors = raw.Ancestors_JSON;
    if (Array.isArray(ancestors)) return ancestors.length > 0 ? valueOf(ancestors) : { state: 'NO_DATA' };
    return isRecord(ancestors) && Object.keys(ancestors).length > 0 ? valueOf(ancestors) : { state: 'NO_DATA' };
}

/** Bloodline_Beast、Bloodline_Ultimate、Equipped_Spirit_UID、Equipped_Tally_UID 等物件或字串欄位：非空才算有資料 */
export function mapOptionalRecord(raw: Raw, key: string): ReadModelValue<Record<string, unknown>> {
    const value = raw[key];
    return isRecord(value) && Object.keys(value).length > 0 ? valueOf(value) : { state: 'NO_DATA' };
}

export function mapOptionalString(raw: Raw, key: string): ReadModelValue<string> {
    const value = raw[key];
    return typeof value === 'string' && value.length > 0 ? valueOf(value) : { state: 'NO_DATA' };
}

/** General_Fame、General_Rank、Command_Capacity 等數值欄位：只收有限數 */
export function mapFiniteNumber(raw: Raw, key: string): ReadModelValue<number> {
    const value = raw[key];
    return isFiniteNumber(value) ? valueOf(value) : { state: 'NO_DATA' };
}

/** 屬性揭露：缺數值為 NO_DATA；層級不合法退回 HIDDEN（最保守），不洩漏精確值 */
export function mapStatDisclosure(value: number | undefined, level: unknown): StatDisclosure {
    if (!isFiniteNumber(value) || value < 0) return { state: 'NO_DATA' };
    const safeLevel: RevelationLevel = isRevelationLevel(level) ? level : 'HIDDEN';
    return { state: 'REVEALED', revealed: revealStat(value, safeLevel) };
}

/** Talent_Stats、Prowess_Stats、Learned_Tactics、Aptitudes 等陣列或物件欄位：非空才算有資料 */
export function mapNonEmptyList<T>(raw: Raw, key: string): ReadModelValue<T[]> {
    const value = raw[key];
    return Array.isArray(value) && value.length > 0 ? valueOf(value as T[]) : { state: 'NO_DATA' };
}

/** 五階奧義（命頁右側五階奧義軌）：階數上限（暫定，與名詞定義「覺醒階／星階上限」一致） */
export const BLOODLINE_ULTIMATE_MAX_STAGE = 5;
/** 血脈性格註記：2~3 個短標籤（名詞定義文件） */
export const PERSONA_TAG_MIN_COUNT = 2;
export const PERSONA_TAG_MAX_COUNT = 3;

export interface BloodlineUltimateStages {
    beast: ReadModelValue<string>;
    personaTags: ReadModelValue<string[]>;
    stageCurrent: ReadModelValue<number>;
    stageCap: ReadModelValue<number>;
    stageProgress: ReadModelValue<number>;
    stageRequirements: ReadModelValue<string[]>;
}

function isStageNumber(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= BLOODLINE_ULTIMATE_MAX_STAGE;
}

/**
 * Bloodline_Ultimate 子欄位（TSK-10）：供命頁五階奧義軌直接讀取。
 * 階數上限 1~5；目前階數不得超過上限；進度為 0~1；性格標籤 2~3 個非空字串；缺值或不合規都回 NO_DATA。
 */
export function mapBloodlineUltimateStages(raw: Raw): BloodlineUltimateStages {
    const ultimate = isRecord(raw.Bloodline_Ultimate) ? raw.Bloodline_Ultimate : {};
    const cap = isStageNumber(ultimate.Stage_Cap) && ultimate.Stage_Cap >= 1 ? valueOf(ultimate.Stage_Cap) : { state: 'NO_DATA' as const };
    const current = isStageNumber(ultimate.Stage_Current) && cap.state === 'VALUE' && ultimate.Stage_Current <= cap.value
        ? valueOf(ultimate.Stage_Current)
        : { state: 'NO_DATA' as const };
    const progress = isFiniteNumber(ultimate.Stage_Progress) && ultimate.Stage_Progress >= 0 && ultimate.Stage_Progress <= 1
        ? valueOf(ultimate.Stage_Progress)
        : { state: 'NO_DATA' as const };
    const beast = typeof ultimate.Bloodline_Beast === 'string' && ultimate.Bloodline_Beast.length > 0
        ? valueOf(ultimate.Bloodline_Beast)
        : { state: 'NO_DATA' as const };
    const tags = ultimate.Persona_Tags;
    const personaTags = isStringArray(tags) && tags.length >= PERSONA_TAG_MIN_COUNT && tags.length <= PERSONA_TAG_MAX_COUNT && tags.every((t) => t.length > 0)
        ? valueOf(tags)
        : { state: 'NO_DATA' as const };
    const requirements = isStringArray(ultimate.Stage_Requirements) && ultimate.Stage_Requirements.length > 0
        ? valueOf(ultimate.Stage_Requirements)
        : { state: 'NO_DATA' as const };
    return { beast, personaTags, stageCurrent: current, stageCap: cap, stageProgress: progress, stageRequirements: requirements };
}

/** 整包人物頁讀取模型：§10 的 16 個欄位逐一對應 */
export interface GeneralReadModel {
    defaultTab: ReadModelValue<PersonPageTab>;
    storyStripCells: ReadModelValue<string[]>;
    storyDockState: ReadModelValue<StoryDockState>;
    ancestors: ReadModelValue<Record<string, unknown> | unknown[]>;
    bloodlineBeast: ReadModelValue<Record<string, unknown>>;
    bloodlineUltimate: ReadModelValue<Record<string, unknown>>;
    equippedSpiritUid: ReadModelValue<string>;
    generalFame: ReadModelValue<number>;
    generalRank: ReadModelValue<number>;
    commandCapacity: ReadModelValue<number>;
    talentStats: ReadModelValue<unknown[]>;
    prowessStats: ReadModelValue<unknown[]>;
    learnedTactics: ReadModelValue<unknown[]>;
    equipmentLoadout: ReadModelValue<unknown[]>;
    equippedTallyUid: ReadModelValue<string>;
    aptitudes: ReadModelValue<unknown[]>;
}

/** 把原始武將資料映射成人物頁讀取模型；每個欄位獨立判斷，單一欄位缺漏不影響其他欄位 */
export function mapGeneralReadModel(raw: Raw): GeneralReadModel {
    return {
        defaultTab: mapDefaultTab(raw),
        storyStripCells: mapStoryStripCells(raw),
        storyDockState: mapStoryDockState(raw),
        ancestors: mapAncestors(raw),
        bloodlineBeast: mapOptionalRecord(raw, 'Bloodline_Beast'),
        bloodlineUltimate: mapOptionalRecord(raw, 'Bloodline_Ultimate'),
        equippedSpiritUid: mapOptionalString(raw, 'Equipped_Spirit_UID'),
        generalFame: mapFiniteNumber(raw, 'General_Fame'),
        generalRank: mapFiniteNumber(raw, 'General_Rank'),
        commandCapacity: mapFiniteNumber(raw, 'Command_Capacity'),
        talentStats: mapNonEmptyList(raw, 'Talent_Stats'),
        prowessStats: mapNonEmptyList(raw, 'Prowess_Stats'),
        learnedTactics: mapNonEmptyList(raw, 'Learned_Tactics'),
        equipmentLoadout: mapNonEmptyList(raw, 'Equipment_Loadout'),
        equippedTallyUid: mapOptionalString(raw, 'Equipped_Tally_UID'),
        aptitudes: mapNonEmptyList(raw, 'Aptitudes'),
    };
}
