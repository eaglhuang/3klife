// @spec-source → 技能系統 Base 框架規格書 (doc_spec_1187) §4 ISkillSourceAdapter、§7 現有程式盤點；PROG-2-9204
/**
 * SkillCatalog — 預設技能定義庫：學府戰法（資料表）＋教官靈感戰法（轉接器，來源 InspiredTacticMap）。
 *
 * 戰法庫（tactic-library.json）的戰場戰法屬戰場專家範圍，這裡不載入；顯示名稱查不到時，
 * 呼叫端仍可用戰法庫備援（見 LobbyScene 的 tacticName）。
 */
import { NURTURE_SKILL_DEFS } from '../../../shared/skill/NurtureSkillDefs';
import { SkillRegistry } from '../../../shared/skill/SkillRegistry';
import type { SkillDef } from '../../../shared/skill/SkillTypes';
import { INSPIRED_TACTIC_MAP } from '../InspiredTacticMap';

/** 教官靈感戰法 → skill-def（trigger.mode=inspired；效果由戰場戰法庫 libraryId 解算） */
export function inspiredTacticToSkillDef(id: string): SkillDef | null {
    const entry = INSPIRED_TACTIC_MAP[id];
    if (!entry) return null;
    return {
        schema: 'skill-def.v1', id, domain: 'battle', name: entry.name, tags: ['tactic', 'inspired'],
        source: { type: 'mentor', ids: [entry.libraryId] },
        trigger: { mode: 'inspired' },
        effect: { kind: 'battleSkillRef', params: { libraryId: entry.libraryId } },
    };
}

export function createDefaultSkillRegistry(): SkillRegistry {
    const registry = new SkillRegistry().registerAll(NURTURE_SKILL_DEFS);
    for (const id of Object.keys(INSPIRED_TACTIC_MAP)) {
        const def = inspiredTacticToSkillDef(id);
        if (def && !registry.has(id)) registry.register(def);
    }
    return registry;
}

let shared: SkillRegistry | null = null;

/** 全域共用的預設定義庫（唯讀使用；測試要隔離時自己 createDefaultSkillRegistry） */
export function defaultSkillRegistry(): SkillRegistry {
    if (!shared) shared = createDefaultSkillRegistry();
    return shared;
}

/** 戰法中文名（結業彈窗等顯示用）；查無回 undefined */
export function skillNameOf(id: string): string | undefined {
    return defaultSkillRegistry().nameOf(id);
}
