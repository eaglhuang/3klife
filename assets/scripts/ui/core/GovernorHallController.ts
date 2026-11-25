// @spec-source → 領地治理系統.md 頂部「2026-04-26 覆寫裁定：人口、城市兵源與補兵 UI」§3~4；WBS v16.2 GOV-07（PROG-2-0977）
/**
 * GovernorHallController — 太守府畫面的流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 向呼叫端取得 GovernorSnapshot，交給 buildGovernorHallView 產生文字
 *   - 輸出扁平 FlowView，key 與 governor-hall-main.json 的節點 id 一一對應
 *
 * Unity 對照：Presenter。畫面層每次刷新只讀 getFlowView()，不自己算數字。
 */
import { buildGovernorHallView, GovernorHallView, GovernorSnapshot } from '../../core/systems/GovernorHallView';
import type { TerritoryUpgradePlan, TerritoryUpgradeRejectReason } from '../../core/systems/TerritoryUpgrade';

export interface GovernorHallFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 太守府等級與升級規劃（PROG-2-0986）：由 GameSession 的等級、格數與糧草推導。 */
export interface GovernorTerritoryInfo {
    level: number;
    maxSlots: number;
    pendingLevel: number | null;
    plan: TerritoryUpgradePlan;
    /** 上次升級被錢包拒絕（黃金不足）；為 true 時按鈕停用並提示（PROG-2-0991）。 */
    goldShortage?: boolean;
    /** 目前持有的糧草與黃金；有傳才會在「不足」提示裡一併顯示所需量與現有量。 */
    owned?: { food: number; gold: number };
}

export interface GovernorHallDeps {
    snapshot: () => GovernorSnapshot;
    territory?: () => GovernorTerritoryInfo;
    /** i18n 查字串（services().i18n.t）；沒傳或查不到時退回 zh-TW 預設字串。 */
    t?: (key: string) => string;
}

/** 黃金基礎值為 0 時的新手引導提示 key（PROG-2-9863） */
export const GOLD_HINT_KEY = 'ui.governor.goldHint';
/** 語系表未載入或沒有該 key 時的 zh-TW 預設 */
export const GOLD_HINT_FALLBACK = '城庫空空如也？去內政牆接個商業任務，錢就進來啦！';

const UPGRADE_REJECT_TEXT: Record<TerritoryUpgradeRejectReason, string> = {
    'max-level': '已達最高等級',
    'upgrade-pending': '已有待生效的升級',
    'insufficient-food': '糧草不足',
    'insufficient-gold': '黃金不足',
};

/** 未傳入等級資訊時的預設：Lv1、2 格、無待生效升級，升級按鈕不可按。 */
const DEFAULT_TERRITORY: GovernorTerritoryInfo = {
    level: 1,
    maxSlots: 2,
    pendingLevel: null,
    plan: { ok: false, reason: 'insufficient-food', targetLevel: 2, cost: { gold: 0, food: 0 } },
};

export class GovernorHallController {
    constructor(private readonly _deps: GovernorHallDeps) {}

    /** 太守府等級、格數與升級按鈕的文字；按鈕一律顯示，不可升級時停用並以文字說明原因。 */
    public territoryTexts(): { texts: Record<string, string>; enabled: Record<string, boolean> } {
        const info = this._deps.territory?.() ?? DEFAULT_TERRITORY;
        const plan = info.plan;
        const upgradeable = plan.ok && !info.goldShortage;
        const owned = info.owned;
        // 不足提示附上所需與現有，玩家才知道還差多少。
        const shortageText = (reason: TerritoryUpgradeRejectReason): string => {
            const base = UPGRADE_REJECT_TEXT[reason];
            if (!owned) return base;
            if (reason === 'insufficient-food') return `${base}（需 ${plan.cost.food}，現有 ${owned.food}）`;
            if (reason === 'insufficient-gold') return `${base}（需 ${plan.cost.gold}，現有 ${owned.gold}）`;
            return base;
        };
        const upgradeLabel = info.goldShortage
            ? shortageText('insufficient-gold')
            : plan.ok
                ? `升級至 Lv${plan.targetLevel}（金 ${plan.cost.gold}・糧草 ${plan.cost.food}）`
                : shortageText(plan.reason ?? 'insufficient-food');
        return {
            texts: {
                govLevel: `太守府 Lv${info.level}`,
                govSlots: `內政任務格 ${info.maxSlots}`,
                govPending: info.pendingLevel === null ? '' : `Lv${info.pendingLevel} 將於季結生效`,
                btnUpgradeLabel: upgradeLabel,
            },
            enabled: { btnUpgrade: upgradeable },
        };
    }

    /** 太守府視圖模型；數值全部來自 snapshot。 */
    public view(): GovernorHallView {
        return buildGovernorHallView(this._deps.snapshot());
    }

    /** 黃金提示文字：沒有經濟資料（黃金基礎值為 null）或基礎值大於 0 時不顯示。 */
    private _goldHint(snapshot: GovernorSnapshot): string | null {
        if (snapshot.gold === null || snapshot.gold.base !== 0) return null;
        const text = this._deps.t?.(GOLD_HINT_KEY);
        return text && text !== GOLD_HINT_KEY ? text : GOLD_HINT_FALLBACK;
    }

    /** 扁平 FlowView：key 與 governor-hall-main.json 的節點 id 對應。 */
    public getFlowView(): GovernorHallFlowView {
        const snapshot = this._deps.snapshot();
        const view = buildGovernorHallView(snapshot);
        const territory = this.territoryTexts();
        const goldHint = this._goldHint(snapshot);
        const texts: Record<string, string> = {
            govHallTitle: '太守府',
            govPopulation: view.populationText,
            govMorale: view.moraleText,
            govGoldTitle: view.goldCard.title,
            govGoldBase: view.goldCard.baseText,
            govGoldPopulationBonus: view.goldCard.populationBonusText,
            govGoldPolicyModifier: view.goldCard.policyModifierText,
            govGoldTotal: view.goldCard.totalText,
            govGoldHint: goldHint ?? '',
            govFoodTitle: view.foodCard.title,
            govFoodBase: view.foodCard.baseText,
            govFoodPopulationBonus: view.foodCard.populationBonusText,
            govFoodPolicyModifier: view.foodCard.policyModifierText,
            govFoodTotal: view.foodCard.totalText,
            govTroopTitle: '城市兵源',
            govTroopStock: view.cityTroopCard.stockText,
            govTroopRecruit: view.cityTroopCard.recruitText,
            govTroopRecover: view.cityTroopCard.recoverText,
            btnCloseLabel: '關閉',
            ...territory.texts,
        };
        // 現有存量與大廳頂欄、升級鈕提示同源（territory.owned），與下方「每季產出」分開標示。
        const owned = this._deps.territory?.().owned;
        texts.govStock = owned ? `現有存量　金 ${owned.gold}　糧草 ${owned.food}` : '';
        for (const flow of view.flows) {
            texts[this._flowNodeId(flow.key)] = `${flow.label}　${flow.valueText}`;
        }
        const actives: Record<string, boolean> = { btnUpgrade: true, govStock: owned !== undefined, govGoldHint: goldHint !== null };
        for (const flow of view.flows) {
            actives[this._flowNodeId(flow.key)] = true;
        }
        return { texts, actives, enabled: territory.enabled };
    }

    private _flowNodeId(key: GovernorHallView['flows'][number]['key']): string {
        switch (key) {
            case 'gold': return 'govFlowGold';
            case 'food': return 'govFlowFood';
            case 'cityTroopCap': return 'govFlowCityTroopCap';
            case 'recruitRegen': return 'govFlowRecruitRegen';
        }
    }

    /**
     * PROG-2-10038 吃醋三選項事件彈窗入口（供大廳／配偶事件觸發）
     */
    public triggerJealousyEventEntry(
        state: import('../../core/systems/JealousyAndDynastyService').JealousyState,
        option: import('../../core/systems/JealousyAndDynastyService').JealousyOption,
        year: number,
        spouseId: string,
        rollPercent: number = 99,
    ) {
        const { JealousyAndDynastyService } = require('../../core/systems/JealousyAndDynastyService');
        return JealousyAndDynastyService.resolveJealousyOption(state, option, year, spouseId, rollPercent);
    }
}
