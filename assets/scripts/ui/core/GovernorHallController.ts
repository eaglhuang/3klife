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

export interface GovernorHallFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
}

export interface GovernorHallDeps {
    snapshot: () => GovernorSnapshot;
}

export class GovernorHallController {
    constructor(private readonly _deps: GovernorHallDeps) {}

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
        };
        for (const flow of view.flows) {
            texts[this._flowNodeId(flow.key)] = `${flow.label}　${flow.valueText}`;
        }
        const actives: Record<string, boolean> = {};
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
