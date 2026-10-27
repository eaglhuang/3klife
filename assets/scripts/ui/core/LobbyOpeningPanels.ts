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
    isNewPlayer: () => boolean;
    loadGachaConfig: () => Promise<GachaConfig[]>;
    mountHost: (name: string, screen: string, bindings: { buttonId: string; handler: () => void }[]) => Promise<LobbyOpeningPanelHost>;
    bringToFront: (node: Node) => void;
    refreshSeasonHud: () => void;
    notifyBeauty: (name: string) => void;
    advanceOpening: (event: OpeningFlowEvent) => void;
    /** 宿命轉蛋六框載立繪（與招賢館同一套擺位，PROG-2-1147）；keys 依框序 */
    applyFramePortraits?: (binder: NonNullable<LobbyOpeningPanelHost['binder']>, keys: readonly string[]) => void;
    /** 開場信件的標題與本文（已查好 i18n 的字串） */
    openingLetterText?: () => { title: string; body: string };
    warn: (message: string, error?: unknown) => void;
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

    constructor(private readonly _ports: LobbyOpeningPanelPorts) {}

    public async mountOnboarding(): Promise<void> {
        this._onboarding = new OnboardingFlowController({
            ready: () => !this._ports.isNewPlayer() || this._destiny?.started === true,
            state: () => this._ports.session().onboarding,
            acknowledge: segmentId => this._ports.session().acknowledgeOnboarding(segmentId),
        });
        this._onboardingHost = await this._ports.mountHost('OnboardingTutorialHost', 'onboarding-tutorial-screen', [
            { buttonId: 'btnNextTutorial', handler: () => { void this.nextTutorial(); } },
        ]);
        this.refreshOnboarding();
    }

    public refreshOnboarding(): void {
        const host = this._onboardingHost;
        const onboarding = this._onboarding;
        if (!host || !onboarding) return;
        host.node.active = onboarding.shouldShow();
        if (!host.node.active) return;
        this._ports.bringToFront(host.node);
        if (host.binder) applyFlowView(host.binder, onboarding.getFlowView());
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
     * 開場信件面板（PROG-2-1305）。就緒條件與新手引導相同：新局要等宿命開局開始後才開，
     * 已讀後不再自動開；關閉時記為已讀並存檔。
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
        const ready = !this._ports.isNewPlayer() || this._destiny?.started === true;
        const show = ready && shouldShowOpeningLetter(this._ports.session().openingLetter);
        host.node.active = show;
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
                if (beautyName) this._ports.notifyBeauty(beautyName);
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

    public openDestiny(): void {
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
            if (destinyLockedEvent(this._destiny.state)) {
                this._ports.advanceOpening(destinyLockedEvent(this._destiny.state)!);
            }
            return;
        }
        this.refreshDestiny();
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
