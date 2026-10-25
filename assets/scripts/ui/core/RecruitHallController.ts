// @spec-source → 使用者裁定 2026-10-25（MVP 至少 20 位武將可選）；gacha-config.json hero-pool；PROG-2-1089
/**
 * RecruitHallController — 大廳「招賢館」畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出名將池（hero-pool）全部候選：名字、五維、費用、是否已在名冊；每頁 10 位
 *   - 點某一列 → 扣金幣、入名冊；已在名冊或金幣不足時停用並說明
 *
 * 宿命池（開局六位）不動；這裡是開局後的「指名招募」，讓玩家自己挑人。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';

export interface RecruitHallFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface RecruitHallDeps {
    /** 名將池候選（已對到 generals.json 的完整資料，依池內順序） */
    candidates: () => readonly GeneralConfig[];
    /** 目前名冊的武將 id */
    ownedIds: () => ReadonlySet<string>;
    gold: () => number;
    spendGold: (amount: number) => boolean;
    /** 入名冊並存檔（GameSession.addGenerals） */
    recruit: (general: GeneralConfig) => Promise<void>;
}

export const RECRUIT_ROWS_PER_PAGE = 10;
export const RECRUIT_GOLD_COST = 3000;

function statLine(g: GeneralConfig): string {
    return `武${g.str ?? 0} 智${g.int ?? 0} 統${g.lea ?? 0} 政${g.pol ?? 0} 魅${g.cha ?? 0}`;
}

export class RecruitHallController {
    private _page = 0;
    private _notice = `每位 ${RECRUIT_GOLD_COST} 金幣，招募後直接進名冊，可出征、結緣、上陣。`;

    public constructor(private readonly _deps: RecruitHallDeps) {}

    public get page(): number { return this._page; }

    public get pageCount(): number {
        return Math.max(1, Math.ceil(this._deps.candidates().length / RECRUIT_ROWS_PER_PAGE));
    }

    public prev(): void { this._page = Math.max(0, this._page - 1); }

    public next(): void { this._page = Math.min(this.pageCount - 1, this._page + 1); }

    private _rows(): readonly GeneralConfig[] {
        const start = this._page * RECRUIT_ROWS_PER_PAGE;
        return this._deps.candidates().slice(start, start + RECRUIT_ROWS_PER_PAGE);
    }

    /** 本頁各列的武將 id（給畫面載小人頭；空列不含） */
    public rowGeneralIds(): string[] {
        return this._rows().map((g) => g.id);
    }

    public async recruitRow(index: number): Promise<boolean> {
        const general = this._rows()[index];
        if (!general) return false;
        if (this._deps.ownedIds().has(general.id)) {
            this._notice = `${general.name} 已在名冊`;
            return false;
        }
        if (!this._deps.spendGold(RECRUIT_GOLD_COST)) {
            this._notice = `金幣不足，招募 ${general.name} 需要 ${RECRUIT_GOLD_COST}`;
            return false;
        }
        await this._deps.recruit(general);
        this._notice = `${general.name} 加入麾下！`;
        return true;
    }

    public getFlowView(): RecruitHallFlowView {
        const owned = this._deps.ownedIds();
        const gold = this._deps.gold();
        const rows = this._rows();
        const texts: Record<string, string> = {};
        const actives: Record<string, boolean> = {};
        const enabled: Record<string, boolean> = {};
        for (let i = 0; i < RECRUIT_ROWS_PER_PAGE; i++) {
            const g = rows[i];
            actives[`btnRecruitRow${i}`] = !!g;
            if (!g) continue;
            const has = owned.has(g.id);
            texts[`btnRecruitRow${i}Label`] = `${g.name}　${statLine(g)}　${has ? '已在名冊' : `${RECRUIT_GOLD_COST} 金`}`;
            enabled[`btnRecruitRow${i}`] = !has && gold >= RECRUIT_GOLD_COST;
        }
        const all = this._deps.candidates();
        texts.goldLabel = `金幣 ${gold}　名將 ${all.length} 位（已招 ${all.filter((g) => owned.has(g.id)).length}）`;
        texts.pageLabel = `${this._page + 1} / ${this.pageCount}`;
        texts.noticeLabel = this._notice;
        enabled.btnPrev = this._page > 0;
        enabled.btnNext = this._page < this.pageCount - 1;
        return { texts, actives, enabled };
    }
}
