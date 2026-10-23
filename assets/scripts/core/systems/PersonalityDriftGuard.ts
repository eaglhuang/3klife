// @spec-source → NPC人性化規格書.md §F-3 性格漂移限制（canAcceptGeneratedLine）、§F-2 FALLBACK_LINE；WBS NPC-06；PROG-2-1018
/**
 * PersonalityDriftGuard — 生成台詞的性格漂移檢查（純邏輯，不依賴 cc）。
 *
 * - 生成的台詞（例如 LLM 改寫）必須同時通過：字數上限、無現代用語、無未支持的史實主張、
 *   含武將要求的語氣標籤。任一不過就回退到武將的安全句（FALLBACK_LINE）。
 * - 檢查只看呼叫端提供的 flags 與 toneTags，本模組不解析台詞內容本身。
 * - 字數上限沿用 NPC_LINE_MAX_CHARS（規格 F-3 的 maxLineChars 預設值，暫定）。
 *
 * Unity 對照：像生成內容的 Validator，產出不合規就整段換成預設字串，避免角色說出不符設定的話。
 */
import { NPC_LINE_MAX_CHARS } from './NpcPersonaCard';

/** 規格 F-3 定義的漂移旗標；生成端遇到就必須標出。 */
export const DRIFT_FLAGS = ['MODERN_SLANG', 'UNSUPPORTED_HISTORY_CLAIM'] as const;
export type DriftFlag = (typeof DRIFT_FLAGS)[number];

export interface GeneratedLine {
    text: string;
    /** 生成端標出的問題旗標（例如 MODERN_SLANG） */
    flags: readonly string[];
    /** 生成端標出的語氣標籤（例如 bold、loyal） */
    toneTags: readonly string[];
}

export interface DriftPersona {
    Required_Tone_Tags: readonly string[];
    Safe_Fallback_Line: string;
}

export type DriftGuardSource = 'generated' | 'fallback';

export interface DriftGuardResult {
    line: string;
    source: DriftGuardSource;
}

/** 字數以 Unicode 字元計（中文一字一個）。 */
function charCount(text: string): number {
    return [...text].length;
}

/** 台詞是否可接受：字數不超過上限、沒有禁止旗標、語氣標籤全部具備。 */
export function canAcceptGeneratedLine(
    line: Readonly<GeneratedLine>,
    persona: Readonly<DriftPersona>,
    maxLineChars: number = NPC_LINE_MAX_CHARS,
): boolean {
    if (charCount(line.text) > maxLineChars) return false;
    if (line.flags.some((flag) => (DRIFT_FLAGS as readonly string[]).includes(flag))) return false;
    return persona.Required_Tone_Tags.every((tag) => line.toneTags.includes(tag));
}

/** 生成台詞過檢則採用，不過則回退到武將的安全句。 */
export function guardGeneratedLine(
    line: Readonly<GeneratedLine>,
    persona: Readonly<DriftPersona>,
    maxLineChars: number = NPC_LINE_MAX_CHARS,
): DriftGuardResult {
    if (canAcceptGeneratedLine(line, persona, maxLineChars)) return { line: line.text, source: 'generated' };
    return { line: persona.Safe_Fallback_Line, source: 'fallback' };
}
