// @spec-source → AI武將強度系統.md (doc_data_0002) §E-1 難度、§E-9：開局建立他國名冊與逐將重算情境（PROG-2-1715）
/**
 * RivalOfficerSetup — 由資料檔建出他國名冊與重算情境（純邏輯，不依賴 cc）
 *
 * 輸入 rival-rosters.json、generals.json、troops.json、ai-difficulty.json 的內容，
 * 輸出 GameSession.setRivalOfficerContext 需要的名冊與情境。
 *
 * 暫定（可逆）：玩家尚無難度選擇，預設 normal；章節預設 1。難度表解析失敗時 statScale 取 1。
 *
 * Unity 對照：像開局 Bootstrapper 讀 ScriptableObject 表，組好 AI 陣營的 Runtime 設定。
 */
import { aiDifficultyEntryOf, parseAiDifficultyTable } from './AiDifficultyTable';
import type { AiDifficulty } from './AiSpCharge';
import type { AptitudeGrade } from './BattlePowerRating';
import { buildRivalOfficers, type RivalGeneralSource, type RivalNationRoster, type RivalRostersConfig } from './RivalOfficers';
import { RIVAL_TROOP_CODE, type RivalPowerContext } from './RivalOfficerSeason';

export const RIVAL_DEFAULT_DIFFICULTY: AiDifficulty = 'normal';
export const RIVAL_DEFAULT_CHAPTER = 1;

const APTITUDE_GRADES: readonly string[] = ['S', 'A', 'B', 'C', 'D'];

/** generals.json 中重算需要的欄位（名冊欄位＋兵種適性） */
export interface RivalSetupGeneral extends RivalGeneralSource {
    readonly troopAptitude?: Readonly<Record<string, string>>;
}

export interface RivalOfficerSetupInput {
    readonly rosters: Readonly<RivalRostersConfig>;
    readonly generals: readonly RivalSetupGeneral[];
    /** troops.json：兵種 → 攻防等 */
    readonly troops: Readonly<Record<string, { readonly attack?: number; readonly defense?: number }>>;
    /** ai-difficulty.json 原始內容 */
    readonly difficultyTable: unknown;
    readonly difficulty?: AiDifficulty;
    readonly chapter?: number;
    readonly playerOwnedIds?: ReadonlySet<string>;
}

export interface RivalOfficerSetup {
    readonly rosters: Record<string, RivalNationRoster>;
    readonly context: RivalPowerContext;
}

export function buildRivalOfficerSetup(input: RivalOfficerSetupInput): RivalOfficerSetup {
    const parsed = parseAiDifficultyTable(input.difficultyTable);
    const statScale = (parsed.table
        ? aiDifficultyEntryOf(parsed.table, input.difficulty ?? RIVAL_DEFAULT_DIFFICULTY)?.statScale
        : undefined) ?? 1;
    const aptitudes = new Map(input.generals.map((g) => [g.id, g.troopAptitude ?? {}]));
    const context: RivalPowerContext = {
        difficulty: { statScale },
        chapter: input.chapter ?? RIVAL_DEFAULT_CHAPTER,
        aptitudeOf: (generalId, troopType) => {
            const code = RIVAL_TROOP_CODE[troopType];
            const grade = code ? aptitudes.get(generalId)?.[code] : undefined;
            return grade && APTITUDE_GRADES.includes(grade) ? (grade as AptitudeGrade) : null;
        },
        troopStatsOf: (troopType) => {
            const t = input.troops[troopType];
            return t && typeof t.attack === 'number' && typeof t.defense === 'number'
                ? { attack: t.attack, defense: t.defense }
                : null;
        },
    };
    return {
        rosters: buildRivalOfficers(input.rosters, input.generals, input.playerOwnedIds ?? new Set()),
        context,
    };
}
