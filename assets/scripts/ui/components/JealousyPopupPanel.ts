import { _decorator, Component, Label, Widget } from 'cc';
import { JealousyAndDynastyService, JealousyOption, JealousyState } from '../../core/systems/JealousyAndDynastyService';
import jealousyI18n from '../../../resources/data/master/jealousy-i18n-keys.json';

const { ccclass, property } = _decorator;

/**
 * 吃醋三選項彈窗 UI 元件（PROG-2-10038）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性，不寫死絕對座標。
 * - 預留 familyBindings.settle 皮膚 token 接口。
 * - 補齊 10033 i18n 鍵與第 1/2/3 次抓包三段不同搞笑台詞。
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

    private _lastMessageKey: string = jealousyI18n.optionKeys.A;

    protected onLoad(): void {
        this.applyResponsiveAnchors();
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

    public onSelectOption(option: JealousyOption, year: number, spouseId: string, rollPercent: number = 99): {
        messageKey: string;
        unlockedTitleKey: string | null;
        optionBPrice: number;
    } {
        const res = JealousyAndDynastyService.resolveJealousyOption(this._state, option, year, spouseId, rollPercent);
        this._state = res.nextState;

        if (res.triggeredComedyStory) {
            const idx = Math.min(res.nextState.caughtCount, jealousyI18n.caughtComedyKeys.length) - 1;
            this._lastMessageKey = jealousyI18n.caughtComedyKeys[Math.max(0, idx)];
        } else {
            this._lastMessageKey = jealousyI18n.optionKeys[option];
        }

        const unlockedTitleKey = res.newlyUnlockedTitle ? jealousyI18n.sleepGodTitleKey : null;
        this.refreshDisplay(unlockedTitleKey);

        return {
            messageKey: this._lastMessageKey,
            unlockedTitleKey,
            optionBPrice: JealousyAndDynastyService.getOptionBPrice(year),
        };
    }

    public refreshDisplay(unlockedTitleKey: string | null = null): void {
        if (this.bodyLabel) {
            this.bodyLabel.string = this._lastMessageKey;
        }
        if (this.titleUnlockedLabel) {
            this.titleUnlockedLabel.string = unlockedTitleKey ?? '';
        }
    }
}
