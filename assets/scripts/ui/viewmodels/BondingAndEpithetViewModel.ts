import uiLayoutConfig from '../../../resources/data/ui/bonding-epithet-ui-layout.json';
import { BondingProbabilityBreakdown } from '../../core/systems/BondingSuccessService';

export interface BondingBreakdownRowVM {
    labelKey: string;
    labelFallback: string;
    valueText: string;
    isPositive: boolean;
}

export interface BondingBreakdownPanelVM {
    skinToken: string;
    totalRateText: string;
    rows: BondingBreakdownRowVM[];
    layoutRegion: typeof uiLayoutConfig.regions.bondingBreakdownPanel;
}

export interface EpithetRevealCardVM {
    skinToken: string;
    age: number;
    stageKey: string;
    titleKey: string;
    bodyText: string;
    isBonusActive: boolean;
    layoutRegion: typeof uiLayoutConfig.regions.epithetRevealCard;
}

/**
 * 結緣成功率公式分項 UI 與小名 8/12/15 歲三段揭曉 ViewModel（PROG-2-10036）
 * 遵守 UI 規定：使用相對比例區域資料檔、預留皮膚 token、文字走 i18n 鍵。
 */
export class BondingAndEpithetViewModel {
    private static formatSignedPercent(val: number): string {
        return val >= 0 ? `+${val}%` : `${val}%`;
    }

    public static buildBondingBreakdownVM(breakdown: BondingProbabilityBreakdown): BondingBreakdownPanelVM {
        return {
            skinToken: uiLayoutConfig.skinToken,
            totalRateText: `${breakdown.finalRate}%`,
            layoutRegion: uiLayoutConfig.regions.bondingBreakdownPanel,
            rows: [
                {
                    labelKey: 'ui.bonding.breakdown.base',
                    labelFallback: '基礎',
                    valueText: `${breakdown.base}%`,
                    isPositive: true,
                },
                {
                    labelKey: 'ui.bonding.breakdown.compatibility',
                    labelFallback: '相性',
                    valueText: this.formatSignedPercent(breakdown.compatibility),
                    isPositive: breakdown.compatibility >= 0,
                },
                {
                    labelKey: 'ui.bonding.breakdown.favor',
                    labelFallback: '好感',
                    valueText: this.formatSignedPercent(breakdown.favor),
                    isPositive: breakdown.favor >= 0,
                },
                {
                    labelKey: 'ui.bonding.breakdown.sincerity',
                    labelFallback: '誠意',
                    valueText: this.formatSignedPercent(breakdown.sincerity),
                    isPositive: breakdown.sincerity >= 0,
                },
                {
                    labelKey: 'ui.bonding.breakdown.matchmaker',
                    labelFallback: '媒人',
                    valueText: this.formatSignedPercent(breakdown.matchmaker),
                    isPositive: breakdown.matchmaker >= 0,
                },
            ],
        };
    }

    public static buildEpithetRevealVM(params: {
        age: number;
        stage: 'hidden' | 'omen_8' | 'trait_12' | 'revealed_15';
        displayText: string;
        isBonusActive: boolean;
    }): EpithetRevealCardVM {
        return {
            skinToken: uiLayoutConfig.skinToken,
            age: params.age,
            stageKey: `ui.bloodline.stage.${params.stage}`,
            titleKey: 'ui.bloodline.epithet.title',
            bodyText: params.displayText,
            isBonusActive: params.isBonusActive,
            layoutRegion: uiLayoutConfig.regions.epithetRevealCard,
        };
    }
}
