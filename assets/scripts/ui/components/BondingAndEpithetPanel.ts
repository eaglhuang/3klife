import { _decorator, Color, Component, Label, Node, Widget } from 'cc';
import { BondingSuccessService, BondingProposalState } from '../../core/systems/BondingSuccessService';
import { BloodlineEpithetService, BloodlineEpithetDef } from '../../core/systems/BloodlineEpithetService';
import { I18nSystem } from '../../core/systems/I18nSystem';
import { ThemeService } from '../core/ThemeService';

const { ccclass, property } = _decorator;

/**
 * 結緣公式分項與小名 8/12/15 歲三段揭曉 UI 元件（PROG-2-10037）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性。
 * - 透過 ThemeService 實際讀取 master 現有 settle.text.title / settle.text.value token。
 * - 透過 I18nSystem.instance.t() 翻譯四語系鍵值，並由呼叫端傳入真實配偶與好感資料。
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

    private _compatibilityK: number = 1.0;
    private _epithet: BloodlineEpithetDef | null = null;
    private _currentAge: number = 8;

    protected onLoad(): void {
        this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
        this.refreshDisplay();
    }

    /**
     * 由外部（提親流程／人物頁）傳入真實配偶與子嗣資料
     */
    public bindProposalData(
        state: BondingProposalState,
        compatibilityK: number,
        epithet: BloodlineEpithetDef,
        age: number = 8,
    ): void {
        this._proposalState = { ...state };
        this._compatibilityK = compatibilityK;
        this._epithet = epithet;
        this._currentAge = age;
        this.refreshDisplay();
    }

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
     * 透過 ThemeService 實際讀取 master 現有 settle.text.title / settle.text.value（深色文字配淺紙底）
     */
    public applySettleThemeTokens(): void {
        const theme = ThemeService.instance;
        const titleHex = String(theme.getToken('settle.text.title') ?? '#8A1C1C');
        const valueHex = String(theme.getToken('settle.text.value') ?? '#3B2A1A');

        if (this.titleLabel) {
            this.titleLabel.color = new Color().fromHEX(titleHex);
        }
        if (this.breakdownLabel) {
            this.breakdownLabel.color = new Color().fromHEX(valueHex);
        }
        if (this.epithetStageLabel) {
            this.epithetStageLabel.color = new Color().fromHEX(valueHex);
        }
    }

    public onClickPropose(year: number, season: number, rollPercent: number): void {
        const res = BondingSuccessService.attemptBondingProposal(this._proposalState, {
            year,
            season,
            compatibilityK: this._compatibilityK,
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
            compatibilityK: this._compatibilityK,
            favorF: this._proposalState.favorF,
            sincerityBonus: sincerity,
            matchmakerBonus: 0,
        });
        const epithet = this._epithet ?? BloodlineEpithetService.drawBirthEpithet(0);
        const reveal = BloodlineEpithetService.getRevealStateAtAge(this._currentAge, epithet);

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
