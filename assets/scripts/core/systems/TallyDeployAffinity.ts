// @spec-source → 兵種（虎符）系統.md §虎符適性系統（TRP-13）
/**
 * TallyDeployAffinity — 虎符部隊出陣時的適性乘數（TRP-13，純邏輯，不依賴 cc）
 *
 * 把「虎符適性資料 + 主將 + 當下地形」轉成 calculateTallyAffinityMod 的輸入。
 * 沒有適性資料（一般部隊、或目錄沒填）回傳 1，戰力不變。
 *
 * Unity 對照：像 ScriptableObject 的 Affinity 設定加上一個 Calculator，
 * 輸入是「這張卡的設定 × 角色 × 目前站的地圖格」，輸出一個攻防倍率。
 */
import type { AptitudeGrade } from './BattleAptitude';
import { calculateTallyAffinityMod, GeneralGender } from './BattleModifiers';
import type { TallyAffinityProfile } from '../../shared/TallyCardContract';

export interface TallyCommanderInfo {
    uid: string;
    gender: GeneralGender;
    clanID?: string;
}

/**
 * 由主將資料組出虎符用的主將資訊。性別文字沿用 BreedingSystem 的判斷（男/女、male/female）。
 * 主將沒有家族欄位時 clanID 留空，家族共鳴不生效。
 */
export function toTallyCommander(uid: string, genderText: string | null | undefined): TallyCommanderInfo {
    const g = (genderText ?? '').trim().toLowerCase();
    const gender: GeneralGender = g === '女' || g === 'female' || g === 'f' ? 'FEMALE' : 'MALE';
    return { uid, gender };
}

/** 規格預設：地形沒填時視為普通（B，乘數 1.0） */
const DEFAULT_TERRAIN_GRADE: AptitudeGrade = 'B';

/**
 * 虎符部隊在某格（地形）的攻防乘數。
 * @param profile 虎符適性資料；null 代表沒有資料，回傳 1
 * @param commander 出陣主將；null 代表沒有主將，家族與性別加成都不生效
 * @param terrain 部隊當下站的地形（TerrainType 的值）；null 代表未知，用預設地形等級
 */
export function resolveTallyDeployMod(
    profile: TallyAffinityProfile | null | undefined,
    commander: TallyCommanderInfo | null | undefined,
    terrain: string | null | undefined,
): number {
    if (!profile) return 1;
    const terrainGrade = (terrain && profile.terrainGrades?.[terrain]) || DEFAULT_TERRAIN_GRADE;
    const sameClan = !!commander?.clanID && commander.clanID === profile.clanID;
    const hasClanBond = !!commander && (profile.historicBonds?.includes(commander.uid) ?? false);
    return calculateTallyAffinityMod({
        terrainGrade,
        sameClan,
        hasClanBond,
        // 沒有主將時不套性別加成
        genderPref: commander ? (profile.genderPref ?? 'NONE') : 'NONE',
        generalGender: commander?.gender ?? 'MALE',
    });
}
