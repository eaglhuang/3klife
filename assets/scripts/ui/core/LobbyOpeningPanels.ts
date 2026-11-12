// @spec-source → 新手開場規格書 OPEN-05 / PROG-2-9010
import type { Node } from 'cc';
import type { GameSession } from '../../core/managers/GameSession';
import type { GachaConfig } from '../../core/models/GachaConfig';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { OpeningFlowEvent } from '../../core/config/OpeningFlowConfig';
import { DestinyOpeningController, type DestinyPoolView } from './DestinyOpeningController';
import { OnboardingFlowController } from './OnboardingFlowController';
import { destinyLockedEvent } from '../../core/systems/DestinyOpening';
import { DESTINY_POOL_ID } from '../../core/systems/DestinyPool';
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
     * 宿命池（PROG-2-2243）：用轉蛋系統的十連結果畫面顯示這一輪，按鈕只有重轉／確定。
     * 每次重轉、確定失敗都會再呼叫一次重畫；回傳畫面節點供維持最上層。未提供則略過宿命池。
     */
    presentDestinyPool?: (view: DestinyPoolView, actions: { reroll: () => void; confirm: () => void }) => Promise<Node | null>;
    /** 確定開局後收掉宿命池畫面 */
    closeDestinyPool?: () => void;
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
    /** 宿命池畫面節點（轉蛋結果畫面的宿主） */
    private _destinyNode: Node | null = null;
    private _pendingBeauty: string | null = null;
    /** 宿命池開局後已推進開場；只推進一次 */
    private _destinyAdvanced = false;

    constructor(private readonly _ports: LobbyOpeningPanelPorts) {}

    /** 目前顯示中的開場面板節點（信件、宿命轉蛋、新手引導），供宿主維持最上層（PROG-2-2223）。 */
    public activeHostNodes(): Node[] {
        const nodes = [this._openingLetterHost, this._onboardingHost]
            .filter((host): host is LobbyOpeningPanelHost => host !== null && host.node.active)
            .map(host => host.node);
        if (this._destinyNode?.active && !this._destinyAdvanced) nodes.splice(1, 0, this._destinyNode);
        return nodes;
    }

    public async mountOnboarding(): Promise<void> {
        this._onboarding = new OnboardingFlowController({
            // 結算畫面還開著時不出引導，避免疊在結算上（PROG-2-2236）
            ready: () => (this._ports.lobbyReady?.() ?? true)
                && (!this._ports.isNewPlayer() || this._destiny?.started === true),
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
        const heroPool = (Array.isArray(config) ? config : []).find(pool => pool.poolId === DESTINY_POOL_ID);
        if (!heroPool) {
            this._ports.warn('[LobbyScene] 找不到 destiny-pool 轉蛋設定，略過宿命轉蛋');
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

    /** 打開宿命池：第一次自動轉一輪；設定載入失敗、沒有畫面接口時回 false */
    public openDestiny(): boolean {
        if (!this._destiny || !this._ports.presentDestinyPool) return false;
        if (this._destiny.state.phase === 'idle') this._destiny.roll();
        void this._presentDestiny();
        return true;
    }

    /** 新局信件讀完後要接著做的下一步 */
    private _afterLetter: (() => void) | null = null;

    private async _presentDestiny(): Promise<void> {
        const destiny = this._destiny;
        const present = this._ports.presentDestinyPool;
        if (!destiny || !present) return;
        try {
            this._destinyNode = await present(destiny.getView(), {
                reroll: () => { if (destiny.reroll()) void this._presentDestiny(); },
                confirm: () => { void destiny.confirm().then(() => this.afterDestinyAction()); },
            });
            if (this._destinyNode) this._ports.bringToFront(this._destinyNode);
        } catch (error) {
            this._ports.warn('[LobbyScene] 宿命池畫面顯示失敗', error);
        }
    }

    private afterDestinyAction(): void {
        this.refreshOnboarding();
        this.refreshOpeningLetter();
        const destiny = this._destiny;
        if (!destiny?.started) {
            void this._presentDestiny();
            return;
        }
        if (this._destinyAdvanced) return;
        this._destinyAdvanced = true;
        this._ports.closeDestinyPool?.();
        const event = destinyLockedEvent(destiny.state);
        if (event) this._ports.advanceOpening(event);
        this.refreshOnboarding();
    }
}
