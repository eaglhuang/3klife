// @spec-source → 戰前情報偵查面板與戰法對策槽位容量規格書 (doc_spec_0347) §1~§2；WBS LVL-03；PROG-2-2076
/**
 * ScoutPanelController — 大廳出征前的戰前偵查面板（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 把目前關卡、敵將與主將戰法槽組成四區塊情資（敵首情報／核心機制／風險標籤／推薦檢核）
 *   - 情資一律經 ScoutIntel.buildScoutPanelIntel，站位、埋伏、AI 路徑不進面板（§1 防火牆）
 *   - 高風險時按「出征」先跳【兵勢凶險，仍可強行出征】確認，絕不鎖死出征（§2）
 *   - ask() 回傳 Promise：出征 resolve true，暫不出征 resolve false
 *
 * 所有 texts / actives / enabled 的 key 都等於 scout-panel-main.json 的節點 id，
 * tests/ScoutPanel.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Sortie / Confirm / Back / Cancel，畫面層拿 GetView() 一次刷新。
 */
import type { EncounterConfig } from '../../shared/BattleEntryParams';
import { checkRecommendedLoadout, loadoutTagsOf, type TacticCounterTagTable } from '../../core/systems/LoadoutCheck';
import { stageThemeMechanicNotes } from '../../core/systems/StageThemeIntel';
import { buildScoutPanelIntel, scoutSortieAction, type ScoutEnemyLeader, type ScoutPanelIntel } from '../../core/systems/ScoutIntel';

export interface ScoutPanelView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface LobbyScout {
    intel: ScoutPanelIntel;
    /** 關卡有填必備或高建議對策；沒填時推薦檢核顯示「未指定」 */
    hasRecommendation: boolean;
    /** 本場天氣一行（PROG-2-9735，例「天氣：大霧（遠程命中 -30%、火計禁用）」）；與戰場讀到的是同一個結果 */
    weatherLine?: string;
}

/**
 * 面板文案（zh-TW 預設；實際顯示走 i18n 的 scout.* 鍵，四語系；lookup 取不到時才用本表）。
 * 確認框一句取自規格 §2；PROG-2-10073 起風險措辭改白話降噪（不用骷髏、不嚇新手），出征兩次確認與預設「再想想」不變。
 */
export const SCOUT_PANEL_TEXTS = {
    title: '戰前偵查',
    enemyHeading: '敵首情報',
    mechanicHeading: '核心機制',
    riskHeading: '風險標籤',
    loadoutHeading: '推薦檢核',
    noIntel: '尚未偵查：目前沒有可用情報，未列出不代表沒有風險。',
    loadoutReady: '✔ 已具備對策',
    loadoutMissing: '⚠ 可再加強：{gaps}',
    loadoutRisk: '⚠ 建議先換上：{gaps}；不換也能打，只是會比較吃力',
    loadoutNone: '本關未指定推薦對策',
    loadoutHelpDefault: '對策比對的是目前主將已裝備的戰法，不是整個背包；仍可自行決定是否出征。',
    loadoutHelp: '怎麼換：回大廳→武將→主將→「技」，裝上有【{gaps}】標記的戰法（背包有但沒裝備不算）。還沒有也沒關係，可以直接出征。',
    sortie: '出征',
    cancel: '暫不出征',
    confirmBody: '兵勢凶險，仍可強行出征',
    confirmYes: '強行出征',
    confirmNo: '再想想',
    autofillBtn: '幫我換上',
    autofillUndo: '復原',
    autofillPreview: '將換上：{0}',
    autofillDone: '已換上：{0}',
    autofillSwap: '【{0}】取代【{1}】',
    autofillFill: '【{0}】補空槽',
    autofillNone: '尚未持有可補缺口的戰法，先照常出征',
    autofillBlocked: '戰法槽都排著本關用得到的戰法，先照常出征',
} as const;

/** 對策標籤的白話說明（新手看不懂「破城」「反隱」）；鍵＝i18n scout.tag.<code>，值＝zh-TW 預設 */
const TAG_PLAIN: Readonly<Record<string, { code: string; hint: string }>> = {
    破城: { code: 'siege', hint: '攻城門用' },
    反隱: { code: 'anti_stealth', hint: '識破伏兵' },
    突破: { code: 'breakthrough', hint: '衝破敵陣' },
    避水陣: { code: 'anti_water', hint: '防水攻' },
    夜戰: { code: 'night', hint: '夜間作戰' },
    水攻: { code: 'water', hint: '水淹敵軍' },
    火攻: { code: 'fire', hint: '火燒敵軍' },
    遠攻: { code: 'ranged', hint: '遠程攻擊' },
    守城: { code: 'defend', hint: '固守城池' },
    鼓舞: { code: 'rally', hint: '提振士氣' },
    抗混亂: { code: 'anti_chaos', hint: '抵抗混亂' },
    牽制: { code: 'pin', hint: '拖住敵人' },
    直取敵首: { code: 'snipe', hint: '直攻敵將' },
};

/** i18n 查詢函式（services().i18n.t 的形狀）；回傳等於 key 視為沒有翻譯 */
export type ScoutTextLookup = (key: string, ...args: string[]) => string;

/** 關卡沒填主題時，以戰場類型補核心機制（暫定） */
const BATTLE_KIND_MECHANIC: Readonly<Record<string, string>> = { siege: '攻城戰' };

/** 「幫我換上」預覽：每一筆是換上哪招、換下哪招（補空槽為 null）；名稱由呼叫端轉好 */
export interface AutofillPreview {
    changes: { inName: string; outName: string | null }[];
    /** 有缺口但背包沒有可補的戰法 */
    nothingOwned: boolean;
    /** 有可補的戰法，但槽位全被本關用得到的戰法佔滿 */
    slotsBlocked: boolean;
}

/** 「幫我換上」的三個動作（PROG-2-10135）：預覽不動資料；apply 寫入並回傳重算後的情資；undo 還原並回傳情資 */
export interface ScoutAutofillHooks {
    preview(): AutofillPreview;
    apply(): LobbyScout;
    undo(): LobbyScout;
}

/** 大廳出征前的四區塊情資；主將戰法槽轉對策標籤後比對關卡的必備與高建議（與戰場端 loadLoadoutCheck 同一套規則） */
export function buildLobbyScout(
    encounter: Readonly<EncounterConfig>,
    enemy: ScoutEnemyLeader | null,
    tacticIds: readonly string[],
    tagTable: TacticCounterTagTable,
    weatherLine?: string,
): LobbyScout {
    const required = encounter.requiredLoadout ?? [];
    const recommended = encounter.highlyRecommendedLoadout ?? [];
    const check = checkRecommendedLoadout(loadoutTagsOf(tacticIds, tagTable), required, recommended);
    const mechanic = encounter.theme ?? (encounter.battleKind ? BATTLE_KIND_MECHANIC[encounter.battleKind] : undefined);
    // 整個關卡設定都交給防火牆，由 buildScoutPanelIntel 只挑四區塊需要的欄位
    const intel = buildScoutPanelIntel(
        { ...encounter, enemyLeader: enemy, coreMechanics: [...(mechanic ? [mechanic] : []), ...stageThemeMechanicNotes(encounter.stageThemeId)], riskTags: encounter.riskTags ?? [] },
        { state: check.state, gaps: check.gaps },
    );
    return { intel, hasRecommendation: required.length + recommended.length > 0, ...(weatherLine ? { weatherLine } : {}) };
}

function enemyText(leader: ScoutEnemyLeader | null): string {
    if (!leader) return SCOUT_PANEL_TEXTS.noIntel;
    return [leader.name, leader.title, leader.powerGrade, leader.troopType].filter((part) => !!part).join('・');
}

export class ScoutPanelController {
    private _scout: LobbyScout | null = null;
    private _confirming = false;
    private _resolve: ((sortie: boolean) => void) | null = null;
    private _hooks: ScoutAutofillHooks | null = null;
    /** 已按過「幫我換上」：保存當時列出的換上清單，按鈕改成「復原」 */
    private _applied: AutofillPreview | null = null;

    constructor(private readonly _lookup?: ScoutTextLookup) {}

    /** 文案取 i18n scout.<key>；沒接 lookup 或查不到就用 zh-TW 預設，{gaps} 以 {0} 傳入 */
    private _text(key: keyof typeof SCOUT_PANEL_TEXTS, gaps?: string): string {
        const fallback = SCOUT_PANEL_TEXTS[key];
        const i18nKey = `scout.${key}`;
        const found = this._lookup ? this._lookup(i18nKey, gaps ?? '') : i18nKey;
        const text = found && found !== i18nKey ? found : fallback;
        return gaps === undefined ? text : text.replace('{gaps}', gaps).replace('{0}', gaps);
    }

    /** 缺口標籤改白話：「破城（攻城門用）」；查不到白話就只顯示標籤本身 */
    private _gapLabel(tag: string): string {
        const plain = TAG_PLAIN[tag];
        if (!plain) return tag;
        const key = `scout.tag.${plain.code}`;
        const hint = this._lookup ? this._lookup(key) : key;
        return `${tag}（${hint && hint !== key ? hint : plain.hint}）`;
    }

    /** 開啟面板；前一輪還沒結束時，前一輪視為暫不出征 */
    ask(scout: LobbyScout, hooks?: ScoutAutofillHooks): Promise<boolean> {
        this.cancel();
        this._scout = scout;
        this._hooks = hooks ?? null;
        this._applied = null;
        this._confirming = false;
        return new Promise((resolve) => { this._resolve = resolve; });
    }

    isOpen(): boolean {
        return this._resolve !== null;
    }

    isConfirming(): boolean {
        return this.isOpen() && this._confirming;
    }

    /** 按「出征」：高風險先進確認框（回傳 false，面板不關），其餘直接出征（回傳 true，面板該關閉） */
    sortie(): boolean {
        if (!this.isOpen() || !this._scout) return true;
        if (!this._confirming && scoutSortieAction(this._scout.intel.loadoutState) === 'confirm-then-sortie') {
            this._confirming = true;
            return false;
        }
        this._finish(true);
        return true;
    }

    /** 確認框「強行出征」 */
    confirm(): void {
        if (this.isOpen()) this._finish(true);
    }

    /** 確認框「再想想」：回到偵查面板 */
    back(): void {
        this._confirming = false;
    }

    /** 「幫我換上」／「復原」：換上一律由玩家按下才執行，預覽與結果都列出換上與換下的戰法（PROG-2-10135） */
    autofill(): void {
        if (!this.isOpen() || this._confirming || !this._hooks) return;
        if (this._applied) {
            this._scout = this._hooks.undo();
            this._applied = null;
            return;
        }
        const preview = this._hooks.preview();
        if (preview.changes.length === 0) return;
        this._scout = this._hooks.apply();
        this._applied = preview;
    }

    isAutofillApplied(): boolean {
        return this._applied !== null;
    }

    private _autofillLines(preview: AutofillPreview): string {
        return preview.changes
            .map((c) => (c.outName === null ? this._text('autofillFill', c.inName) : this._text('autofillSwap', c.inName).replace('{1}', c.outName)))
            .join('、');
    }

    /** 換上區的提示列與按鈕狀態；沒有掛鉤、沒有缺口時整列隱藏 */
    private _autofillView(): { note: string; btn: string; show: boolean } {
        const hidden = { note: '', btn: '', show: false };
        if (!this._hooks || !this._scout) return hidden;
        if (this._applied) {
            return { note: this._text('autofillDone', this._autofillLines(this._applied)), btn: this._text('autofillUndo'), show: true };
        }
        if (this._scout.intel.loadoutGaps.length === 0) return hidden;
        const preview = this._hooks.preview();
        if (preview.changes.length > 0) {
            return { note: this._text('autofillPreview', this._autofillLines(preview)), btn: this._text('autofillBtn'), show: true };
        }
        if (preview.slotsBlocked) return { note: this._text('autofillBlocked'), btn: '', show: false };
        return { note: this._text('autofillNone'), btn: '', show: false };
    }

    /** 「暫不出征」或畫面中止 */
    cancel(): void {
        if (this.isOpen()) this._finish(false);
    }

    getView(): ScoutPanelView {
        const scout = this._scout;
        const intel = scout?.intel ?? null;
        const gaps = (intel?.loadoutGaps ?? []).map((tag) => this._gapLabel(tag)).join('、');
        const state = scout?.hasRecommendation ? intel?.loadoutState ?? null : null;
        const tx = (key: keyof typeof SCOUT_PANEL_TEXTS): string => this._text(key);
        const autofill = this._autofillView();
        return {
            texts: {
                scoutTitle: tx('title'),
                scoutEnemyHeading: tx('enemyHeading'),
                scoutEnemyBody: intel?.enemyLeader ? enemyText(intel.enemyLeader) : tx('noIntel'),
                // 本場天氣接在標題後同一行（沿用既有欄位，不動版面；機制內文已經很長，放內文會被縮到看不清）
                scoutMechanicHeading: scout?.weatherLine ? `${tx('mechanicHeading')}　${scout.weatherLine}` : tx('mechanicHeading'),
                scoutMechanicBody: intel && intel.coreMechanics.length > 0 ? intel.coreMechanics.join('、') : tx('noIntel'),
                scoutRiskHeading: tx('riskHeading'),
                scoutRiskBody: intel && intel.riskTags.length > 0 ? intel.riskTags.map((tag) => `【${tag}】`).join(' ') : tx('noIntel'),
                scoutLoadoutHeading: tx('loadoutHeading'),
                scoutLoadoutHelp: intel?.loadoutGaps.length ? this._text('loadoutHelp', intel.loadoutGaps.join('、')) : tx('loadoutHelpDefault'),
                scoutLoadoutReady: tx('loadoutReady'),
                scoutLoadoutMissing: this._text('loadoutMissing', gaps),
                scoutLoadoutRisk: this._text('loadoutRisk', gaps),
                scoutLoadoutNone: tx('loadoutNone'),
                scoutSortieLabel: tx('sortie'),
                scoutCancelLabel: tx('cancel'),
                scoutConfirmBody: tx('confirmBody'),
                scoutConfirmYesLabel: tx('confirmYes'),
                scoutConfirmNoLabel: tx('confirmNo'),
                scoutAutofillNote: autofill.note,
                scoutAutofillLabel: autofill.btn,
            },
            actives: {
                scoutLoadoutReady: state === 'ready',
                scoutLoadoutMissing: state === 'missing',
                scoutLoadoutRisk: state === 'high-risk',
                scoutLoadoutNone: state === null,
                scoutConfirm: this.isConfirming(),
                btnScoutAutofill: autofill.show && !this.isConfirming(),
            },
            // 出征按鈕任何一態都可按（§2 不鎖死）；確認框開著時底下兩顆先停用
            enabled: {
                btnScoutSortie: !this.isConfirming(),
                btnScoutCancel: !this.isConfirming(),
            },
        };
    }

    private _finish(sortie: boolean): void {
        const resolve = this._resolve;
        this._resolve = null;
        this._hooks = null;
        this._applied = null;
        this._confirming = false;
        resolve?.(sortie);
    }
}

/** 僅提供裝備路徑，不虛構玩家持有的戰法或敵軍站位（預設 zh-TW；畫面走 ScoutPanelController 的 i18n 版） */
export function scoutLoadoutHelp(gaps: readonly string[]): string {
    if (gaps.length === 0) return '';
    return SCOUT_PANEL_TEXTS.loadoutHelp.replace('{gaps}', gaps.join('、'));
}
