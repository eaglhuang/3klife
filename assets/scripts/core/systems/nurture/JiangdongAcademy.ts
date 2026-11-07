// @spec-source → ACAD_03_江東督府_水文天時與陣型火攻規格書.md (doc_spec_0305) §2 水文天時與陣型、§2.3 長江大閱兵、§3 專屬產出（PROG-2-2011）
/**
 * JiangdongAcademy — 江東督府的長江風向水情、陣型與天候契合、明日預報、長江大閱兵與結業產出（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 風向：東南順風／西北逆風／微風；水勢：春汛大浪／秋江枯水。
 * - 契合：火攻陣＋東南風 ×2.3（風助火勢）、衝鋒陣＋東南風 ×1.8、方陣＋西北風 ×1.7；其餘 ×1.1。
 * - 介面固定提前 1 回合預報風向水情。
 * - 第 9、18、27 回合大閱兵：過去 9 回合完美匹配 ≥ 3 次評為甲等。
 * - 結業：橫江扼守（統率 ≥ 85 且大閱兵甲等）、連環神火（智力 ≥ 88 且風助火勢 3 次）、江東弄潮（統＋智 ≥ 165）。
 *
 * 暫定：
 * - 規格的倍率函式只看風向；水勢不影響倍率，只做資料與預報顯示。
 * - 「甲等」以任一次大閱兵評為甲上神威即成立。
 * - 天候抽選權重均等，用學府既有的確定性 RNG（防 SL）。
 * - 未掛到 AcademyTrainingEngine 的 IAcademyGimmickHandler，接線另卡。
 */
import type { IDeterministicRng } from './AcademyTypes';

export enum NavalFormation {
    WARSHIP_RAM = 'WARSHIP_RAM',
    TOWER_FORTRESS = 'TOWER_FORTRESS',
    FIRE_RAIDER = 'FIRE_RAIDER',
}

export enum WindDirection {
    SOUTHEAST = 'SOUTHEAST',
    NORTHWEST = 'NORTHWEST',
    BREEZE = 'BREEZE',
}

export enum TideState {
    HIGH_TIDE = 'HIGH_TIDE',
    LOW_TIDE = 'LOW_TIDE',
}

export const JIANGDONG_INSPECTION_TURNS: readonly number[] = [9, 18, 27];
export const JIANGDONG_INSPECTION_WINDOW = 9;
export const JIANGDONG_INSPECTION_MATCHES = 3;

const WINDS: readonly WindDirection[] = [WindDirection.SOUTHEAST, WindDirection.NORTHWEST, WindDirection.BREEZE];
const TIDES: readonly TideState[] = [TideState.HIGH_TIDE, TideState.LOW_TIDE];

export interface JiangdongWeather {
    wind: WindDirection;
    tide: TideState;
}

export interface JiangdongGimmickState {
    currentFormation: NavalFormation;
    current: JiangdongWeather;
    forecast: JiangdongWeather;
    firelinkPoints: number;
    perfectMatchesCount: number;
    /** 每回合是否完美匹配，供大閱兵回看 9 回合。 */
    matchHistory: boolean[];
    inspectionGradeA: boolean;
}

export interface JiangdongSynergy {
    multiplier: number;
    isPerfectMatch: boolean;
    isFireStorm: boolean;
    synergyName: string;
}

export function rollJiangdongWeather(rng: IDeterministicRng, salt: string): JiangdongWeather {
    return { wind: WINDS[rng.nextInt(WINDS.length, `${salt}.wind`)], tide: TIDES[rng.nextInt(TIDES.length, `${salt}.tide`)] };
}

export function createJiangdongState(rng: IDeterministicRng): JiangdongGimmickState {
    return {
        currentFormation: NavalFormation.WARSHIP_RAM,
        current: rollJiangdongWeather(rng, 'jiangdong.weather.0'),
        forecast: rollJiangdongWeather(rng, 'jiangdong.weather.1'),
        firelinkPoints: 0, perfectMatchesCount: 0, matchHistory: [], inspectionGradeA: false,
    };
}

export function evaluateJiangdongSynergy(formation: NavalFormation, wind: WindDirection): JiangdongSynergy {
    if (formation === NavalFormation.FIRE_RAIDER && wind === WindDirection.SOUTHEAST) {
        return { multiplier: 2.3, isPerfectMatch: true, isFireStorm: true, synergyName: '【風助火勢】：東南風起，赤壁神火連鎖大彩圈！' };
    }
    if (formation === NavalFormation.WARSHIP_RAM && wind === WindDirection.SOUTHEAST) {
        return { multiplier: 1.8, isPerfectMatch: true, isFireStorm: false, synergyName: '【順流破浪】：艨艟快船急馳，江面衝鋒勢不可擋！' };
    }
    if (formation === NavalFormation.TOWER_FORTRESS && wind === WindDirection.NORTHWEST) {
        return { multiplier: 1.7, isPerfectMatch: true, isFireStorm: false, synergyName: '【鐵壁橫江】：逆風巨艦拋錨，陣勢固若金湯！' };
    }
    return { multiplier: 1.1, isPerfectMatch: false, isFireStorm: false, synergyName: '【平流操演】：風向平緩，常態舟師演練。' };
}

export function setJiangdongFormation(state: JiangdongGimmickState, formation: NavalFormation): JiangdongGimmickState {
    return { ...state, currentFormation: formation };
}

export interface JiangdongTurnResult {
    state: JiangdongGimmickState;
    synergy: JiangdongSynergy;
}

/** 以本回合天候結算陣型，然後預報推進為當期並擲出新的明日預報。 */
export function processJiangdongTurn(state: JiangdongGimmickState, turn: number, rng: IDeterministicRng): JiangdongTurnResult {
    const synergy = evaluateJiangdongSynergy(state.currentFormation, state.current.wind);
    const next: JiangdongGimmickState = {
        ...state,
        current: state.forecast,
        forecast: rollJiangdongWeather(rng, `jiangdong.weather.${turn + 1}`),
        firelinkPoints: state.firelinkPoints + (synergy.isFireStorm ? 1 : 0),
        perfectMatchesCount: state.perfectMatchesCount + (synergy.isPerfectMatch ? 1 : 0),
        matchHistory: [...state.matchHistory, synergy.isPerfectMatch],
    };
    return { state: next, synergy };
}

export function isJiangdongInspectionTurn(turn: number): boolean {
    return JIANGDONG_INSPECTION_TURNS.includes(turn);
}

/** 長江大閱兵：過去 9 回合完美匹配 ≥ 3 次為甲上神威。 */
export function resolveJiangdongInspection(state: JiangdongGimmickState): { state: JiangdongGimmickState; gradeA: boolean } {
    const recent = state.matchHistory.slice(-JIANGDONG_INSPECTION_WINDOW).filter(Boolean).length;
    const gradeA = recent >= JIANGDONG_INSPECTION_MATCHES;
    return { state: { ...state, inspectionGradeA: state.inspectionGradeA || gradeA }, gradeA };
}

export function jiangdongGraduationRewards(lea: number, int: number, state: JiangdongGimmickState): string[] {
    const out: string[] = [];
    if (lea >= 85 && state.inspectionGradeA) out.push('TAC_HENGJIANG_ESHO');
    if (int >= 88 && state.firelinkPoints >= 3) out.push('TAC_LIANHUAN_SHENHUO');
    if (lea + int >= 165) out.push('TRT_JIANGDONG_NONGCHAO');
    return out;
}
