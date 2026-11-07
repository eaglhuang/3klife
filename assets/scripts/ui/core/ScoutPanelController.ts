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
}

/** 面板文案；確認框一句取自規格 §2，其餘為暫定 */
export const SCOUT_PANEL_TEXTS = {
    title: '戰前偵查',
    enemyHeading: '敵首情報',
    mechanicHeading: '核心機制',
    riskHeading: '風險標籤',
    loadoutHeading: '推薦檢核',
    noIntel: '暫無情報',
    loadoutReady: '✔ 已具備對策',
    loadoutMissing: '⚠ 缺少：{gaps}',
    loadoutRisk: '☠ 高風險：缺少{gaps}',
    loadoutNone: '本關未指定推薦對策',
    sortie: '出征',
    cancel: '暫不出征',
    confirmBody: '兵勢凶險，仍可強行出征',
    confirmYes: '強行出征',
    confirmNo: '再想想',
} as const;

/** 關卡沒填主題時，以戰場類型補核心機制（暫定） */
const BATTLE_KIND_MECHANIC: Readonly<Record<string, string>> = { siege: '攻城戰' };

/** 大廳出征前的四區塊情資；主將戰法槽轉對策標籤後比對關卡的必備與高建議（與戰場端 loadLoadoutCheck 同一套規則） */
export function buildLobbyScout(
    encounter: Readonly<EncounterConfig>,
    enemy: ScoutEnemyLeader | null,
    tacticIds: readonly string[],
    tagTable: TacticCounterTagTable,
): LobbyScout {
    const required = encounter.requiredLoadout ?? [];
    const recommended = encounter.highlyRecommendedLoadout ?? [];
    const check = checkRecommendedLoadout(loadoutTagsOf(tacticIds, tagTable), required, recommended);
    const mechanic = encounter.theme ?? (encounter.battleKind ? BATTLE_KIND_MECHANIC[encounter.battleKind] : undefined);
    // 整個關卡設定都交給防火牆，由 buildScoutPanelIntel 只挑四區塊需要的欄位
    const intel = buildScoutPanelIntel(
        { ...encounter, enemyLeader: enemy, coreMechanics: mechanic ? [mechanic] : [], riskTags: encounter.riskTags ?? [] },
        { state: check.state, gaps: check.gaps },
    );
    return { intel, hasRecommendation: required.length + recommended.length > 0 };
}

function enemyText(leader: ScoutEnemyLeader | null): string {
    if (!leader) return SCOUT_PANEL_TEXTS.noIntel;
    return [leader.name, leader.title, leader.powerGrade, leader.troopType].filter((part) => !!part).join('・');
}

export class ScoutPanelController {
    private _scout: LobbyScout | null = null;
    private _confirming = false;
    private _resolve: ((sortie: boolean) => void) | null = null;

    /** 開啟面板；前一輪還沒結束時，前一輪視為暫不出征 */
    ask(scout: LobbyScout): Promise<boolean> {
        this.cancel();
        this._scout = scout;
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

    /** 「暫不出征」或畫面中止 */
    cancel(): void {
        if (this.isOpen()) this._finish(false);
    }

    getView(): ScoutPanelView {
        const scout = this._scout;
        const intel = scout?.intel ?? null;
        const gaps = intel?.loadoutGaps.join('、') ?? '';
        const state = scout?.hasRecommendation ? intel?.loadoutState ?? null : null;
        const t = SCOUT_PANEL_TEXTS;
        return {
            texts: {
                scoutTitle: t.title,
                scoutEnemyHeading: t.enemyHeading,
                scoutEnemyBody: enemyText(intel?.enemyLeader ?? null),
                scoutMechanicHeading: t.mechanicHeading,
                scoutMechanicBody: intel && intel.coreMechanics.length > 0 ? intel.coreMechanics.join('、') : t.noIntel,
                scoutRiskHeading: t.riskHeading,
                scoutRiskBody: intel && intel.riskTags.length > 0 ? intel.riskTags.map((tag) => `【${tag}】`).join(' ') : t.noIntel,
                scoutLoadoutHeading: t.loadoutHeading,
                scoutLoadoutReady: t.loadoutReady,
                scoutLoadoutMissing: t.loadoutMissing.replace('{gaps}', gaps),
                scoutLoadoutRisk: t.loadoutRisk.replace('{gaps}', gaps),
                scoutLoadoutNone: t.loadoutNone,
                scoutSortieLabel: t.sortie,
                scoutCancelLabel: t.cancel,
                scoutConfirmBody: t.confirmBody,
                scoutConfirmYesLabel: t.confirmYes,
                scoutConfirmNoLabel: t.confirmNo,
            },
            actives: {
                scoutLoadoutReady: state === 'ready',
                scoutLoadoutMissing: state === 'missing',
                scoutLoadoutRisk: state === 'high-risk',
                scoutLoadoutNone: state === null,
                scoutConfirm: this.isConfirming(),
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
        this._confirming = false;
        resolve?.(sortie);
    }
}
