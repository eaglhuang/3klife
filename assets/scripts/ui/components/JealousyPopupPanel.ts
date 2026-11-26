import { _decorator, Color, Component, Label, Widget } from 'cc';
import { JealousyAndDynastyService, JealousyOption, JealousyResolution, JealousyState } from '../../core/systems/JealousyAndDynastyService';
import type { ThemeService } from '../core/ThemeService';
import type { PanelTranslate } from './BondingAndEpithetPanel';
import jealousyI18n from '../../../resources/data/master/jealousy-i18n-keys.json';
import jealousyConfig from '../../../resources/data/master/jealousy-and-dynasty-config.json';

const { ccclass, property } = _decorator;

/**
 * 吃醋三選項彈窗 UI 元件（PROG-2-10038）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性。
 * - 顏色走 settle.text.value / settle.text.accent token（經 setServices 注入 ThemeService；沒給就用墊底色）。
 * - 由呼叫端傳入真實配偶／玩家資料（bindJealousyState），文字走注入的翻譯函式（四語系）。
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

    private _t: PanelTranslate = (key) => key;
    private _theme: ThemeService | null = null;
    private _lastRenderedText: string = '';
    private _spouseName: string = '';

    public setSpouseName(name: string): void {
        this._spouseName = name;
    }

    /** 注入翻譯與主題服務；主題為 null 時用墊底色 */
    public setServices(t: PanelTranslate, theme: ThemeService | null): void {
        this._t = t;
        this._theme = theme;
        this.applySettleThemeTokens();
    }

    /** 三個選項按鈕的文字（機率、好感、價格全由 config 與年份算出，不寫死） */
    public getOptionLabels(year: number): Record<JealousyOption, string> {
        const cfg = jealousyConfig.jealousy;
        return {
            A: this._t(jealousyI18n.optionKeys.A, String(cfg.optionA.successRate), String(cfg.optionA.successFavorDelta), String(100 - cfg.optionA.successRate), String(cfg.optionA.failFavorDelta)),
            B: this._t(jealousyI18n.optionKeys.B, String(JealousyAndDynastyService.getOptionBPrice(year)), String(cfg.optionB.favorDelta)),
            C: this._t(jealousyI18n.optionKeys.C, String(cfg.optionC.sleepSuccessRate), String(cfg.optionC.sleepGoldDelta), String(100 - cfg.optionC.sleepSuccessRate), String(cfg.optionC.caughtFavorDelta)),
        };
    }

    public get state(): JealousyState {
        return { ...this._state };
    }

    /** 獨立節點（沒有 UCUF 畫面規格管版面）才要自己掛比例 Widget；掛在 UCUF 畫面上維持 false */
    @property
    public useOwnAnchors: boolean = false;

    protected onLoad(): void {
        if (this.useOwnAnchors) this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
        this.refreshDisplay();
    }

    /**
     * 由外部事件呼叫端傳入真實玩家與配偶狀態
     */
    public bindJealousyState(state: JealousyState): void {
        this._state = { ...state };
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
        widget.left = 0.15;
        widget.right = 0.15;
        widget.top = 0.2;
        widget.bottom = 0.2;
        widget.updateAlignment();
    }

    /**
     * 透過 ThemeService 讀取 master 現有 settle.text.value / settle.text.accent（深色字配淺紙底）
     */
    public applySettleThemeTokens(): void {
        const valueHex = this._theme?.token<string>('settle.text.value') ?? '#3B2410';
        const accentHex = this._theme?.token<string>('settle.text.accent') ?? '#9A5B10';

        if (this.bodyLabel) {
            this.bodyLabel.color = new Color().fromHEX(valueHex);
        }
        if (this.titleUnlockedLabel) {
            this.titleUnlockedLabel.color = new Color().fromHEX(accentHex);
        }
    }

    public onSelectOption(option: JealousyOption, year: number, spouseId: string, rollPercent: number = 99): {
        messageText: string;
        unlockedTitleText: string | null;
        optionBPrice: number;
        resolution: JealousyResolution;
    } {
        const i18n = { t: this._t };
        const res = JealousyAndDynastyService.resolveJealousyOption(this._state, option, year, spouseId, rollPercent);
        this._state = res.nextState;
        const optionBPrice = JealousyAndDynastyService.getOptionBPrice(year);

        if (res.blockedByYearlyLimit) {
            this._lastRenderedText = i18n.t('ui.jealousy.popup.blocked', this._spouseName);
        } else if (res.triggeredComedyStory) {
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
                String(cfgC.sleepGoldDelta),
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
            resolution: res,
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
