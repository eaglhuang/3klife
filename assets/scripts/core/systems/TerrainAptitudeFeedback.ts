// @spec-source → 戰場適性系統.md (doc_spec_0041) §E-10 適性反饋、§H UI_APT_S／UI_APT_A／UI_APT_D；PROG-2-1850
/**
 * TerrainAptitudeFeedback — 部隊踏上擅長或極差地形時的提示（純邏輯，不依賴 cc）
 *
 * 只提示 S、A 與 D：資料裡 S 極少，只提示 S 與 D 幾乎只會看到負面提示；B、C 佔多數，提示會洗版。
 * 同一部隊同一地形每場一次。
 *
 * Unity 對照：像 Tilemap 的 OnTileEnter 判斷是否要跳 UI 提示，顯示本身交給 View。
 */
import { APTITUDE_GRADE_TEXT, type AptitudeGrade } from './BattleAptitude';

const FEEDBACK_GRADES: readonly AptitudeGrade[] = ['S', 'A', 'D'];

/** 飄字內容；不需提示的等級回傳 null */
export function terrainFeedbackText(grade: AptitudeGrade, terrainLabel: string): string | null {
    return FEEDBACK_GRADES.indexOf(grade) >= 0 ? `${terrainLabel} ${APTITUDE_GRADE_TEXT[grade]}` : null;
}

/** 記住本場已提示過的部隊與地形；一場戰鬥一個實例 */
export class TerrainFeedbackTracker {
    private readonly _shown = new Set<string>();

    /** 移動一步後呼叫；地形沒變、等級不需提示或已提示過時回傳 null */
    public onMoved(unitId: string, fromTerrain: string, toTerrain: string, grade: AptitudeGrade, terrainLabel: string): string | null {
        if (fromTerrain === toTerrain) return null;
        const text = terrainFeedbackText(grade, terrainLabel);
        const key = `${unitId}|${toTerrain}`;
        if (text === null || this._shown.has(key)) return null;
        this._shown.add(key);
        return text;
    }
}
