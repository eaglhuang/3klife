// @spec-source → 傭兵系統（試用）文案表；WBS MERC-07；PROG-2-0471
/**
 * MercenaryPanelController — 傭兵面板的畫面流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 列出目前的傭兵（最多 MERC_PANEL_MAX_ROWS 格），記住選中的一位（預設第一位）
 *   - 以 buildMercenaryPanelView 產生倒數、進度、名牌、確認與告別文字
 *   - 結義按鈕只在 bondEnabled 時可按；點數不足時只提示，不呼叫結義
 *   - 輸出扁平 FlowView，key 與 mercenary-panel-main.json 的節點 id 一一對應
 *
 * Unity 對照：Presenter。Button onClick 只呼叫 select() / bond()，畫面層拿 getFlowView() 一次刷新。
 */
import type { BondRarity } from '../../core/systems/MercenaryBondPermanent';
import { MercenaryState } from '../../core/systems/MercenaryBond';
import { buildMercenaryPanelView, MercenaryPanelView } from '../../core/systems/MercenaryPanelView';

export const MERC_PANEL_MAX_ROWS = 6;

export interface MercenaryPanelFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 呼叫端提供的武將顯示資料；原主與稀有度尚無正式來源時由呼叫端給預設值。 */
export interface MercenaryDisplayInfo {
    originalOwnerName: string;
    generalName: string;
    rarity: BondRarity;
}

export interface MercenaryPanelDeps {
    mercenaries: () => readonly MercenaryState[];
    info: (state: Readonly<MercenaryState>) => MercenaryDisplayInfo;
    bondPoints: () => number;
    /** 結義：回傳是否成功；失敗時由畫面提示。 */
    bond: (uid: string) => Promise<boolean>;
}

export class MercenaryPanelController {
    private _selectedUid: string | null = null;
    private _notice: string | null = null;

    constructor(private readonly _deps: MercenaryPanelDeps) {}

    /** 傭兵列（最多 6 格）。 */
    public rows(): MercenaryState[] {
        return this._deps.mercenaries().slice(0, MERC_PANEL_MAX_ROWS);
    }

    /** 目前選中的傭兵；沒選過或已不在列中時回退為第一位。 */
    public selected(): MercenaryState | null {
        const rows = this.rows();
        return rows.find(row => row.uid === this._selectedUid) ?? rows[0] ?? null;
    }

    /** 名牌點擊時呼叫：依 uid 選取；不在列中時回傳 false 且不變動。 */
    public selectUid(uid: string): boolean {
        const row = this.rows().find(item => item.uid === uid);
        if (!row) return false;
        this._selectedUid = row.uid;
        this._notice = null;
        return true;
    }

    /** 點列時呼叫；索引超出列時忽略。 */
    public select(index: number): void {
        const row = this.rows()[index];
        if (row) {
            this._selectedUid = row.uid;
            this._notice = null;
        }
    }

    /** 面板文字與按鈕狀態；沒有傭兵時回傳 null。 */
    public view(): MercenaryPanelView | null {
        const state = this.selected();
        if (!state) return null;
        const info = this._deps.info(state);
        return buildMercenaryPanelView(state, {
            originalOwnerName: info.originalOwnerName,
            generalName: info.generalName,
            bondPoints: this._deps.bondPoints(),
            rarity: info.rarity,
        });
    }

    /** 結義選中的傭兵；按鈕不可用或點數不足時只設提示，不呼叫 bond。 */
    public async bondSelected(): Promise<boolean> {
        const state = this.selected();
        const view = this.view();
        if (!state || !view) return false;
        if (view.insufficientPoints) {
            this._notice = '結義點數不足';
            return false;
        }
        if (!view.bondEnabled) {
            this._notice = '尚未完成六日試用，無法結義';
            return false;
        }
        const ok = await this._deps.bond(state.uid);
        this._notice = ok ? null : '結義失敗，請稍後再試';
        return ok;
    }

    /** 扁平 FlowView：key 與 mercenary-panel-main.json 的節點 id 對應。 */
    public getFlowView(): MercenaryPanelFlowView {
        const rows = this.rows();
        const selected = this.selected();
        const view = this.view();
        const texts: Record<string, string> = {
            mercPanelTitle: '傭兵・結義',
            mercEmptyLabel: rows.length === 0 ? '目前沒有傭兵' : '',
            mercCountdown: view?.countdownText ?? '',
            mercBond: view ? `${view.bondText}　${view.illustrationText}` : '',
            mercNametag: view?.nametagText ?? '',
            mercConfirm: view?.confirmText ?? '',
            mercFarewell: view?.farewellText ?? '',
            mercNotice: this._notice ?? (view?.insufficientPoints ? '結義點數不足' : ''),
            btnMercBondLabel: view ? `結義（${view.bondPointCost} 點）` : '結義',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = {
            mercEmptyLabel: rows.length === 0,
            mercDetail: selected !== null,
            mercConfirm: view?.confirmText != null,
            mercFarewell: view?.farewellText != null,
            mercNotice: texts.mercNotice !== '',
        };
        const enabled: Record<string, boolean> = {
            btnClose: true,
            btnMercBond: view?.bondEnabled ?? false,
        };
        for (let i = 0; i < MERC_PANEL_MAX_ROWS; i++) {
            const row = rows[i];
            actives[`mercRow${i}`] = row !== undefined;
            texts[`mercRow${i}Name`] = row ? this._deps.info(row).generalName : '';
            texts[`btnMercRow${i}Label`] = row && row.uid === selected?.uid ? '檢視中' : '選取';
            enabled[`btnMercRow${i}`] = row !== undefined;
        }
        return { texts, actives, enabled };
    }
}
