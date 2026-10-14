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
import {
    buildRedFaceShowcase,
    RedFaceCardLike,
    RedFacePoolLike,
    RedFaceShowcaseRow,
} from '../../core/systems/RedFaceShowcase';

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
}

const CORE_TAG_TEXT = '核心';

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
            redFaceDetailTags: selected ? selected.effectTags.join(' · ') : '',
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
