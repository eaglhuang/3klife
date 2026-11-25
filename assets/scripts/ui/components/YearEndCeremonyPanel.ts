import { _decorator, Color, Component, Label, Node, Widget } from 'cc';
import { YearEndRankingResult } from '../../core/systems/YearEndRankingService';
import { I18nSystem } from '../../core/systems/I18nSystem';
import { ThemeService } from '../core/ThemeService';

const { ccclass, property } = _decorator;

export type CeremonyAct = 1 | 2 | 3;

/**
 * 年終頒獎典禮三幕式 UI 元件（PROG-2-10044）
 * - 使用 Widget 相對比例錨點，保留直式／手機橫式彈性。
 * - 透過 ThemeService 讀取 master 現有 settle.text.title / settle.text.value / settle.text.accent。
 * - 透過 I18nSystem.instance.t() 翻譯三幕對白，首次強制完整播放，第 2 次起可跳過。
 */
@ccclass('YearEndCeremonyPanel')
export class YearEndCeremonyPanel extends Component {
    @property(Label)
    public titleLabel: Label | null = null;

    @property(Label)
    public dialogueLabel: Label | null = null;

    @property(Node)
    public skipButton: Node | null = null;

    private _result: YearEndRankingResult | null = null;
    private _currentAct: CeremonyAct = 1;
    private _canSkip: boolean = false;

    protected onLoad(): void {
        this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
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

    public applySettleThemeTokens(): void {
        const theme = ThemeService.instance;
        const titleHex = String(theme.getToken('settle.text.title') ?? '#8A1C1C');
        const valueHex = String(theme.getToken('settle.text.value') ?? '#3B2A1A');

        if (this.titleLabel) {
            this.titleLabel.color = new Color().fromHEX(titleHex);
        }
        if (this.dialogueLabel) {
            this.dialogueLabel.color = new Color().fromHEX(valueHex);
        }
    }

    public bindRankingResult(result: YearEndRankingResult, hasSeenCeremonyBefore: boolean): void {
        this._result = result;
        this._currentAct = 1;
        this._canSkip = hasSeenCeremonyBefore;
        if (this.skipButton) {
            this.skipButton.active = this._canSkip;
        }
        this.refreshDisplay();
    }

    public nextAct(): CeremonyAct {
        if (this._currentAct < 3) {
            this._currentAct = (this._currentAct + 1) as CeremonyAct;
        }
        this.refreshDisplay();
        return this._currentAct;
    }

    public getActDialogueText(): string {
        if (!this._result) return '';
        const i18n = I18nSystem.instance;

        if (this._currentAct === 1) {
            const names = this._result.standings.map((s) => s.name).join('、');
            return i18n.t('ui.ceremony.act1.intro', names);
        }

        if (this._currentAct === 2) {
            if (this._result.playerRank <= 3) {
                return i18n.t(
                    'ui.ceremony.act2.top3',
                    String(this._result.playerRank),
                    String(this._result.playerReward.gold),
                    String(this._result.playerReward.jade),
                );
            }
            const roastIdx = ((this._result.year - 1) % 3) + 1;
            return i18n.t(`ui.ceremony.roast.${roastIdx}`);
        }

        if (this._result.surpriseAward) {
            const variant = ((this._result.year - 1) % 2) + 1;
            const key = this._result.surpriseAward.id === 'surprise_dark_horse'
                ? `ui.ceremony.surprise.dark_horse.${variant}`
                : `ui.ceremony.surprise.spoiled.${variant}`;
            return i18n.t(key, String(this._result.surpriseAward.bonusGold));
        }

        return this._result.nextYearHint;
    }

    public refreshDisplay(): void {
        if (this.dialogueLabel) {
            this.dialogueLabel.string = this.getActDialogueText();
        }
    }
}
