// @spec-source → 趙家槍法血脈戰法三段穿透遞增數值規格書.md（doc_spec_0361）§1、§4、§5；PROG-2-2047
/**
 * ZhaoSpearGate — 趙家槍法的血統裝備限制、教官傳承門檻與三刺戰報文字（純邏輯，不依賴 cc）
 *
 * 幾何與三段倍率已在 battle/skills/BattleSkillProfiles 'zhao-yun-pierce'（[1.0, 1.2, 1.4]）實作，本檔不重複。
 * - §4-1 需血脈標籤 BLOOD_ZHAO，或祖先譜系含 zhao-yun；不符時灰化並提示。
 * - §4-2 趙雲任教官時，只有趙氏子嗣頓悟可解鎖。
 * - §5 戰報：「趙家槍法連環三刺，造成 X / Y / Z 點貫穿傷害！」
 */

export const ZHAO_SPEAR_SKILL_ID = 'TAC_ZHAO_SPEAR';
export const ZHAO_SPEAR_BATTLE_SKILL_ID = 'zhao-yun-pierce';
export const ZHAO_SPEAR_BLOODLINE_TAG = 'BLOOD_ZHAO';
export const ZHAO_SPEAR_ANCESTOR_ID = 'zhao-yun';
export const ZHAO_SPEAR_LOG_KEY = 'skill.zhao_yun_pierce.hit';
export const ZHAO_SPEAR_DENIED_HINT = '非趙氏血脈不可修行此槍法';

export interface ZhaoSpearCandidate {
    bloodlineTags?: readonly string[];
    /** 傳承譜系所有祖先的武將模板 id */
    ancestorIds?: readonly string[];
}

export function hasZhaoBloodline(candidate: ZhaoSpearCandidate): boolean {
    return (candidate.bloodlineTags ?? []).indexOf(ZHAO_SPEAR_BLOODLINE_TAG) >= 0
        || (candidate.ancestorIds ?? []).indexOf(ZHAO_SPEAR_ANCESTOR_ID) >= 0;
}

export type ZhaoSpearEquipCheck = { allowed: true } | { allowed: false; disabled: true; hint: string };

/** §4-1 出陣編制檢核：不符者灰化禁用 */
export function checkZhaoSpearEquip(candidate: ZhaoSpearCandidate): ZhaoSpearEquipCheck {
    return hasZhaoBloodline(candidate) ? { allowed: true } : { allowed: false, disabled: true, hint: ZHAO_SPEAR_DENIED_HINT };
}

/** §4-2 學府頓悟：教官是趙雲時，只有趙氏子嗣能解鎖本槍法；其他教官不經此門檻 */
export function canInheritZhaoSpear(instructorTemplateId: string, student: ZhaoSpearCandidate): boolean {
    if (instructorTemplateId !== ZHAO_SPEAR_ANCESTOR_ID) return false;
    return hasZhaoBloodline(student);
}

/** §5 三段個別跳字與合計 */
export function formatZhaoSpearLog(stageDamages: readonly number[]): { text: string; total: number } {
    const parts = [0, 1, 2].map((i) => Math.max(0, Math.floor(stageDamages[i] ?? 0)));
    return { text: `趙家槍法連環三刺，造成 ${parts.join(' / ')} 點貫穿傷害！`, total: parts[0] + parts[1] + parts[2] };
}
