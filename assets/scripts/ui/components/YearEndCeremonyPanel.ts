import { _decorator, Color, Component, Graphics, HorizontalTextAlignment, Label, Node, Sprite, tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import type { YearEndRankingResult } from '../../core/systems/YearEndRankingService';
import {
    CEREMONY_ACT_SECONDS,
    CEREMONY_RANK_FRAME_TOKENS,
    ceremonyEventsBetween,
    type CeremonyCue,
    type CeremonyEvent,
    ceremonyActDialogue,
    ceremonyActHeadline,
    ceremonyStandingsText,
    type CeremonyAct,
} from '../../core/systems/YearEndCeremonyRuntime';
import { crowdTurn, resolveCrowdLine, type CrowdMember } from '../../core/systems/YearEndCeremonyCrowd';
import type { ThemeService } from '../core/ThemeService';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import type { NameTagStyle } from '../core/GeneralNameTagModel';
import { applyGeneralNameTag, hideGeneralNameTag } from './GeneralNameTag';
import type { PanelTranslate } from './BondingAndEpithetPanel';

const { ccclass, property } = _decorator;

/** 觀禮大頭像邊長（設計像素）；每位用既有 avatars 貼圖，不新增圖集 */
const CROWD_AVATAR_SIZE = 76;

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

    /** 觀禮武將大頭像列的容器（UCUF 畫面規格 ycCrowd）；沒給就不顯示觀禮 */
    @property(Node)
    public crowdContainer: Node | null = null;

    /** 觀禮武將台詞（名字標籤＋台詞）；沒給就只輪播頭像高亮 */
    @property(Label)
    public crowdLineLabel: Label | null = null;

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
    private _onCue: ((cue: CeremonyCue) => void) | null = null;
    /** 第 1～3 名的金／銀／銅框（Graphics 程序繪製，不新增美術）；第一次用到才建 */
    private _rankFrames: Array<{ node: Node; opacity: UIOpacity }> = [];
    /** 觀禮大頭像槽：節點與 Sprite 只建一次，之後只換圖與位置（手機記憶體：不新增圖集、不重建節點） */
    private _crowdSlots: Array<{ node: Node; opacity: UIOpacity }> = [];
    private _crowd: readonly CrowdMember[] = [];
    private _crowdCheerKeys: readonly string[] = [];
    private _crowdIntervalSeconds = 2.6;
    private _crowdTurn = 0;
    private _crowdTimer = 0;
    private _nameTagStyle: NameTagStyle | null = null;
    /** 載圖序號：重開典禮時，舊的非同步載入結果丟棄 */
    private _crowdLoadSeq = 0;

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

    /** 敲鑼／掌聲時機到了通知宿主播音效（宿主決定掛哪個音檔；沒有音檔就靜音） */
    public setOnCue(callback: ((cue: CeremonyCue) => void) | null): void {
        this._onCue = callback;
    }

    /** 名字標籤樣式（取自主題）；沒給就不掛標籤，台詞前仍有名字 */
    public setNameTagStyle(style: NameTagStyle | null): void {
        this._nameTagStyle = style;
    }

    /**
     * 帶入觀禮名單與台詞鍵（由宿主用 pickCeremonyCrowd 組好）；下一次 bindRankingResult 開播時生效。
     * 輪播只在典禮播放中推進，播完／跳過就停，不延長典禮。
     */
    public setCrowd(members: readonly CrowdMember[], cheerKeys: readonly string[], intervalSeconds: number): void {
        this._crowd = members;
        this._crowdCheerKeys = cheerKeys;
        this._crowdIntervalSeconds = intervalSeconds > 0 ? intervalSeconds : 2.6;
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
        this.hideRankFrames();
        this.refreshDisplay();
        this.startCrowd();
        this.fireEvents(ceremonyEventsBetween(1, -1, 0));
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
        this.tickCrowd(dt);
        const before = this._elapsed;
        this._elapsed += dt;
        const limit = CEREMONY_ACT_SECONDS[this._currentAct - 1];
        this.fireEvents(ceremonyEventsBetween(this._currentAct, before, Math.min(this._elapsed, limit)));
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
            this._elapsed = 0;
        }
        this.refreshDisplay();
        this.fireEvents(ceremonyEventsBetween(this._currentAct, -1, 0));
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
        this.showRankFramesFinal();
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

    /** 時間軸事件：音效交給宿主、名次框做彈跳閃光 */
    private fireEvents(events: readonly CeremonyEvent[]): void {
        for (const event of events) {
            if (event.type === 'cue') this._onCue?.(event.cue);
            else this.revealRankFrame(event.rank);
        }
    }

    private frameColor(rank: 1 | 2 | 3): Color {
        const def = CEREMONY_RANK_FRAME_TOKENS[rank];
        return new Color().fromHEX(this._theme?.token<string>(def.token) ?? def.fallback);
    }

    /** 建立前三名的框：貼在名單 Label 的對應行上，行高取 Label.lineHeight */
    private ensureRankFrames(): void {
        const label = this.standingsLabel;
        if (this._rankFrames.length > 0 || !label) return;
        const transform = label.node.getComponent(UITransform);
        const width = (transform?.width ?? 860) - 12;
        const height = transform?.height ?? 150;
        const lineHeight = label.lineHeight > 0 ? label.lineHeight : Math.round(label.fontSize * 1.3);
        const lines = this._result?.standings.length ?? 4;
        const textHeight = Math.min(height, lines * lineHeight);
        // 名單文字垂直置中對齊時，第一行中心 = 文字區塊上緣往下半行
        const top = textHeight / 2;
        for (const rank of [1, 2, 3] as const) {
            const node = new Node(`RankFrame${rank}`);
            node.parent = label.node;
            const frameTransform = node.addComponent(UITransform);
            frameTransform.setContentSize(width, lineHeight);
            node.setPosition(0, top - lineHeight * (rank - 0.5), 0);
            const g = node.addComponent(Graphics);
            g.lineWidth = 4;
            g.strokeColor = this.frameColor(rank);
            g.roundRect(-width / 2, -lineHeight / 2 + 2, width, lineHeight - 4, 8);
            g.stroke();
            const opacity = node.addComponent(UIOpacity);
            opacity.opacity = 0;
            this._rankFrames.push({ node, opacity });
        }
    }

    private hideRankFrames(): void {
        for (const frame of this._rankFrames) frame.opacity.opacity = 0;
    }

    private showRankFramesFinal(): void {
        this.ensureRankFrames();
        for (const frame of this._rankFrames) {
            frame.opacity.opacity = 255;
            frame.node.setScale(1, 1, 1);
        }
    }

    /** 亮框：由小放大過頭再回彈，同時透明度閃兩下後停在亮 */
    private revealRankFrame(rank: 1 | 2 | 3): void {
        this.ensureRankFrames();
        const frame = this._rankFrames[rank - 1];
        if (!frame) return;
        frame.node.setScale(0.6, 0.6, 1);
        frame.opacity.opacity = 0;
        tween(frame.node)
            .to(0.18, { scale: new Vec3(1.18, 1.18, 1) })
            .to(0.16, { scale: new Vec3(0.96, 0.96, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
        tween(frame.opacity)
            .to(0.1, { opacity: 255 })
            .to(0.1, { opacity: 90 })
            .to(0.1, { opacity: 255 })
            .to(0.1, { opacity: 140 })
            .to(0.15, { opacity: 255 })
            .start();
    }

    /** 開播：排好大頭像、立刻說第一句（之後每 _crowdIntervalSeconds 秒換人換句） */
    private startCrowd(): void {
        const container = this.crowdContainer;
        const members = this._crowd;
        this._crowdTurn = 0;
        this._crowdTimer = 0;
        this._crowdLoadSeq += 1;
        if (!container || members.length === 0 || this._crowdCheerKeys.length === 0) {
            if (container) container.active = false;
            if (this.crowdLineLabel) {
                this.crowdLineLabel.string = '';
                hideGeneralNameTag(this.crowdLineLabel.node);
            }
            return;
        }
        container.active = true;
        const width = container.getComponent(UITransform)?.width ?? 860;
        const step = width / members.length;
        const seq = this._crowdLoadSeq;
        for (let i = 0; i < members.length; i++) {
            const slot = this.ensureCrowdSlot(i);
            slot.node.active = true;
            slot.node.setPosition((i - (members.length - 1) / 2) * step, 0, 0);
            const sprite = slot.node.getComponent(Sprite);
            if (sprite) sprite.spriteFrame = null;
            void loadGeneralAvatar(members[i].generalId, true).then((frame) => {
                if (!frame || !slot.node.isValid || seq !== this._crowdLoadSeq || !sprite) return;
                // 先鎖 CUSTOM 再換圖，免得節點被撐成原圖大小
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = frame;
                slot.node.getComponent(UITransform)?.setContentSize(CROWD_AVATAR_SIZE, CROWD_AVATAR_SIZE);
            });
        }
        for (let i = members.length; i < this._crowdSlots.length; i++) this._crowdSlots[i].node.active = false;
        this.sayCrowdLine();
    }

    private ensureCrowdSlot(index: number): { node: Node; opacity: UIOpacity } {
        const existing = this._crowdSlots[index];
        if (existing) return existing;
        const container = this.crowdContainer!;
        const node = new Node(`CrowdAvatar${index + 1}`);
        node.layer = container.layer;
        node.addComponent(UITransform).setContentSize(CROWD_AVATAR_SIZE, CROWD_AVATAR_SIZE);
        node.addComponent(Sprite);
        const opacity = node.addComponent(UIOpacity);
        container.addChild(node);
        const slot = { node, opacity };
        this._crowdSlots[index] = slot;
        return slot;
    }

    private tickCrowd(dt: number): void {
        if (this._crowd.length === 0 || !this.crowdContainer?.active) return;
        this._crowdTimer += dt;
        if (this._crowdTimer < this._crowdIntervalSeconds) return;
        this._crowdTimer -= this._crowdIntervalSeconds;
        this._crowdTurn += 1;
        this.sayCrowdLine();
    }

    /** 輪到誰就誰放大亮起、其餘縮小變淡，台詞行換成「名字標籤＋這句台詞」 */
    private sayCrowdLine(): void {
        const members = this._crowd;
        const { memberIndex, lineIndex } = crowdTurn(this._crowdTurn, members.length, this._crowdCheerKeys.length);
        if (memberIndex < 0) return;
        const speaker = members[memberIndex];
        for (let i = 0; i < members.length; i++) {
            const slot = this._crowdSlots[i];
            if (!slot) continue;
            const on = i === memberIndex;
            tween(slot.node).stop();
            tween(slot.node)
                .to(0.18, { scale: on ? new Vec3(1.25, 1.25, 1) : new Vec3(0.9, 0.9, 1) })
                .start();
            slot.opacity.opacity = on ? 255 : 150;
        }
        const label = this.crowdLineLabel;
        if (!label) return;
        label.horizontalAlign = HorizontalTextAlignment.LEFT;
        const line = resolveCrowdLine((key, ...args) => this._t(key, ...args), this._crowdCheerKeys[lineIndex], speaker.gender);
        label.string = this._t('ui.ceremony.crowd.say', speaker.name, line);
        if (this._nameTagStyle) applyGeneralNameTag(label.node, speaker.generalId, speaker.name, this._nameTagStyle);
    }

    /** 收下賞賜後把入帳結果寫在賞賜行（不重複領的情況由宿主傳訊息文字） */
    public showClaimMessage(text: string): void {
        if (this.rewardLabel) this.rewardLabel.string = text;
    }
}
