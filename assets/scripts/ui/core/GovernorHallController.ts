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
}

/** 太守府等級與升級規劃（PROG-2-0986）：由 GameSession 的等級、格數與糧草推導。 */
export interface GovernorTerritoryInfo {
    level: number;
    maxSlots: number;
    pendingLevel: number | null;
    plan: TerritoryUpgradePlan;
}

export interface GovernorHallDeps {
    snapshot: () => GovernorSnapshot;
    territory?: () => GovernorTerritoryInfo;
}

const UPGRADE_REJECT_TEXT: Record<TerritoryUpgradeRejectReason, string> = {
    'max-level': '已達最高等級',
    'upgrade-pending': '已有待生效的升級',
    'insufficient-food': '糧草不足',
    'insufficient-gold': '金錢不足',
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

    /** 太守府等級、格數與升級按鈕的文字；按鈕可否只看規劃結果。 */
    public territoryTexts(): { texts: Record<string, string>; actives: Record<string, boolean> } {
        const info = this._deps.territory?.() ?? DEFAULT_TERRITORY;
        const plan = info.plan;
        const upgradeLabel = plan.ok
            ? `升級至 Lv${plan.targetLevel}（金 ${plan.cost.gold}・糧 ${plan.cost.food}）`
            : UPGRADE_REJECT_TEXT[plan.reason ?? 'insufficient-food'];
        return {
            texts: {
                govLevel: `太守府 Lv${info.level}`,
                govSlots: `內政任務格 ${info.maxSlots}`,
                govPending: info.pendingLevel === null ? '' : `Lv${info.pendingLevel} 將於季結生效`,
                btnUpgradeLabel: upgradeLabel,
            },
            actives: { btnUpgrade: plan.ok },
        };
    }

    /** 太守府視圖模型；數值全部來自 snapshot。 */
    public view(): GovernorHallView {
        return buildGovernorHallView(this._deps.snapshot());
    }

    /** 扁平 FlowView：key 與 governor-hall-main.json 的節點 id 對應。 */
    public getFlowView(): GovernorHallFlowView {
        const view = this.view();
        const texts: Record<string, string> = {
            govHallTitle: '太守府',
            govPopulation: view.populationText,
            govMorale: view.moraleText,
            govGoldTitle: view.goldCard.title,
            govGoldBase: view.goldCard.baseText,
            govGoldPopulationBonus: view.goldCard.populationBonusText,
            govGoldPolicyModifier: view.goldCard.policyModifierText,
            govGoldTotal: view.goldCard.totalText,
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
            ...this.territoryTexts().texts,
        };
        for (const flow of view.flows) {
            texts[this._flowNodeId(flow.key)] = `${flow.label}　${flow.valueText}`;
        }
        const actives: Record<string, boolean> = { ...this.territoryTexts().actives };
        for (const flow of view.flows) {
            actives[this._flowNodeId(flow.key)] = true;
        }
        return { texts, actives };
    }

    private _flowNodeId(key: GovernorHallView['flows'][number]['key']): string {
        switch (key) {
            case 'gold': return 'govFlowGold';
            case 'food': return 'govFlowFood';
            case 'cityTroopCap': return 'govFlowCityTroopCap';
            case 'recruitRegen': return 'govFlowRecruitRegen';
        }
    }
}
