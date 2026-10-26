// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §F-5／§F-6 靈感事件表
/**
 * InspiredTacticMap — 支援卡靈感戰法（規格 TAC_* id）→ 中文名＋戰場戰法庫 id（PROG-2-1135）
 *
 * 戰法庫（tactic-library.json）目前只有 8 招；使用者裁定（2026-10-26）MVP 先把 17 個靈感戰法
 * 對應到最接近的現有招式，學到即可上戰場，之後再逐招補獨立效果。
 * 名冊 learnedTactics 仍存規格 id，只在組戰場槽位時轉成戰法庫 id。
 */
export interface InspiredTacticEntry {
    /** 規格表中文名（§F-5／§F-6 有寫的照抄，其餘暫定） */
    name: string;
    /** 戰場使用的戰法庫 id（暫定對照） */
    libraryId: string;
}

export const INSPIRED_TACTIC_MAP: Readonly<Record<string, InspiredTacticEntry>> = {
    TAC_LANCE_THRUST: { name: '長槍突刺', libraryId: 'tactic-spear-phalanx' },
    TAC_CAVALRY_CHARGE: { name: '騎兵衝鋒', libraryId: 'tactic-cavalry-shock' },
    TAC_DRAGON_GALL: { name: '龍膽', libraryId: 'tactic-dragon-pierce' },
    TAC_ZHAO_SPEAR: { name: '趙家槍法', libraryId: 'tactic-dragon-pierce' },
    TAC_LONE_RIDER: { name: '單騎破陣', libraryId: 'tactic-dragon-pierce' },
    TAC_COMBO_ATTACK: { name: '連擊', libraryId: 'tactic-dragon-pierce' },
    TAC_HASTE: { name: '疾行', libraryId: 'tactic-cavalry-shock' },
    TAC_SHIELD: { name: '堅盾', libraryId: 'tactic-spear-phalanx' },
    TAC_SLOW: { name: '緩速', libraryId: 'tactic-battle-roar' },
    TAC_TAUNT: { name: '挑釁', libraryId: 'tactic-battle-roar' },
    TAC_SWORN_FURY: { name: '結義之怒', libraryId: 'tactic-battle-roar' },
    TAC_WEI_MIGHT: { name: '威震華夏', libraryId: 'tactic-archer-volley' },
    TAC_EMPTY_FORT: { name: '空城計', libraryId: 'tactic-morale-rally' },
    TAC_FIRE_ATTACK: { name: '火攻', libraryId: 'tactic-fire-scheme' },
    TAC_RED_CLIFF: { name: '赤壁烈焰', libraryId: 'tactic-fire-scheme' },
    TAC_CHAIN_LINK: { name: '連環計', libraryId: 'tactic-fire-scheme' },
    TAC_NIGHT_RAID: { name: '夜襲', libraryId: 'tactic-river-ambush' },
};

/** 規格 id 轉戰法庫 id；本來就是戰法庫 id 或查無對照時原樣回傳 */
export function toLibraryTacticId(tacticId: string): string {
    return INSPIRED_TACTIC_MAP[tacticId]?.libraryId ?? tacticId;
}

/** 靈感戰法中文名；不是靈感戰法時回傳 undefined */
export function inspiredTacticName(tacticId: string): string | undefined {
    return INSPIRED_TACTIC_MAP[tacticId]?.name;
}
