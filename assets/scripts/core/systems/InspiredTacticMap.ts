// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §F-5／§F-6 靈感事件表
/**
 * InspiredTacticMap — 支援卡靈感戰法（規格 TAC_* id）→ 中文名＋戰場戰法庫 id（PROG-2-1135）
 *
 * 每個靈感戰法在戰法庫（tactic-library.json）有自己的 tactic-insp-* 條目，指向最貼近招名的戰場技能
 * （PROG-2-1145，使用者 2026-10-26 核可依招名擬定的效果表，數值暫定）。
 * 名冊 learnedTactics 仍存規格 id，只在組戰場槽位時轉成戰法庫 id。
 */
export interface InspiredTacticEntry {
    /** 規格表中文名（§F-5／§F-6 有寫的照抄，其餘暫定） */
    name: string;
    /** 戰場使用的戰法庫 id */
    libraryId: string;
}

export const INSPIRED_TACTIC_MAP: Readonly<Record<string, InspiredTacticEntry>> = {
    TAC_LANCE_THRUST: { name: '長槍突刺', libraryId: 'tactic-insp-lance-thrust' },
    TAC_CAVALRY_CHARGE: { name: '騎兵衝鋒', libraryId: 'tactic-insp-cavalry-charge' },
    TAC_DRAGON_GALL: { name: '龍膽', libraryId: 'tactic-insp-dragon-gall' },
    TAC_ZHAO_SPEAR: { name: '趙家槍法', libraryId: 'tactic-insp-zhao-spear' },
    TAC_LONE_RIDER: { name: '單騎破陣', libraryId: 'tactic-insp-lone-rider' },
    TAC_COMBO_ATTACK: { name: '連擊', libraryId: 'tactic-insp-combo-attack' },
    TAC_HASTE: { name: '疾行', libraryId: 'tactic-insp-haste' },
    TAC_SHIELD: { name: '堅盾', libraryId: 'tactic-insp-shield' },
    TAC_SLOW: { name: '緩速', libraryId: 'tactic-insp-slow' },
    TAC_TAUNT: { name: '挑釁', libraryId: 'tactic-insp-taunt' },
    TAC_SWORN_FURY: { name: '結義之怒', libraryId: 'tactic-insp-sworn-fury' },
    TAC_WEI_MIGHT: { name: '威震華夏', libraryId: 'tactic-insp-wei-might' },
    TAC_EMPTY_FORT: { name: '空城計', libraryId: 'tactic-insp-empty-fort' },
    TAC_FIRE_ATTACK: { name: '火攻', libraryId: 'tactic-insp-fire-attack' },
    TAC_RED_CLIFF: { name: '赤壁烈焰', libraryId: 'tactic-insp-red-cliff' },
    TAC_CHAIN_LINK: { name: '連環計', libraryId: 'tactic-insp-chain-link' },
    TAC_NIGHT_RAID: { name: '夜襲', libraryId: 'tactic-insp-night-raid' },
    // 戰法系統 G-2 教官靈感 6 招補齊（PROG-2-1615）：沿用既有技能 eight-formation／medical-aid／mentor-morale
    TAC_EIGHT_ARRAY: { name: '八陣圖', libraryId: 'tactic-insp-eight-array' },
    TAC_HEAL: { name: '醫療', libraryId: 'tactic-insp-heal' },
    TAC_INSPIRE: { name: '鼓舞', libraryId: 'tactic-insp-inspire' },
};

/** 規格 id 轉戰法庫 id；本來就是戰法庫 id 或查無對照時原樣回傳 */
export function toLibraryTacticId(tacticId: string): string {
    return INSPIRED_TACTIC_MAP[tacticId]?.libraryId ?? tacticId;
}

/** 靈感戰法中文名；不是靈感戰法時回傳 undefined */
export function inspiredTacticName(tacticId: string): string | undefined {
    return INSPIRED_TACTIC_MAP[tacticId]?.name;
}
