// @spec-source → 技能系統 Base 框架規格書 (doc_spec_1187) §3.2 skill-holding、§11.6 遷移與相容；PROG-2-9204
/**
 * GeneralSkillStore — 以武將名冊實作 SkillHolderStore（單機的持有存放）。
 *
 * 戰法清單沿用 GeneralConfig.learnedTactics（戰場與配置都讀它，不動），
 * 等級、熟練度、來源另存 skillMeta；舊存檔沒有 skillMeta 時讀成「等級 1、來源 legacy」，開檔不壞。
 */
import type { GeneralConfig } from '../../models/GeneralUnit';
import type { HolderRef, SkillHolderStore, SkillHolding, SkillRecord } from '../../../shared/skill/SkillTypes';

export interface GeneralSkillRoster {
    find(id: string): GeneralConfig | undefined;
    replace(general: GeneralConfig): void;
}

export const LEGACY_SKILL_SOURCE = 'legacy';

export class GeneralSkillStore implements SkillHolderStore {
    public constructor(private readonly _roster: GeneralSkillRoster) {}

    public load(holder: HolderRef): SkillHolding | null {
        const general = this._roster.find(holder.id);
        if (!general) return null;
        const meta = general.skillMeta ?? {};
        const skills: SkillRecord[] = (general.learnedTactics ?? []).map((skillId) => {
            const m = meta[skillId];
            return { skillId, level: m?.level ?? 1, xp: m?.xp ?? 0, learnedFrom: m?.from ?? LEGACY_SKILL_SOURCE, learnedAt: m?.at ?? 0 };
        });
        return { holder, skills, modifiers: (general.skillModifiers ?? []).map((m) => ({ ...m })) };
    }

    public save(holder: HolderRef, holding: SkillHolding): void {
        const general = this._roster.find(holder.id);
        if (!general) return;
        const skillMeta: NonNullable<GeneralConfig['skillMeta']> = {};
        for (const s of holding.skills) skillMeta[s.skillId] = { level: s.level, xp: s.xp, from: s.learnedFrom, at: s.learnedAt };
        this._roster.replace({
            ...general,
            learnedTactics: holding.skills.map((s) => s.skillId),
            skillMeta,
            skillModifiers: holding.modifiers.map((m) => ({ ...m })),
        });
    }
}
