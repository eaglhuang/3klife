// @spec-source → 使用者裁定 2026-10-25（MVP 至少 20 位武將可選）；gacha-config.json hero-pool；PROG-2-1089
/**
 * RecruitHallController — 大廳「招賢館」畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 名將池（hero-pool）一頁六框全身立繪（PortraitGallery，PROG-2-1126）；點框選人
 *   - 下方詳情列顯示五維；按「招募」→ 扣金幣、入名冊；已在名冊或金幣不足時停用並說明
 *
 * 宿命池（開局六位）不動；這裡是開局後的「指名招募」，讓玩家自己挑人。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { PORTRAIT_GALLERY_PAGE_SIZE, PortraitGallery, PortraitGalleryItem } from './PortraitGallery';

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

export const RECRUIT_ROWS_PER_PAGE = PORTRAIT_GALLERY_PAGE_SIZE;
export const RECRUIT_GOLD_COST = 3000;

function statLine(g: GeneralConfig): string {
    return `武${g.str ?? 0} 智${g.int ?? 0} 統${g.lea ?? 0} 政${g.pol ?? 0} 魅${g.cha ?? 0}`;
}

interface RecruitItem extends PortraitGalleryItem {
    general: GeneralConfig;
}

export class RecruitHallController {
    private readonly _gallery: PortraitGallery<RecruitItem>;
    private _notice = `每位 ${RECRUIT_GOLD_COST} 金幣，招募後直接進名冊，可出征、結緣、上陣。`;

    public constructor(private readonly _deps: RecruitHallDeps) {
        this._gallery = new PortraitGallery(() => {
            const owned = this._deps.ownedIds();
            return this._deps.candidates().map((general) => ({
                id: general.id,
                name: general.name,
                sub: owned.has(general.id) ? '已在名冊' : `${RECRUIT_GOLD_COST} 金`,
                portraitKey: general.id,
                tag: '',
                general,
            }));
        });
    }

    public get page(): number { return this._gallery.page; }

    public get pageCount(): number { return this._gallery.pageCount; }

    public prev(): void { this._gallery.prev(); }

    public next(): void { this._gallery.next(); }

    public select(slot: number): void { this._gallery.select(slot); }

    /** 本頁各框的立繪 key（空框不含） */
    public framePortraitKeys(): string[] {
        return this._gallery.pageItems().map((item) => item.portraitKey);
    }

    /** 選本頁第 index 框並招募（測試與舊呼叫端用） */
    public async recruitRow(index: number): Promise<boolean> {
        if (!this._gallery.pageItems()[index]) return false;
        this._gallery.select(index);
        return this.recruitSelected();
    }

    public async recruitSelected(): Promise<boolean> {
        const general = this._gallery.selected()?.general;
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
        const view = this._gallery.getView();
        const general = this._gallery.selected()?.general ?? null;
        const has = !!general && owned.has(general.id);
        const all = this._deps.candidates();
        view.texts.goldLabel = `金幣 ${gold}　名將 ${all.length} 位（已招 ${all.filter((g) => owned.has(g.id)).length}）`;
        view.texts.detailName = general?.name ?? '';
        view.texts.detailMeta = general ? statLine(general) : '';
        view.texts.btnRecruitLabel = has ? '已在名冊' : `招募（${RECRUIT_GOLD_COST} 金）`;
        view.texts.noticeLabel = this._notice;
        view.enabled.btnRecruit = !!general && !has && gold >= RECRUIT_GOLD_COST;
        return view;
    }
}
