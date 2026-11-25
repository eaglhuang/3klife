import { _decorator, Component, Label, Node, Widget } from 'cc';
import { BondingSuccessService, BondingProposalState } from '../../core/systems/BondingSuccessService';
import { BloodlineEpithetService, BloodlineEpithetDef } from '../../core/systems/BloodlineEpithetService';

const { ccclass, property } = _decorator;

/**
 * 結緣公式分項與小名 8/12/15 歲三段揭曉可玩 UI 元件（PROG-2-10037）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性，不寫死絕對座標。
 * - 預留 familyBindings.settle 皮膚 token 接口。
 * - 所有顯示文字走 i18n 鍵值。
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
        rateText: string;
        breakdownLines: string[];
        epithetText: string;
    } {
        const sincerity = BondingSuccessService.getSincerityBonus(this._proposalState.rejectCount);
        const bd = BondingSuccessService.calculateBondingProbability({
            compatibilityK: 1.0,
            favorF: this._proposalState.favorF,
            sincerityBonus: sincerity,
            matchmakerBonus: 0,
        });
        const reveal = BloodlineEpithetService.getRevealStateAtAge(this._currentAge, this._epithet);

        return {
            skinFamilyToken: this.skinFamilyToken,
            rateText: `${bd.finalRate}%`,
            breakdownLines: [
                `ui.bonding.breakdown.base: ${bd.base}%`,
                `ui.bonding.breakdown.compatibility: +${bd.compatibility}%`,
                `ui.bonding.breakdown.favor: ${bd.favor >= 0 ? '+' : ''}${bd.favor}%`,
                `ui.bonding.breakdown.sincerity: +${bd.sincerity}%`,
                `ui.bonding.breakdown.matchmaker: +${bd.matchmaker}%`,
            ],
            epithetText: reveal.displayText,
        };
    }

    public refreshDisplay(): void {
        const summary = this.getRenderedSummary();
        if (this.titleLabel) {
            this.titleLabel.string = `ui.bonding.title (${summary.rateText})`;
        }
        if (this.breakdownLabel) {
            this.breakdownLabel.string = summary.breakdownLines.join('\n');
        }
        if (this.epithetStageLabel) {
            this.epithetStageLabel.string = summary.epithetText;
        }
    }
}
