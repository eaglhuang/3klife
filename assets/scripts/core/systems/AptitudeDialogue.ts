// @spec-source → 戰場適性系統.md (doc_spec_0041) §G 劇本相關（水戰 S／山地 S／大霧／夜戰／適性不足／天氣變化）（PROG-2-1308，APT-14 台詞部分）
/**
 * AptitudeDialogue — 適性台詞選擇與佔位替換（純邏輯，不依賴 cc）
 *
 * 只決定「這回合該播哪一句適性台詞」，回傳 i18n key；實際文字由 translate 回傳並替換 {Name}。
 * 優先序（暫定）：天氣變化 → 水戰 S → 山地 S → 大霧 → 夜戰 → 適性不足。
 * 大霧與夜戰台詞規格未寫等級，暫定與水戰、山地相同需 S 才觸發；適性不足暫定為 D 級。
 *
 * Unity 對照：像一組條件式 Dialogue 觸發器，依 Priority 排序，命中第一條就播，
 * 台詞本身放在 Localization Table，程式只帶 key 與變數。
 */
import type { AptitudeGrade } from './BattleAptitude';

export type AptitudeDialogueKind = 'wind' | 'water-s' | 'mountain-s' | 'fog' | 'night' | 'insufficient';

export const APTITUDE_DIALOGUE_KEYS: Readonly<Record<AptitudeDialogueKind, string>> = Object.freeze({
    wind: 'battle.aptitude.line.wind',
    'water-s': 'battle.aptitude.line.water-s',
    'mountain-s': 'battle.aptitude.line.mountain-s',
    fog: 'battle.aptitude.line.fog',
    night: 'battle.aptitude.line.night',
    insufficient: 'battle.aptitude.line.insufficient',
});

/** 適性不足的門檻（暫定）：地形或天氣適性為 D 即視為十分不適 */
export const INSUFFICIENT_GRADE: AptitudeGrade = 'D';

export interface AptitudeDialogueInput {
    /** 地形代碼，如 WATER、MOUNTAIN；沒有則 null */
    terrain: string | null;
    /** 天氣代碼，如 FOG、NIGHT、WINDY（對應 Weather 列舉）；沒有則 null */
    weather: string | null;
    /** 指揮武將在該地形的適性 */
    terrainGrade: AptitudeGrade;
    /** 指揮武將在該天氣的適性 */
    weatherGrade: AptitudeGrade;
    /** 天氣是否於本回合剛變化（風向突變） */
    weatherChanged: boolean;
}

/** 依輸入回傳要播的台詞種類；沒有命中回傳 null。 */
export function aptitudeDialogueKindOf(input: AptitudeDialogueInput): AptitudeDialogueKind | null {
    const terrain = input.terrain?.toUpperCase() ?? null;
    const weather = input.weather?.toUpperCase() ?? null;
    if (input.weatherChanged && weather === 'WINDY') return 'wind';
    if (terrain === 'WATER' && input.terrainGrade === 'S') return 'water-s';
    if (terrain === 'MOUNTAIN' && input.terrainGrade === 'S') return 'mountain-s';
    if (weather === 'FOG' && input.weatherGrade === 'S') return 'fog';
    if (weather === 'NIGHT' && input.weatherGrade === 'S') return 'night';
    if (input.terrainGrade === INSUFFICIENT_GRADE || input.weatherGrade === INSUFFICIENT_GRADE) return 'insufficient';
    return null;
}

/** 把台詞模板中的 {Name} 全部換成武將名；模板沒有佔位時原樣回傳。 */
export function fillAptitudeName(template: string, name: string): string {
    return template.split('{Name}').join(name);
}

/** 組出本回合的適性台詞；沒有命中回傳 null。translate 由呼叫端提供（例如 i18n.t）。 */
export function aptitudeDialogueLine(
    input: AptitudeDialogueInput,
    generalName: string,
    translate: (key: string) => string,
): string | null {
    const kind = aptitudeDialogueKindOf(input);
    if (!kind) return null;
    return fillAptitudeName(translate(APTITUDE_DIALOGUE_KEYS[kind]), generalName);
}
