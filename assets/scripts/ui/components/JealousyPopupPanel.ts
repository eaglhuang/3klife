import { _decorator, Color, Component, Label, Widget } from 'cc';
import { JealousyAndDynastyService, JealousyOption, JealousyState } from '../../core/systems/JealousyAndDynastyService';
import { I18nSystem } from '../../core/systems/I18nSystem';
import { ThemeService } from '../core/ThemeService';
import jealousyI18n from '../../../resources/data/master/jealousy-i18n-keys.json';
import jealousyConfig from '../../../resources/data/master/jealousy-and-dynasty-config.json';

const { ccclass, property } = _decorator;

/**
 * 吃醋三選項彈窗 UI 元件（PROG-2-10038）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性，不寫死絕對座標。
 * - 透過 ThemeService 實際讀取 settle.* token（不寫死色碼）。
 * - 透過 I18nSystem.instance.t() 實際翻譯並以 config 數值參數化。
 */
@ccclass('JealousyPopupPanel')
export class JealousyPopupPanel extends Component {
    @property
    public skinFamilyToken: string = 'familyBindings.settle';

    @property(Label)
    public bodyLabel: Label | null = null;

    @property(Label)
    public titleUnlockedLabel: Label | null = null;

    private _state: JealousyState = {
        favor: 50,
        stamina: 50,
        gold: 1000,
        caughtCount: 0,
        unlockedTitles: [],
        spouseYearTriggerCount: {},
    };

    private _lastRenderedText: string = '';

    protected onLoad(): void {
        this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
        this.refreshDisplay();
    }

    public applyResponsiveAnchors(): void {
        const widget = this.node.getComponent(Widget) ?? this.node.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.left = 0.15;
        widget.right = 0.15;
        widget.top = 0.2;
        widget.bottom = 0.2;
        widget.updateAlignment();
    }

    public applySettleThemeTokens(): void {
        const theme = ThemeService.instance;
        const bodyHex = String(theme.getToken('settle.text.body') ?? theme.getToken('text.body') ?? '#d6c9b0');
        const badgeHex = String(theme.getToken('settle.badge.text') ?? theme.getToken('settle.text.title') ?? '#f5e8c7');

        if (this.bodyLabel) {
            this.bodyLabel.color = new Color().fromHEX(bodyHex);
        }
        if (this.titleUnlockedLabel) {
            this.titleUnlockedLabel.color = new Color().fromHEX(badgeHex);
        }
    }

    public onSelectOption(option: JealousyOption, year: number, spouseId: string, rollPercent: number = 99): {
        messageText: string;
        unlockedTitleText: string | null;
        optionBPrice: number;
    } {
        const i18n = I18nSystem.instance;
        const res = JealousyAndDynastyService.resolveJealousyOption(this._state, option, year, spouseId, rollPercent);
        this._state = res.nextState;
        const optionBPrice = JealousyAndDynastyService.getOptionBPrice(year);

        if (res.triggeredComedyStory) {
            const idx = Math.min(res.nextState.caughtCount, jealousyI18n.caughtComedyKeys.length) - 1;
            this._lastRenderedText = i18n.t(jealousyI18n.caughtComedyKeys[Math.max(0, idx)]);
        } else if (option === 'A') {
            const cfgA = jealousyConfig.jealousy.optionA;
            this._lastRenderedText = i18n.t(
                jealousyI18n.optionKeys.A,
                String(cfgA.successRate),
                String(cfgA.successFavorDelta),
                String(100 - cfgA.successRate),
                String(cfgA.failFavorDelta),
            );
        } else if (option === 'B') {
            const cfgB = jealousyConfig.jealousy.optionB;
            this._lastRenderedText = i18n.t(jealousyI18n.optionKeys.B, String(optionBPrice), String(cfgB.favorDelta));
        } else {
            const cfgC = jealousyConfig.jealousy.optionC;
            this._lastRenderedText = i18n.t(
                jealousyI18n.optionKeys.C,
                String(cfgC.sleepSuccessRate),
                String(cfgC.sleepStaminaDelta),
                String(100 - cfgC.sleepSuccessRate),
                String(cfgC.caughtFavorDelta),
            );
        }

        const unlockedTitleText = res.newlyUnlockedTitle ? i18n.t(jealousyI18n.sleepGodTitleKey) : null;
        this.refreshDisplay(unlockedTitleText);

        return {
            messageText: this._lastRenderedText,
            unlockedTitleText,
            optionBPrice,
        };
    }

    public refreshDisplay(unlockedTitleText: string | null = null): void {
        if (this.bodyLabel) {
            this.bodyLabel.string = this._lastRenderedText;
        }
        if (this.titleUnlockedLabel) {
            this.titleUnlockedLabel.string = unlockedTitleText ?? '';
        }
    }
}
