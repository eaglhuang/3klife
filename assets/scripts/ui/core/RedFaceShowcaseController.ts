// @spec-source → WBS v6 OPEN-10（紅顏池展示畫面）；新手開場規格書 第四幕（紅顏登場：與名將池分離）；PROG-2-0470
/**
 * RedFaceShowcaseController — 紅顏展示畫面的流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 用 buildRedFaceShowcase 產生展示列（PROG-2-0466），最多 RED_FACE_SHOW_MAX_ROWS 格
 *   - 記住目前選中的紅顏（預設第一位），點列時切換，右側顯示其詳情
 *   - 輸出扁平的 FlowView，key 與 red-face-showcase-main.json 的節點 id 一一對應
 *
 * Unity 對照：Presenter。列的 Button onClick 只呼叫 select()，畫面層拿 getFlowView() 一次刷新。
 */
import { OPENING_TRAVEL_TARGET_ID } from '../../core/systems/CountdownManager';
import { RedFaceTravelCopy } from '../../core/systems/RedFaceCopy';
import {
    buildRedFaceShowcase,
    RedFaceCardLike,
    RedFacePoolLike,
    RedFaceShowcaseRow,
} from '../../core/systems/RedFaceShowcase';
import { PortraitGallery, PortraitGalleryItem } from './PortraitGallery';

export const RED_FACE_SHOW_MAX_ROWS = 5;

export interface RedFaceShowcaseFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface RedFaceShowcaseDeps {
    /** 紅顏池（gacha-config.json 中 poolType 為 support 的那一筆）。 */
    pool: () => RedFacePoolLike | null;
    /** 紅顏卡資料（support-cards.json）。 */
    cards: () => readonly RedFaceCardLike[];
    /** 名將池的武將 id，展示時排除。 */
    generalPoolIds: () => readonly string[];
    /** 開場趕路中的文案；沒有趕路時回傳 null（COPY-04）。未提供時不顯示趕路文案。 */
    travelCopy?: () => RedFaceTravelCopy | null;
}

const CORE_TAG_TEXT = '核心';

/**
 * 轉蛋 Support 分頁用的 FlowView：分頁沒有關閉鈕，去掉 btnClose / btnCloseLabel。
 * Unity 對照：同一個 Presenter 輸出，不同容器只挑自己需要的欄位。
 */
export function toRedFaceTabFlowView(view: RedFaceShowcaseFlowView): RedFaceShowcaseFlowView {
    const texts = { ...view.texts };
    const enabled = { ...view.enabled };
    delete texts.btnCloseLabel;
    delete enabled.btnClose;
    return { texts, actives: view.actives, enabled };
}

/** 紅顏效果標籤中文名（support-cards.json effectTags）；查無則顯示原字串。 */
const EFFECT_TAG_LABELS: Readonly<Record<string, string>> = {
    'culture-output': '文化產出',
    'morale-recovery': '士氣回復',
    'literary-record': '文史記載',
    'diplomacy-boost': '外交加成',
    'morale-aura': '士氣光環',
    'wu-affinity': '吳國親和',
    'intelligence-boost': '智力加成',
    'wei-affinity': '魏國親和',
    'poem-inspiration': '詩文靈感',
    'morale-boost': '士氣提升',
    'sp-regen': '奧義回充',
    'water-bonus': '水戰加成',
    'tech-research': '技術研發',
    'stratagem-boost': '計略加成',
    'shu-affinity': '蜀國親和',
    'inventor': '發明家',
};

export function effectTagLabel(tag: string): string {
    return EFFECT_TAG_LABELS[tag] ?? tag;
}

export class RedFaceShowcaseController {
    private _selectedId: string | null = null;

    constructor(private readonly _deps: RedFaceShowcaseDeps) {}

    /** 展示列（已過濾、核心置頂、最多 5 格）。 */
    public rows(): RedFaceShowcaseRow[] {
        const pool = this._deps.pool();
        if (!pool) return [];
        return buildRedFaceShowcase(pool, this._deps.cards(), this._deps.generalPoolIds())
            .slice(0, RED_FACE_SHOW_MAX_ROWS);
    }

    /** 目前選中的紅顏；沒有選過或選中的已不在列中時，回退為第一位。 */
    public selected(): RedFaceShowcaseRow | null {
        const rows = this.rows();
        return rows.find(row => row.id === this._selectedId) ?? rows[0] ?? null;
    }

    /** 點列時呼叫；id 不在展示列內時忽略。 */
    public select(index: number): void {
        const row = this.rows()[index];
        if (row) this._selectedId = row.id;
    }

    /** 扁平 FlowView：key 與 red-face-showcase-main.json 的節點 id 對應。 */
    public getFlowView(): RedFaceShowcaseFlowView {
        const rows = this.rows();
        const selected = this.selected();
        const texts: Record<string, string> = {
            redFaceTitle: '紅顏池・展示',
            redFaceEmptyLabel: rows.length === 0 ? '目前沒有可展示的紅顏' : '',
            redFaceDetailName: selected?.name ?? '',
            redFaceDetailLine: selected?.previewLine ?? '',
            redFaceDetailTags: selected ? selected.effectTags.map(effectTagLabel).join(' · ') : '',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = {
            redFaceEmptyLabel: rows.length === 0,
            redFaceDetail: selected !== null,
        };
        const enabled: Record<string, boolean> = { btnClose: true };
        for (let i = 0; i < RED_FACE_SHOW_MAX_ROWS; i++) {
            const row = rows[i];
            actives[`redFaceRow${i}`] = row !== undefined;
            texts[`redFaceRow${i}Name`] = row?.name ?? '';
            texts[`redFaceRow${i}Tag`] = row?.isCore ? CORE_TAG_TEXT : '';
            enabled[`btnRedFaceRow${i}`] = row !== undefined;
            texts[`btnRedFaceRow${i}Label`] = row && row.id === selected?.id ? '檢視中' : '檢視';
        }
        return { texts, actives, enabled };
    }
}

interface RedFaceGalleryItem extends PortraitGalleryItem {
    row: RedFaceShowcaseRow;
}

/**
 * 大廳「紅顏池・展示」一頁六框全身立繪版（PROG-2-1126）；轉蛋分頁仍用上面的五列版。
 * 紅顏不截到 5 位，超過 6 位翻頁。
 */
/** 紅顏池 id 與武將立繪 id 不同名的對照（甄宓＝甄姬，立繪與臉部標記登記在 zhen-ji） */
const RED_FACE_PORTRAIT_ALIASES: Readonly<Record<string, string>> = { 'zhen-mi': 'zhen-ji' };

export class RedFaceGalleryController {
    private readonly _gallery: PortraitGallery<RedFaceGalleryItem>;

    constructor(private readonly _deps: RedFaceShowcaseDeps) {
        this._gallery = new PortraitGallery(() => {
            const pool = this._deps.pool();
            if (!pool) return [];
            return buildRedFaceShowcase(pool, this._deps.cards(), this._deps.generalPoolIds()).map((row) => ({
                id: row.id,
                name: row.name,
                sub: '',
                portraitKey: RED_FACE_PORTRAIT_ALIASES[row.id] ?? row.id,
                tag: row.isCore ? CORE_TAG_TEXT : '',
                row,
            }));
        });
    }

    public prev(): void { this._gallery.prev(); }

    public next(): void { this._gallery.next(); }

    public select(slot: number): void { this._gallery.select(slot); }

    public framePortraitKeys(): string[] {
        return this._gallery.pageItems().map((item) => item.portraitKey);
    }

    public getFlowView(): RedFaceShowcaseFlowView {
        const view = this._gallery.getView();
        const row = this._gallery.selected()?.row ?? null;
        view.texts.detailName = row?.name ?? '';
        view.texts.detailMeta = row ? row.effectTags.map(effectTagLabel).join(' · ') : '';
        view.texts.detailLine = row?.previewLine ? `「${row.previewLine}」` : '';
        view.texts.emptyLabel = row ? '' : '目前沒有可展示的紅顏';
        view.actives.emptyLabel = !row;
        // 趕路中的紅顏（甄姬／甄宓對應的開場趕路目標）詳情區改顯示趕路文案
        const travel = row ? this._deps.travelCopy?.() ?? null : null;
        if (row && travel && (RED_FACE_PORTRAIT_ALIASES[row.id] ?? row.id) === OPENING_TRAVEL_TARGET_ID) {
            view.texts.detailLine = travel.travel;
            view.texts.detailMeta = travel.countdown;
        }
        view.enabled.btnClose = true;
        return view;
    }
}
