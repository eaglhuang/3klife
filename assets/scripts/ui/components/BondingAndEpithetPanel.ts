import { _decorator, Color, Component, Label, Node, Widget } from 'cc';
import { BondingSuccessService, BondingProposalState, BondingProposalResult } from '../../core/systems/BondingSuccessService';
import { BloodlineEpithetService, BloodlineEpithetDef } from '../../core/systems/BloodlineEpithetService';
import type { ThemeService } from '../core/ThemeService';

/** 翻譯函式（正式環境傳 services().i18n.t，測試可傳假的） */
export type PanelTranslate = (key: string, ...args: string[]) => string;

const { ccclass, property } = _decorator;

/**
 * 結緣公式分項與小名 8/12/15 歲三段揭曉 UI 元件（PROG-2-10037）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性。
 * - 顏色走 settle.text.title / settle.text.value token（由呼叫端經 setServices 注入 ThemeService；沒給就用墊底色）。
 * - 文字走注入的翻譯函式（四語系），資料由呼叫端傳入真實配偶、好感與相性 K。
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

    private _t: PanelTranslate = (key) => key;
    private _theme: ThemeService | null = null;
    private _matchmakerBonus: number = 0;
    private _compatibilityK: number = 1.0;
    private _epithet: BloodlineEpithetDef | null = null;
    private _currentAge: number = 8;

    /** 獨立節點（沒有 UCUF 畫面規格管版面）才要自己掛比例 Widget；掛在 UCUF 畫面上維持 false */
    @property
    public useOwnAnchors: boolean = false;

    protected onLoad(): void {
        if (this.useOwnAnchors) this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
        this.refreshDisplay();
    }

    /** 注入翻譯與主題服務（先於 bindProposalData 呼叫）；主題為 null 時用墊底色 */
    public setServices(t: PanelTranslate, theme: ThemeService | null): void {
        this._t = t;
        this._theme = theme;
        this.applySettleThemeTokens();
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
        // 掛在 UCUF 畫面根節點時，版面已由畫面規格的 Widget 管理，不重複覆寫
        if (this.node.getComponent(Widget)) return;
        const widget = this.node.addComponent(Widget);
        widget.isAbsoluteLeft = false;
        widget.isAbsoluteRight = false;
        widget.isAbsoluteTop = false;
        widget.isAbsoluteBottom = false;
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
        const titleHex = this._theme?.token<string>('settle.text.title') ?? '#B03018';
        const valueHex = this._theme?.token<string>('settle.text.value') ?? '#3B2410';

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

    public onClickPropose(year: number, season: number, rollPercent: number): BondingProposalResult {
        const res = BondingSuccessService.attemptBondingProposal(this._proposalState, {
            year,
            season,
            compatibilityK: this._compatibilityK,
            matchmakerBonus: this._matchmakerBonus,
            rollPercent,
        });
        this._proposalState = res.nextState;
        this.refreshDisplay();
        return res;
    }

    /** 目前提親狀態（好感、被拒次數、冷卻）；呼叫端用來回存 */
    public get proposalState(): BondingProposalState {
        return { ...this._proposalState };
    }

    public setMatchmakerBonus(bonus: number): void {
        this._matchmakerBonus = bonus;
        this.refreshDisplay();
    }

    public onSelectEpithetAge(age: number): void {
        this._currentAge = age;
        this.refreshDisplay();
    }

    public getRenderedSummary(): {
        skinFamilyToken: string;
        titleText: string;
        breakdownLines: string[];
        epithetText: string;
    } {
        const i18n = { t: this._t };
        const sincerity = BondingSuccessService.getSincerityBonus(this._proposalState.rejectCount);
        const bd = BondingSuccessService.calculateBondingProbability({
            compatibilityK: this._compatibilityK,
            favorF: this._proposalState.favorF,
            sincerityBonus: sincerity,
            matchmakerBonus: this._matchmakerBonus,
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
