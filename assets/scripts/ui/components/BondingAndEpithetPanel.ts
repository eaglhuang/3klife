import { _decorator, Color, Component, Label, Node, Widget } from 'cc';
import { BondingSuccessService, BondingProposalState } from '../../core/systems/BondingSuccessService';
import { BloodlineEpithetService, BloodlineEpithetDef } from '../../core/systems/BloodlineEpithetService';
import { I18nSystem } from '../../core/systems/I18nSystem';
import { ThemeService } from '../core/ThemeService';

const { ccclass, property } = _decorator;

/**
 * 結緣公式分項與小名 8/12/15 歲三段揭曉可玩 UI 元件（PROG-2-10037）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性，不寫死絕對座標。
 * - 透過 ThemeService 實際讀取 settle.* token（不寫死色碼）。
 * - 透過 I18nSystem.instance.t() 實際翻譯並格式化四語系鍵值。
 */
@ccclass('BondingAndEpithetPanel')
export class BondingAndEpithetPanel extends Component {
    @property
    public skinFamilyToken: string = 'familyBindings.settle';

    @property(Label)
    public titleLabel: Label | null = null;

    @property(Label)
    public breakdownLabel: Label | null = null;

    @property(Label)
    public epithetStageLabel: Label | null = null;

    @property(Node)
    public proposeButton: Node | null = null;

    private _proposalState: BondingProposalState = {
        favorF: 0,
        rejectCount: 0,
        cooldownSeasons: 0,
        matchmakerFallbackUsed: false,
        hasPartner: false,
    };

    private _epithet: BloodlineEpithetDef = BloodlineEpithetService.drawBirthEpithet(0);
    private _currentAge: number = 8;

    protected onLoad(): void {
        this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
        this.refreshDisplay();
    }

    /**
     * 套用相對比例錨點（保留直式／手機橫式彈性）
     */
    public applyResponsiveAnchors(): void {
        const widget = this.node.getComponent(Widget) ?? this.node.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.left = 0.12;
        widget.right = 0.12;
        widget.top = 0.15;
        widget.bottom = 0.15;
        widget.updateAlignment();
    }

    /**
     * 透過 ThemeService 實際讀取 settle.* token 並套用至 Label 顏色
     */
    public applySettleThemeTokens(): void {
        const theme = ThemeService.instance;
        const titleHex = String(theme.getToken('settle.text.title') ?? theme.getToken('text.title') ?? '#f5e8c7');
        const bodyHex = String(theme.getToken('settle.text.body') ?? theme.getToken('text.body') ?? '#d6c9b0');

        if (this.titleLabel) {
            this.titleLabel.color = new Color().fromHEX(titleHex);
        }
        if (this.breakdownLabel) {
            this.breakdownLabel.color = new Color().fromHEX(bodyHex);
        }
        if (this.epithetStageLabel) {
            this.epithetStageLabel.color = new Color().fromHEX(bodyHex);
        }
    }

    public onClickPropose(rollPercent: number = 99): void {
        const res = BondingSuccessService.attemptBondingProposal(this._proposalState, {
            year: 1,
            season: 1,
            compatibilityK: 1.0,
            rollPercent,
        });
        this._proposalState = res.nextState;
        this.refreshDisplay();
    }

    public onSelectEpithetAge(age: 8 | 12 | 15): void {
        this._currentAge = age;
        this.refreshDisplay();
    }

    public getRenderedSummary(): {
        skinFamilyToken: string;
        titleText: string;
        breakdownLines: string[];
        epithetText: string;
    } {
        const i18n = I18nSystem.instance;
        const sincerity = BondingSuccessService.getSincerityBonus(this._proposalState.rejectCount);
        const bd = BondingSuccessService.calculateBondingProbability({
            compatibilityK: 1.0,
            favorF: this._proposalState.favorF,
            sincerityBonus: sincerity,
            matchmakerBonus: 0,
        });
        const reveal = BloodlineEpithetService.getRevealStateAtAge(this._currentAge, this._epithet);

        const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

        return {
            skinFamilyToken: this.skinFamilyToken,
            titleText: i18n.t('ui.bonding.title', String(bd.finalRate)),
            breakdownLines: [
                i18n.t('ui.bonding.breakdown.base', String(bd.base)),
                i18n.t('ui.bonding.breakdown.compatibility', signed(bd.compatibility)),
                i18n.t('ui.bonding.breakdown.favor', signed(bd.favor)),
                i18n.t('ui.bonding.breakdown.sincerity', signed(bd.sincerity)),
                i18n.t('ui.bonding.breakdown.matchmaker', signed(bd.matchmaker)),
            ],
            epithetText: reveal.displayText,
        };
    }

    public refreshDisplay(): void {
        const summary = this.getRenderedSummary();
        if (this.titleLabel) {
            this.titleLabel.string = summary.titleText;
        }
        if (this.breakdownLabel) {
            this.breakdownLabel.string = summary.breakdownLines.join('\n');
        }
        if (this.epithetStageLabel) {
            this.epithetStageLabel.string = summary.epithetText;
        }
    }
}
