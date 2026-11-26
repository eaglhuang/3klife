import { _decorator, Color, Component, Label, Node, Widget } from 'cc';
import type { YearEndRankingResult } from '../../core/systems/YearEndRankingService';
import {
    CEREMONY_ACT_SECONDS,
    ceremonyActDialogue,
    ceremonyActHeadline,
    ceremonyStandingsText,
    type CeremonyAct,
} from '../../core/systems/YearEndCeremonyRuntime';
import type { ThemeService } from '../core/ThemeService';
import type { PanelTranslate } from './BondingAndEpithetPanel';

const { ccclass, property } = _decorator;

export type { CeremonyAct };

/**
 * 年終頒獎典禮三幕式 UI 元件（PROG-2-10044 元件；PROG-2-10046 掛載改版）
 * - 版面由 UCUF 畫面規格（year-end-ceremony-screen）管理；獨立節點才用 useOwnAnchors 掛比例 Widget，保留直式／手機橫式彈性。
 * - 顏色走 settle.text.title / value / accent token（經 setServices 注入 ThemeService；沒給就用墊底色）。
 * - 首次強制完整播放（不顯示跳過）、第 2 次起顯示跳過；三幕自動換幕，合計 ≤ 30 秒。
 */
@ccclass('YearEndCeremonyPanel')
export class YearEndCeremonyPanel extends Component {
    @property(Label)
    public titleLabel: Label | null = null;

    @property(Label)
    public standingsLabel: Label | null = null;

    @property(Label)
    public dialogueLabel: Label | null = null;

    @property(Label)
    public rewardLabel: Label | null = null;

    @property(Node)
    public skipButton: Node | null = null;

    @property(Node)
    public closeButton: Node | null = null;

    /** 獨立節點（沒有 UCUF 畫面規格管版面）才要自己掛比例 Widget */
    @property
    public useOwnAnchors: boolean = false;

    private _result: YearEndRankingResult | null = null;
    private _currentAct: CeremonyAct = 1;
    private _canSkip: boolean = false;
    private _playing: boolean = false;
    private _elapsed: number = 0;
    private _t: PanelTranslate = (key) => key;
    private _theme: ThemeService | null = null;
    private _onFinished: (() => void) | null = null;

    /** 注入翻譯與主題服務；主題為 null 時用墊底色 */
    public setServices(t: PanelTranslate, theme: ThemeService | null): void {
        this._t = t;
        this._theme = theme;
        this.applySettleThemeTokens();
    }

    /** 播完整場（自然播完或按跳過）時通知宿主，宿主負責記下「已看過」並存檔 */
    public setOnFinished(callback: (() => void) | null): void {
        this._onFinished = callback;
    }

    protected onLoad(): void {
        if (this.useOwnAnchors) this.applyResponsiveAnchors();
        this.applySettleThemeTokens();
    }

    public applyResponsiveAnchors(): void {
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

    public applySettleThemeTokens(): void {
        const token = (key: string, fallback: string): string => this._theme?.token<string>(key) ?? fallback;
        if (this.titleLabel) this.titleLabel.color = new Color().fromHEX(token('settle.text.title', '#B03018'));
        if (this.standingsLabel) this.standingsLabel.color = new Color().fromHEX(token('settle.text.value', '#3B2410'));
        if (this.dialogueLabel) this.dialogueLabel.color = new Color().fromHEX(token('settle.text.value', '#3B2410'));
        if (this.rewardLabel) this.rewardLabel.color = new Color().fromHEX(token('settle.text.accent', '#9A5B10'));
    }

    /** 帶入真實榜單並從第 1 幕開始播放；hasSeenCeremonyBefore 為 true 才顯示跳過鈕 */
    public bindRankingResult(result: YearEndRankingResult, hasSeenCeremonyBefore: boolean): void {
        this._result = result;
        this._currentAct = 1;
        this._elapsed = 0;
        this._playing = true;
        this._canSkip = hasSeenCeremonyBefore;
        if (this.skipButton) this.skipButton.active = this._canSkip;
        if (this.closeButton) this.closeButton.active = false;
        this.refreshDisplay();
    }

    public get currentAct(): CeremonyAct {
        return this._currentAct;
    }

    public get canSkip(): boolean {
        return this._canSkip;
    }

    public get isPlaying(): boolean {
        return this._playing;
    }

    protected update(dt: number): void {
        this.tick(dt);
    }

    /** 推進播放時間；本幕時間到自動換下一幕，第 3 幕時間到就結束並露出收下鈕 */
    public tick(dt: number): void {
        if (!this._playing) return;
        this._elapsed += dt;
        const limit = CEREMONY_ACT_SECONDS[this._currentAct - 1];
        if (this._elapsed < limit) return;
        this._elapsed = 0;
        if (this._currentAct < 3) {
            this.nextAct();
        } else {
            this._finish();
        }
    }

    public nextAct(): CeremonyAct {
        if (this._currentAct < 3) {
            this._currentAct = (this._currentAct + 1) as CeremonyAct;
        }
        this.refreshDisplay();
        return this._currentAct;
    }

    /** 跳過：只有看過一次以後才允許；直接收尾 */
    public skip(): boolean {
        if (!this._canSkip || !this._playing) return false;
        this._finish();
        return true;
    }

    private _finish(): void {
        this._playing = false;
        this._currentAct = 3;
        this.refreshDisplay();
        if (this.skipButton) this.skipButton.active = false;
        if (this.closeButton) this.closeButton.active = true;
        const callback = this._onFinished;
        this._onFinished = null;
        callback?.();
    }

    public getActDialogueText(): string {
        return this._result ? ceremonyActDialogue(this._result, this._currentAct, this._t) : '';
    }

    public refreshDisplay(): void {
        const result = this._result;
        if (!result) return;
        if (this.titleLabel) {
            this.titleLabel.string = `${this._t('ui.ceremony.title', String(result.year))}　${ceremonyActHeadline(this._currentAct, this._t)}`;
        }
        if (this.standingsLabel) this.standingsLabel.string = ceremonyStandingsText(result, this._t);
        if (this.dialogueLabel) this.dialogueLabel.string = this.getActDialogueText();
        if (this.rewardLabel) {
            const reward = result.playerReward;
            const bonus = result.surpriseAward?.bonusGold ?? 0;
            this.rewardLabel.string = this._currentAct === 3
                ? this._t('ui.ceremony.reward', String(reward.gold + bonus), String(reward.jade))
                : '';
        }
    }
}
