// @spec-source → 新手開場規格書 OPEN-05 / PROG-2-9010
import type { Node } from 'cc';
import type { GameSession } from '../../core/managers/GameSession';
import type { GachaConfig } from '../../core/models/GachaConfig';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { OpeningFlowEvent } from '../../core/config/OpeningFlowConfig';
import { DestinyOpeningController, DESTINY_OPENING_MAX_ROWS } from './DestinyOpeningController';
import { OnboardingFlowController } from './OnboardingFlowController';
import { destinyLockedEvent } from '../../core/systems/DestinyOpening';
import { shouldShowOpeningLetter } from '../../core/systems/OpeningLetter';
import { OPENING_BEAUTY_POOL_ID, rollOpeningBeauty } from '../../core/systems/OpeningBeauty';
import { applyFlowView } from './NurtureFlowViewApplier';

/** Scene supplies the existing Cocos host; tests need only these used capabilities. */
export interface LobbyOpeningPanelHost {
    node: Node;
    binder: Parameters<typeof applyFlowView>[0] | null;
}

export interface LobbyOpeningPanelPorts {
    session: () => GameSession;
    generals: () => readonly GeneralConfig[];
    /** 新局，或讀檔後開場尚未播完 */
    isNewPlayer: () => boolean;
    /** 大廳面板是否已掛完；開場優先掛載時新手引導要等它（引導指向大廳按鈕，PROG-2-2223）。未提供視為已就緒 */
    lobbyReady?: () => boolean;
    loadGachaConfig: () => Promise<GachaConfig[]>;
    mountHost: (name: string, screen: string, bindings: { buttonId: string; handler: () => void }[]) => Promise<LobbyOpeningPanelHost>;
    bringToFront: (node: Node) => void;
    refreshSeasonHud: () => void;
    notifyBeauty: (name: string) => void;
    canNotifyBeauty?: () => boolean;
    advanceOpening: (event: OpeningFlowEvent) => void;
    /**
     * 宿命轉蛋確認開局後的滿版結算（PROG-2-2236，沿用 PROG-2-2221 的結果畫面）：
     * 大立繪為選定的核心名將，下方列出本輪抽出的名單；玩家關閉後 resolve，開場才往下走。未提供則直接往下走。
     */
    showDestinyResult?: (view: { coreId: string; rolledIds: readonly string[] }) => Promise<void>;
    /** 宿命轉蛋六框載立繪（與招賢館同一套擺位，PROG-2-1147）；keys 依框序 */
    applyFramePortraits?: (binder: NonNullable<LobbyOpeningPanelHost['binder']>, keys: readonly string[]) => void;
    /** 開場信件的標題與本文（已查好 i18n 的字串） */
    openingLetterText?: () => { title: string; body: string };
    /** 開場面板完成顯示／退場後，通知宿主重查延後彈窗。 */
    onOverlayChanged?: () => void;
    warn: (message: string, error?: unknown) => void;
    focusTutorial?: (host: LobbyOpeningPanelHost, step: number) => void;
}

/** 大廳開場面板接線；Scene 保留 Cocos 掛載與公開入口。 */
export class LobbyOpeningPanels {
    private _onboarding: OnboardingFlowController | null = null;
    private _onboardingHost: LobbyOpeningPanelHost | null = null;
    private _openingLetterHost: LobbyOpeningPanelHost | null = null;
    private _destiny: DestinyOpeningController | null = null;
    private _destinyHost: LobbyOpeningPanelHost | null = null;
    /** 上次載入的立繪順序；沒變就不重載，避免每次點選都閃一下 */
    private _destinyPortraitKeys = '';
    private _pendingBeauty: string | null = null;
    /** 開局後的結算畫面：未顯示 → 顯示中 → 已關閉；只顯示一次 */
    private _destinyResult: 'pending' | 'showing' | 'done' = 'pending';

    constructor(private readonly _ports: LobbyOpeningPanelPorts) {}

    /** 目前顯示中的開場面板節點（信件、宿命轉蛋、新手引導），供宿主維持最上層（PROG-2-2223）。 */
    public activeHostNodes(): Node[] {
        return [this._openingLetterHost, this._destinyHost, this._onboardingHost]
            .filter((host): host is LobbyOpeningPanelHost => host !== null && host.node.active)
            .map(host => host.node);
    }

    public async mountOnboarding(): Promise<void> {
        this._onboarding = new OnboardingFlowController({
            // 結算畫面還開著時不出引導，避免疊在結算上（PROG-2-2236）
            ready: () => (this._ports.lobbyReady?.() ?? true)
                && (!this._ports.isNewPlayer() || (this._destiny?.started === true && this._destinyResult !== 'showing')),
            state: () => this._ports.session().onboarding,
            acknowledge: segmentId => this._ports.session().acknowledgeOnboarding(segmentId),
        });
        this._onboardingHost = await this._ports.mountHost('OnboardingTutorialHost', 'onboarding-tutorial-screen', [
            { buttonId: 'btnNextTutorial', handler: () => { void this.nextTutorial(); } },
        ]);
        this.refreshOnboarding();
    }

    /** 與季報共用宿主的開場守衛；出場介紹或教學未結束時保留通知。 */
    public flushPendingBeauty(): void {
        if (!this._pendingBeauty || this._ports.canNotifyBeauty?.() === false) return;
        const name = this._pendingBeauty;
        this._pendingBeauty = null;
        this._ports.notifyBeauty(name);
    }

    public refreshOnboarding(): void {
        this.flushPendingBeauty();
        const host = this._onboardingHost;
        const onboarding = this._onboarding;
        if (!host || !onboarding) return;
        host.node.active = onboarding.shouldShow();
        this._ports.onOverlayChanged?.();
        if (!host.node.active) return;
        this._ports.bringToFront(host.node);
        if (host.binder) applyFlowView(host.binder, onboarding.getFlowView());
        this._ports.focusTutorial?.(host, this._ports.session().onboarding.nextIndex);
    }

    public async nextTutorial(): Promise<void> {
        if (!this._onboarding) return;
        try {
            await this._onboarding.next();
        } catch (error) {
            this._ports.warn('[LobbyScene] 新手引導存檔失敗', error);
        } finally {
            this.refreshOnboarding();
        }
    }

    /**
     * 開場信件面板（PROG-2-1305）。新局在第一幕後由 openLetterThen 開信，關信後才接下一步
     * （PROG-2-2222：信 → 六名將登場 → 宿命轉蛋）；舊玩家未讀照常顯示。已讀後不再自動開；關閉時記為已讀並存檔。
     */
    public async mountOpeningLetter(): Promise<void> {
        this._openingLetterHost = await this._ports.mountHost('OpeningLetterHost', 'opening-letter-screen', [
            { buttonId: 'btnCloseOpeningLetter', handler: () => { void this.closeOpeningLetter(); } },
        ]);
        this.refreshOpeningLetter();
    }

    public refreshOpeningLetter(): void {
        const host = this._openingLetterHost;
        if (!host) return;
        const ready = !this._ports.isNewPlayer() || this._afterLetter !== null;
        const show = ready && shouldShowOpeningLetter(this._ports.session().openingLetter);
        host.node.active = show;
        this._ports.onOverlayChanged?.();
        if (!show) return;
        this._ports.bringToFront(host.node);
        if (host.binder) {
            const text = this._ports.openingLetterText?.() ?? { title: '', body: '' };
            host.binder.setTexts({ openingLetterTitle: text.title, openingLetterBody: text.body });
        }
    }

    public async closeOpeningLetter(): Promise<void> {
        const host = this._openingLetterHost;
        if (host) host.node.active = false;
        try {
            await this._ports.session().markOpeningLetterSeen();
        } catch (error) {
            this._ports.warn('[LobbyScene] 開場信件已讀存檔失敗', error);
        }
        const next = this._afterLetter;
        this._afterLetter = null;
        this._ports.onOverlayChanged?.();
        next?.();
    }

    public async mountDestiny(): Promise<void> {
        const config = await this._ports.loadGachaConfig();
        const heroPool = (Array.isArray(config) ? config : []).find(pool => pool.poolId === 'hero-pool');
        if (!heroPool) {
            this._ports.warn('[LobbyScene] 找不到 hero-pool 轉蛋設定，略過宿命轉蛋');
            return;
        }
        const beautyPool = (Array.isArray(config) ? config : []).find(pool => pool.poolId === OPENING_BEAUTY_POOL_ID);
        const session = this._ports.session();
        this._destiny = new DestinyOpeningController({
            config: () => heroPool,
            beauty: () => rollOpeningBeauty(beautyPool, this._ports.generals(), session.randomSource),
            generals: () => this._ports.generals(),
            session,
            random: session.randomSource,
            seed: () => Math.floor(session.randomSource() * 4294967296),
            onStarted: async () => {
                if (session.hasSaveService) await session.save();
                const beautyId = this._destiny?.beautyId;
                const beautyName = beautyId ? this._ports.generals().find(g => g.id === beautyId)?.name : null;
                if (beautyName) {
                    this._pendingBeauty = beautyName;
                    this.flushPendingBeauty();
                }
                this._ports.refreshSeasonHud();
            },
        });
        const act = (task: () => Promise<unknown> | unknown): (() => void) => () => {
            void Promise.resolve(task()).then(() => { this.afterDestinyAction(); });
        };
        const rowBindings = Array.from({ length: DESTINY_OPENING_MAX_ROWS }, (_, i) => ({
            buttonId: `btnFrame${i}`,
            handler: act(() => this._destiny?.select(i)),
        }));
        this._destinyHost = await this._ports.mountHost('DestinyOpeningHost', 'destiny-opening-screen', [
            { buttonId: 'btnDestinyRoll', handler: act(() => this._destiny?.roll()) },
            { buttonId: 'btnDestinyReset', handler: act(() => this._destiny?.reset()) },
            { buttonId: 'btnDestinyConfirm', handler: act(() => this._destiny?.confirm()) },
            ...rowBindings,
        ]);
    }

    /**
     * 新局開信，讀完關掉才執行 next（PROG-2-2222：信之後接六名將登場）。
     * 信已讀或面板沒掛上時直接執行 next，不讓開場卡住。
     */
    public openLetterThen(next: () => void): void {
        if (this._openingLetterHost && shouldShowOpeningLetter(this._ports.session().openingLetter)) {
            this._afterLetter = next;
            this.refreshOpeningLetter();
            return;
        }
        next();
    }

    /** 打開宿命轉蛋；轉蛋設定載入失敗、面板沒掛上時回 false */
    public openDestiny(): boolean {
        if (!this._destinyHost) return false;
        this._showDestiny();
        return true;
    }

    /** 新局信件讀完後要接著做的下一步 */
    private _afterLetter: (() => void) | null = null;

    private _showDestiny(): void {
        const host = this._destinyHost;
        if (!host) return;
        host.node.active = true;
        this._ports.bringToFront(host.node);
        this.refreshDestiny();
    }

    private afterDestinyAction(): void {
        this.refreshOnboarding();
        this.refreshOpeningLetter();
        if (this._destiny?.started && this._destinyHost) {
            this._destinyHost.node.active = false;
            void this._presentDestinyResultThenAdvance();
            return;
        }
        this.refreshDestiny();
        this._scheduleReveal();
    }

    /** 開局後先給滿版結算，關閉後才推進開場；結算失敗不擋開場（PROG-2-2236） */
    private async _presentDestinyResultThenAdvance(): Promise<void> {
        const destiny = this._destiny;
        if (!destiny || this._destinyResult !== 'pending') return;
        const state = destiny.state;
        const show = this._ports.showDestinyResult;
        if (show && state.locked) {
            this._destinyResult = 'showing';
            try {
                await show({ coreId: state.locked, rolledIds: [...state.rolled] });
            } catch (error) {
                this._ports.warn('[LobbyScene] 宿命轉蛋結算畫面顯示失敗', error);
            }
        }
        this._destinyResult = 'done';
        const event = destinyLockedEvent(state);
        if (event) this._ports.advanceOpening(event);
        this.refreshOnboarding();
    }

    /** 盲盒逐字浮現：每 60ms 露一個字，露完停（PROG-2-1621） */
    private _revealTimer: ReturnType<typeof setInterval> | null = null;
    private _scheduleReveal(): void {
        if (this._revealTimer || !this._destiny?.revealing) return;
        this._revealTimer = setInterval(() => {
            this._destiny?.tickReveal();
            this.refreshDestiny();
            if (!this._destiny?.revealing && this._revealTimer) {
                clearInterval(this._revealTimer);
                this._revealTimer = null;
            }
        }, 60);
    }

    private refreshDestiny(): void {
        const binder = this._destinyHost?.binder;
        if (!binder || !this._destiny) return;
        applyFlowView(binder, this._destiny.getFlowView());
        const keys = this._destiny.framePortraitKeys();
        if (keys.join(',') !== this._destinyPortraitKeys) {
            this._destinyPortraitKeys = keys.join(',');
            this._ports.applyFramePortraits?.(binder, keys);
        }
    }
}
