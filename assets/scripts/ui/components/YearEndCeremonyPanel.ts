import { _decorator, Color, Component, EventTouch, Font, HorizontalTextAlignment, Label, Node, Sprite, tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import type { YearEndRankingResult } from '../../core/systems/YearEndRankingService';
import {
    CEREMONY_ACT_SECONDS,
    ceremonyEventsBetween,
    type CeremonyCue,
    type CeremonyEvent,
    ceremonyActDialogue,
    ceremonyActHeadline,
    type CeremonyAct,
} from '../../core/systems/YearEndCeremonyRuntime';
import {
    audienceLineArgs,
    audienceLineKey,
    buildHouseBoard,
    ceremonyAct2Seconds,
    ceremonyBoardAt,
    ceremonyBoardRevealsBetween,
    planCeremonyBoards,
    playerRankOnBoard,
    winnerSpeechKey,
    type CeremonyBoard,
} from '../../core/systems/YearEndCeremonyPodium';
import { selfOf } from '../../core/mind/SpeakerVoice';
import { CeremonyPodiumView } from './CeremonyPodiumView';
import { crowdTurn, resolveCrowdVoiceLine, type CrowdMember } from '../../core/systems/YearEndCeremonyCrowd';
import { CEREMONY_RIBBON_COUNT, planRelay, planRibbons, relayTriggerRank, type RelayKind, type RelayStep } from '../../core/systems/CeremonyHype';
import { CeremonyRibbonPool } from './CeremonyRibbonPool';
import type { ThemeService } from '../core/ThemeService';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import type { NameTagStyle } from '../core/GeneralNameTagModel';
import { applyGeneralNameTag, hideGeneralNameTag } from './GeneralNameTag';
import type { PanelTranslate } from './BondingAndEpithetPanel';

const { ccclass, property } = _decorator;

/** 觀禮大頭像邊長（設計像素）；每位用既有 avatars 貼圖，不新增圖集 */
const CROWD_AVATAR_SIZE = 96;
/** 發言者跳起的高度（設計像素）與拍肩的左右擺幅 */
const CROWD_HOP_PX = 18;
const CROWD_PAT_PX = 10;

export type { CeremonyAct };

/**
 * 年終頒獎典禮三幕式 UI 元件（PROG-2-10044 元件；PROG-2-10046 掛載改版；PROG-2-10153 改 A 版領獎台）
 * - 第 2 幕依榜單播：名門榜 6 秒＋最多兩個風雲榜各 4 秒（沒有風雲榜時名門榜 8 秒）；點舞台跳下一榜。
 * - 前三名頭像可點，輪播得獎感言；觀眾頭像可點，依榜名、名次、本府名次說台詞。
 * - 版面由 UCUF 畫面規格（year-end-ceremony-screen）管理；獨立節點才用 useOwnAnchors 掛比例 Widget，保留直式／手機橫式彈性。
 * - 顏色走 settle.text.title / value / accent token（經 setServices 注入 ThemeService；沒給就用墊底色）。
 * - 首次強制完整播放（不顯示跳過）、第 2 次起顯示跳過；三幕自動換幕，合計 ≤ 30 秒。
 */
@ccclass('YearEndCeremonyPanel')
export class YearEndCeremonyPanel extends Component {
    /** 領獎台舞台容器（UCUF 畫面規格 ycStage）；頒獎台節點全由程式在這裡建 */
    @property(Node)
    public stageNode: Node | null = null;

    @property(Label)
    public hintLabel: Label | null = null;

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
    /** 領獎台畫面（CeremonyPodiumView）；第一次開播才建 */
    private _view: CeremonyPodiumView | null = null;
    private _boards: CeremonyBoard[] = [];
    private _fameBoards: readonly CeremonyBoard[] = [];
    private _portraits: { npc?: Readonly<Record<string, string>>; player?: string } = {};
    private _boardIndex = 0;
    /** 本榜內已經過幾秒（-1＝剛進榜，含 0 秒事件） */
    private _boardLocal = -1;
    private _winnerClicks: [number, number, number] = [0, 0, 0];
    private _audienceTurn = 0;
    /** 觀禮大頭像槽：節點與 Sprite 只建一次，之後只換圖與位置（手機記憶體：不新增圖集、不重建節點） */
    private _crowdSlots: Array<{ node: Node; opacity: UIOpacity; baseX: number }> = [];
    private _crowd: readonly CrowdMember[] = [];
    private _crowdCheerKeys: readonly string[] = [];
    private _crowdIntervalSeconds = 2.6;
    private _crowdTurn = 0;
    private _crowdTimer = 0;
    private _nameTagStyle: NameTagStyle | null = null;
    /** 載圖序號：重開典禮時，舊的非同步載入結果丟棄 */
    private _crowdLoadSeq = 0;
    /** 得獎起鬨／落榜拍肩的台詞鍵（PROG-2-10127）與接力進度 */
    private _winRelayKeys: readonly string[] = [];
    private _loseRelayKeys: readonly string[] = [];
    private _relayQueue: RelayStep[] = [];
    private _relayClock = 0;
    private _relayKind: RelayKind = 'win';
    /** 彩帶物件池：最多 CEREMONY_RIBBON_COUNT 個節點，落完回收重用 */
    private readonly _ribbons = new CeremonyRibbonPool();

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

    /** 頭像 id：NPC 名門（id 去掉 _yN 尾碼）與玩家；缺值走性別剪影 */
    public setPortraits(portraits: { npc?: Readonly<Record<string, string>>; player?: string }): void {
        this._portraits = portraits;
    }

    /** 帶入風雲榜（至多兩榜會被選進第 2 幕）；沒給或空陣列＝只播名門榜 */
    public setFameBoards(boards: readonly CeremonyBoard[]): void {
        this._fameBoards = boards;
    }

    /**
     * 帶入觀禮名單與台詞鍵（由宿主用 pickCeremonyCrowd 組好）；下一次 bindRankingResult 開播時生效。
     * 輪播只在典禮播放中推進，播完／跳過就停，不延長典禮。
     */
    public setCrowd(
        members: readonly CrowdMember[],
        cheerKeys: readonly string[],
        intervalSeconds: number,
        relayKeys?: { readonly win: readonly string[]; readonly lose: readonly string[] },
    ): void {
        this._crowd = members;
        this._crowdCheerKeys = cheerKeys;
        this._winRelayKeys = relayKeys?.win ?? [];
        this._loseRelayKeys = relayKeys?.lose ?? [];
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
        this._ribbons.recycleAll();
        this._winnerClicks = [0, 0, 0];
        this._audienceTurn = 0;
        this.prepareBoards(result);
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
        const limit = this.actSeconds(this._currentAct);
        this.fireEvents(ceremonyEventsBetween(this._currentAct, before, Math.min(this._elapsed, limit)));
        if (this._currentAct === 2) this.syncBoard(Math.min(this._elapsed, limit));
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
        if (this._currentAct === 2) {
            this._boardLocal = -1;
            this.showBoard(0);
            this.syncBoard(0);
        } else if (this._currentAct === 3) {
            this.showFinalBoard();
        }
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
        this._relayQueue = [];
        this._currentAct = 3;
        this.showFinalBoard();
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
        this._view?.setActHeadline(result.year, ceremonyActHeadline(this._currentAct, this._t));
        if (this.hintLabel) this.hintLabel.string = this._t('ui.ceremony.podium.hint');
        if (this.dialogueLabel) this.dialogueLabel.string = this.getActDialogueText();
        if (this.rewardLabel) {
            const reward = result.playerReward;
            const bonus = result.surpriseAward?.bonusGold ?? 0;
            this.rewardLabel.string = this._currentAct === 3
                ? this._t('ui.ceremony.reward', String(reward.gold + bonus), String(reward.jade))
                : '';
        }
    }

    /** 第 2 幕各榜的總秒數；其餘幕用固定秒數 */
    private actSeconds(act: CeremonyAct): number {
        return act === 2 && this._boards.length > 0 ? ceremonyAct2Seconds(this._boards) : CEREMONY_ACT_SECONDS[act - 1];
    }

    /** 組出本場要播的榜（名門榜＋至多兩個風雲榜），並讓領獎台顯示第一榜（台座先收著） */
    private prepareBoards(result: YearEndRankingResult): void {
        const house = buildHouseBoard(result, this._t, this._portraits);
        this._boards = planCeremonyBoards(house, this._fameBoards);
        this._boardIndex = 0;
        this._boardLocal = -1;
        if (!this._view && this.stageNode) {
            this._view = new CeremonyPodiumView(this.stageNode, {
                font: this.dialogueLabel?.font instanceof Font ? this.dialogueLabel.font : null,
                t: (key, ...args) => this._t(key, ...args),
                loadAvatar: (id) => loadGeneralAvatar(id || 'ceremony-guest', true),
                onTapWinner: (rank) => this.winnerSpeech(rank),
                onTapStage: () => this.tapStage(),
            });
        }
        this.showBoard(0);
    }

    /** 領獎台換到第 index 榜（台座收起，等揭曉事件升起） */
    private showBoard(index: number): void {
        const board = this._boards[index];
        const result = this._result;
        if (!board || !result || !this._view) return;
        this._boardIndex = index;
        this._view.setBoard(board, result.year, index, this._boards.length, ceremonyActHeadline(this._currentAct, this._t));
    }

    /** 第 3 幕／跳過：回名門榜（已在名門榜就保留現況）、全部亮出，前三名各留一句感言 */
    private showFinalBoard(): void {
        if (this._boardIndex !== 0 || !this._view?.board) this.showBoard(0);
        this._view?.revealAll();
        for (const rank of [1, 2, 3] as const) {
            if (this._winnerClicks[rank - 1] === 0) this._view?.showSpeech(rank, this.winnerSpeech(rank));
        }
    }

    /** 第 2 幕依經過秒數換榜、觸發本榜名次揭曉（季軍→亞軍→冠軍）；冠軍揭曉同時掌聲＋彩帶 */
    private syncBoard(elapsed: number): void {
        const { index, local } = ceremonyBoardAt(this._boards, elapsed);
        if (index !== this._boardIndex) {
            this.showBoard(index);
            this._boardLocal = -1;
        }
        const board = this._boards[index];
        if (!board) return;
        for (const reveal of ceremonyBoardRevealsBetween(board.seconds, this._boardLocal, local)) {
            this._view?.revealRank(reveal.rank);
            if (reveal.applause) {
                this._onCue?.('applause');
                this.dropRibbons();
                this._view?.revealCapsules();
            }
            if (index === 0 && this._result && reveal.rank === relayTriggerRank(this._result.playerRank)) this.startRelay();
        }
        this._boardLocal = local;
    }

    /** 點舞台空白處：第 2 幕跳下一榜；第 3 幕（看完後）輪流回看各榜 */
    private tapStage(): void {
        if (this._boards.length < 2) return;
        if (this._currentAct === 2 && this._playing) {
            if (this._boardIndex >= this._boards.length - 1) return;
            let start = 0;
            for (let i = 0; i <= this._boardIndex; i++) start += this._boards[i].seconds;
            this._elapsed = start;
            this.syncBoard(start);
        } else if (this._currentAct === 3) {
            this.showBoard((this._boardIndex + 1) % this._boards.length);
            this._view?.revealAll();
            this._view?.showSpeech(1, this.winnerSpeech(1));
        }
    }

    /** 前三名得獎感言：揭曉當下第一句，之後每點一次換下一句；{0} 自稱走 SpeakerVoice，{1} 榜名簡稱 */
    private winnerSpeech(rank: 1 | 2 | 3): string {
        const board = this._view?.board;
        if (!board) return '';
        const entry = board.entries.find((e) => e.rank === rank);
        if (!entry) return '';
        const clicks = this._winnerClicks[rank - 1]++;
        const self = selfOf({ gender: entry.gender === 'F' ? '女' : '男' });
        return this._t(winnerSpeechKey(rank, clicks), self, this._t(`ui.ceremony.board.${board.id}.short`));
    }

    /** 點觀眾頭像：依「榜名、本府名次、第幾次點擊」挑一句（名次反應／親友起鬨／吐槽拍肩／榜單評論） */
    private tapCrowd(memberIndex: number): void {
        const board = this._view?.board;
        if (!board || !this._crowd[memberIndex]) return;
        const playerRank = playerRankOnBoard(board);
        const key = audienceLineKey({ boardId: board.id, playerRank, turn: this._audienceTurn++ });
        this._relayQueue = [];
        this._crowdTimer = 0;
        this.speak(memberIndex, key, key.includes('.roast.') ? 'pat' : 'hop', audienceLineArgs(board, playerRank, this._t));
    }

    /** 時間軸事件：音效交給宿主；名次揭曉改由各榜自己的時間軸排（syncBoard） */
    private fireEvents(events: readonly CeremonyEvent[]): void {
        for (const event of events) {
            if (event.type === 'cue') {
                this._onCue?.(event.cue);
                continue;
            }
            this._view?.revealRank(event.rank);
        }
    }

    /** 開播：排好大頭像、立刻說第一句（之後每 _crowdIntervalSeconds 秒換人換句） */
    private startCrowd(): void {
        const container = this.crowdContainer;
        const members = this._crowd;
        this._crowdTurn = 0;
        this._crowdTimer = 0;
        this._relayQueue = [];
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
            slot.baseX = (i - (members.length - 1) / 2) * step;
            slot.node.setPosition(slot.baseX, 0, 0);
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

    private ensureCrowdSlot(index: number): { node: Node; opacity: UIOpacity; baseX: number } {
        const existing = this._crowdSlots[index];
        if (existing) return existing;
        const container = this.crowdContainer!;
        const node = new Node(`CrowdAvatar${index + 1}`);
        node.layer = container.layer;
        node.addComponent(UITransform).setContentSize(CROWD_AVATAR_SIZE, CROWD_AVATAR_SIZE);
        node.addComponent(Sprite);
        const opacity = node.addComponent(UIOpacity);
        container.addChild(node);
        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.tapCrowd(index);
        });
        const slot = { node, opacity, baseX: 0 };
        this._crowdSlots[index] = slot;
        return slot;
    }

    private tickCrowd(dt: number): void {
        if (this._crowd.length === 0 || !this.crowdContainer?.active) return;
        if (this._relayQueue.length > 0) {
            // 接力進行中：暫停一般輪播，免得被插話
            this._crowdTimer = 0;
            this.advanceRelay(dt);
            return;
        }
        this._crowdTimer += dt;
        if (this._crowdTimer < this._crowdIntervalSeconds) return;
        this._crowdTimer -= this._crowdIntervalSeconds;
        this._crowdTurn += 1;
        this.sayCrowdLine();
    }

    /** 一般輪播：輪到誰就誰跳起放大、其餘縮小變淡，台詞行換成「名字標籤＋這句台詞」 */
    private sayCrowdLine(): void {
        const { memberIndex, lineIndex } = crowdTurn(this._crowdTurn, this._crowd.length, this._crowdCheerKeys.length);
        if (memberIndex < 0) return;
        this.speak(memberIndex, this._crowdCheerKeys[lineIndex], 'hop');
    }

    /** 得獎起鬨／落榜拍肩：開一段 2～3 人的接力，第一句立刻說 */
    private startRelay(): void {
        if (!this.crowdContainer?.active) return;
        const kind: RelayKind = this._result && this._result.playerRank <= 3 ? 'win' : 'lose';
        const keys = kind === 'win' ? this._winRelayKeys : this._loseRelayKeys;
        const steps = planRelay(this._crowdTurn, this._crowd.length, keys);
        if (steps.length === 0) return;
        this._crowdTurn += 1;
        this._relayKind = kind;
        this._relayQueue = steps;
        this._relayClock = 0;
        this.advanceRelay(0);
    }

    private advanceRelay(dt: number): void {
        this._relayClock += dt;
        while (this._relayQueue.length > 0 && this._relayQueue[0].atSeconds <= this._relayClock) {
            const step = this._relayQueue.shift()!;
            this.speak(step.memberIndex, step.lineKey, this._relayKind === 'win' ? 'hop' : 'pat');
        }
    }

    /**
     * 讓第 memberIndex 位觀眾說話：hop＝跳起歡呼（上下彈跳＋放大），pat＝拍肩偷笑（左右輕晃）；其餘人縮小變淡。
     * 台詞自稱走 SpeakerVoice（性別、性格、年齡）。
     */
    private speak(memberIndex: number, lineKey: string, motion: 'hop' | 'pat', extraArgs: readonly string[] = []): void {
        const members = this._crowd;
        const speaker = members[memberIndex];
        if (!speaker) return;
        for (let i = 0; i < members.length; i++) {
            const slot = this._crowdSlots[i];
            if (!slot) continue;
            const on = i === memberIndex;
            tween(slot.node).stop();
            slot.node.setPosition(slot.baseX, 0, 0);
            const t = tween(slot.node);
            if (!on) {
                t.to(0.18, { scale: new Vec3(0.9, 0.9, 1) });
            } else if (motion === 'hop') {
                t.to(0.12, { position: new Vec3(slot.baseX, CROWD_HOP_PX, 0), scale: new Vec3(1.3, 1.3, 1) }, { easing: 'sineOut' })
                    .to(0.16, { position: new Vec3(slot.baseX, 0, 0), scale: new Vec3(1.25, 1.25, 1) }, { easing: 'sineIn' });
            } else {
                t.to(0.08, { position: new Vec3(slot.baseX + CROWD_PAT_PX, 0, 0), scale: new Vec3(1.2, 1.2, 1) })
                    .to(0.1, { position: new Vec3(slot.baseX - CROWD_PAT_PX, 0, 0) })
                    .to(0.1, { position: new Vec3(slot.baseX + CROWD_PAT_PX / 2, 0, 0) })
                    .to(0.08, { position: new Vec3(slot.baseX, 0, 0) });
            }
            t.start();
            slot.opacity.opacity = on ? 255 : 150;
        }
        const label = this.crowdLineLabel;
        if (!label) return;
        label.horizontalAlign = HorizontalTextAlignment.LEFT;
        const line = resolveCrowdVoiceLine((key, ...args) => this._t(key, ...args), lineKey, speaker, ...extraArgs);
        label.string = this._t('ui.ceremony.crowd.say', speaker.name, line);
        if (this._nameTagStyle) applyGeneralNameTag(label.node, speaker.generalId, speaker.name, this._nameTagStyle);
    }

    /** 前三名揭曉：從面板上緣飄落 CEREMONY_RIBBON_COUNT 枚彩帶（物件池重用） */
    private dropRibbons(): void {
        const size = this.node.getComponent(UITransform);
        this._ribbons.spawn(this.node, planRibbons(CEREMONY_RIBBON_COUNT), size?.width ?? 860, size?.height ?? 420);
    }

    /** 收下賞賜後把入帳結果寫在賞賜行（不重複領的情況由宿主傳訊息文字） */
    public showClaimMessage(text: string): void {
        if (this.rewardLabel) this.rewardLabel.string = text;
    }
}
