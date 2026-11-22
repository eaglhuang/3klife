// @spec-source → 技能系統 Base 框架規格書 (doc_spec_1187) §2 技能定義、§4 ISkillSourceAdapter；PROG-2-9204
/**
 * SkillRegistry — 技能定義庫（零依賴）。
 *
 * 啟動時把各來源（學府戰法、戰法庫、教官靈感…）轉成 SkillDef 註冊進來；
 * 新增技能只需新增資料，不改程式。顯示名稱一律從這裡查（結業彈窗不再顯示原始 id）。
 */
import type { SkillDef, SkillDomain } from './SkillTypes';

export class SkillRegistry {
    private readonly _defs = new Map<string, SkillDef>();

    /** 註冊（同 id 後者覆蓋，方便資料覆寫） */
    public register(def: SkillDef): this {
        if (!def.id) throw new Error('[SkillRegistry] 技能 id 不可為空');
        this._defs.set(def.id, def);
        return this;
    }

    public registerAll(defs: readonly SkillDef[]): this {
        for (const def of defs) this.register(def);
        return this;
    }

    public has(id: string): boolean {
        return this._defs.has(id);
    }

    public get(id: string): SkillDef | undefined {
        return this._defs.get(id);
    }

    public list(domain?: SkillDomain): SkillDef[] {
        const all = Array.from(this._defs.values());
        return domain ? all.filter((d) => d.domain === domain) : all;
    }

    /** 中文顯示名；查無定義回 undefined，由呼叫端決定備援 */
    public nameOf(id: string): string | undefined {
        return this._defs.get(id)?.name;
    }

    /** 最高等級（沒有等級表＝1） */
    public maxLevelOf(id: string): number {
        const levels = this._defs.get(id)?.levels;
        return levels && levels.length > 0 ? levels[levels.length - 1].lv : 1;
    }
}
