// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-1429 依建檔紀錄補標出處
import { Button, Color, Label, Node, Rect, Sprite, SpriteFrame, UIOpacity, UITransform, Widget, tween } from 'cc';
import { fullScreenPanelScale } from './GachaFullScreenPanel';
import { disableCharCache } from './LabelCjkCache';
import { formatGachaLine, loadGachaLines, type GachaLineTable } from './GachaLines';
import { shouldSwitchShowcase, showcaseDesc } from './GachaShowcaseBanner';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { LocalGachaService, type LocalGachaResultEntry } from '../../core/services/LocalGachaService';
import { UIScreenPreviewHost } from '../components/UIScreenPreviewHost';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { awaitWithTimeout } from '../../core/utils/AwaitGuard';
import { showGachaHistory, showGachaResults } from '../dev/GachaDevOverlay';
import type { GachaConfig } from '../../core/models/GachaConfig';
import { GachaSystem, type GachaPullOutcome } from '../../core/systems/GachaSystem';
import { GOLD_SUMMON_POOL_ID, TICKET_SUMMON_POOL_ID, registerLocalGachaRules } from '../../core/systems/GachaLocalRules';
import { gachaPoolHeader, gachaPoolTitle } from '../../core/systems/GachaPoolPresentation';
import { DESTINY_POOL_ID } from '../../core/systems/DestinyPool';
import type { GachaCurrencyId } from '../../core/gacha/GachaApi';
import type { RewardGachaPort, RewardGachaPullOutcome } from '../../core/gacha/RewardGachaPull';
import {
    countPullResultRarities, coverCropRect, fitContain, pickTopGachaResult, pullResultRarityLabel,
    raritySummaryCellActives, raritySummarySlots, renderedBoxAspect,
} from './GachaResultRanking';
import { buildHeroSlotAliases, buildResultSlotAliases, gachaCardStars, toGachaCardTier } from './GachaResultCardTheme';
import { formatResultBalance } from '../../core/gacha/GachaButtonRules';
import { loadGeneralAvatar, loadGeneralPortrait } from './GeneralAvatarLoader';
import { bindAvatarTalk } from './AvatarTalkBubble';

export const DEFAULT_POOL_ID = 'GENERAL_STANDARD_01';

export { GACHA_SCREEN_ID } from './GachaScreenNodes';
export const GACHA_PULL_RESULT_SCREEN_ID = 'gacha-pull-result';

const REPULL_ENABLED_COLOR = new Color(245, 210, 122, 255);

/** 卡片頭像節點名（PROG-2-2247） */
const CARD_PORTRAIT_NODE = 'CardPortrait';

/** 十連結果卡節點（原稿 Design System 3/ui_kits/gacha-pull-result，data-name 指定） */
/** 取同一張貼圖裁成指定寬高比的 SpriteFrame（共用貼圖，只是另一個矩形；不複製像素） */
function cropFrameToAspect(frame: SpriteFrame, aspect: number): SpriteFrame {
    const rect = frame.rect;
    const crop = coverCropRect(rect.width, rect.height, aspect);
    const cropped = frame.clone();
    cropped.rect = new Rect(rect.x + crop.x, rect.y + crop.y, crop.width, crop.height);
    return cropped;
}

const GACHA_PULL_RESULT_CARDS = Array.from({ length: 10 }, (_, i) => `GachaPullResult_card_${i}`);
/** 統計列三格容器（每格內含文字與綠點），與 raritySummarySlots 的三格一一對應 */
const GACHA_PULL_RESULT_SUMMARY_CELLS = ['GachaPullResult_div_1', 'GachaPullResult_div_3', 'GachaPullResult_div_5'];
const GACHA_PULL_RESULT_CARD_NODE_MAP =GACHA_PULL_RESULT_CARDS.map((card) => ({ rarityId: `${card}_tag`, nameId: `${card}_name`, starsId: `${card}_stars` }));

export interface GachaFlowCoordinatorOptions {
    gachaService: LocalGachaService;
    getHost: () => UIScreenPreviewHost | null;
    getGenerals: () => GeneralConfig[];
    factionFilter: 'all' | 'player' | 'enemy';
    onShowError: (message: string) => void;
    onWalletChanged?: () => void;
    onAfterPullSuccess?: (results: LocalGachaResultEntry[]) => void;
    onBackToGacha: () => void | Promise<void>;
    onRepullTen?: () => void | Promise<void>;
    poolId?: string;
    gemsCostPerPull?: number;
    tenPullHeaderText?: string;
    formatError?: (error: unknown, fallbackMessage: string) => string;
    /**
     * 抽取改走共通 API（GCH-R4）：旗標開啟且獎池已載入時回傳轉接，該池就走 reward.roll；回 null 走舊規則。
     * rewardQuote 依餘額與價格表決定這次付哪種貨幣、付多少；餘額不足時丟錯（訊息直接顯示給玩家）。
     */
    rewardPull?: () => RewardGachaPort | null;
    rewardQuote?: (poolId: string, drawCount: number) => Promise<{ currency: GachaCurrencyId; cost: number }>;
    /** 走共通 API 抽完（入冊、扣款都完成）後、顯示結果前通知，讓大廳記下入冊結果給提示用 */
    onRewardPulled?: (outcome: RewardGachaPullOutcome) => void;
    /** 讀池設定（data/gacha-config）；沒給時各池用 poolType 預設呈現 */
    loadPools?: () => Promise<GachaConfig[] | null>;
    /** 某位武將被展示時要跳的提示橫幅（只該武將的）；由外層依入冊結果提供（PROG-2-9143） */
    bannerLinesOf?: (generalId: string) => string[] | Promise<string[]>;
    /** 顯示提示橫幅 */
    onShowBanner?: (message: string) => void;
    /** 換人時先收掉上一位還沒播完的提示橫幅，避免它跟著新人物出現 */
    onClearBanner?: () => void;
}

/**
 * 轉蛋流程各個「等資源」步驟的上限（毫秒，PROG-2-9404，issue #2223）：
 * 卡池清單、台詞表、結果畫面規格、卡面換皮任何一個下載卡住，結果畫面就一直停在底層遮罩、玩家沒有按鈕可按。
 * 逾時就略過（台詞、換皮）或回報失敗（結果畫面），讓流程繼續或給出錯誤提示。
 */
const GACHA_LOAD_MAX_MS = 10000;

export class GachaFlowCoordinator {
    private _heroPortraitSeq = 0;
    private _cardPortraitSeq = 0;
    /** 目前結果畫面的 host 與「每張卡的換色對應」；點卡切換展示武將時要連同卡片對應一起重套（換色是整組覆寫） */
    private _resultHost: UIScreenPreviewHost | null = null;
    private _resultCardAliases: Record<string, string> = {};
    private readonly _options: GachaFlowCoordinatorOptions;
    private _resultBackAction: (() => void | Promise<void>) | null = null;
    private _resultRepullAction: (() => void | Promise<void>) | null = null;
    private _resultRepullPending = false;
    /** 展示區目前顯示的武將 id（切換才換畫面／跳提示）與本輪結果、台詞表（PROG-2-9143） */
    private _showcaseId: string | null = null;
    private _showcaseResults: LocalGachaResultEntry[] = [];
    private _showcaseBinder: any = null;
    private _showcaseLines: GachaLineTable = {};
    /** 十張卡的點選處理（只建一次，重轉時重用，不重複建立） */
    private _cardTapHandlers: Array<() => void> = [];

    private _pools: GachaConfig[] = [];
    private _poolsLoaded: Promise<void> | null = null;
    private readonly _system: GachaSystem;

    public constructor(options: GachaFlowCoordinatorOptions) {
        this._options = options;
        // 所有抽卡都走轉蛋系統的一池（PROG-2-9020）；常設池 id 不在設定檔，另外掛名將池規則
        this._system = registerLocalGachaRules(
            new GachaSystem(() => this._pools), options.gachaService,
            { rollOptions: { factionFilter: options.factionFilter }, gemsCostPerPull: options.gemsCostPerPull },
            [options.poolId ?? DEFAULT_POOL_ID],
        );
    }

    /** 轉蛋系統（給大廳其他入口共用同一套池與規則） */
    public get system(): GachaSystem { return this._system; }

    private _ensurePools(): Promise<void> {
        if (!this._poolsLoaded) {
            const load = this._options.loadPools;
            this._poolsLoaded = load
                ? awaitWithTimeout(load().then((pools) => { this._pools = Array.isArray(pools) ? pools : []; }).catch(() => undefined),
                    GACHA_LOAD_MAX_MS, undefined, { label: 'gacha:load-pools' })
                : Promise.resolve();
        }
        return this._poolsLoaded;
    }

    /** 統一抽卡：轉蛋系統抽 → 通知 → 依池呈現設定顯示結果 */
    private async _runPool(poolId: string, drawCount: number, generals: GeneralConfig[], poolTypeHint: string, retry: () => Promise<void>, failMessage: string): Promise<void> {
        try {
            await this._ensurePools();
            const outcome = await this._pull(poolId, drawCount, generals, poolTypeHint);
            this._notifyPullSuccess(outcome.results);
            await this._presentOutcome(outcome, retry);
        } catch (error) {
            this._emitError(error, failMessage);
        }
    }

    /** 抽取：該池走共通 API 就 reward.roll，否則走轉蛋系統的舊規則；兩條回給畫面的結果型別相同 */
    private async _pull(poolId: string, drawCount: number, generals: GeneralConfig[], poolTypeHint: string): Promise<GachaPullOutcome> {
        const port = this._options.rewardPull?.() ?? null;
        const quote = this._options.rewardQuote;
        if (!port || !quote || !port.handles(poolId)) return this._system.pull({ poolId, drawCount, generals, poolTypeHint });
        const price = await quote(poolId, drawCount);
        const out = await port.pull({ poolId, count: drawCount, currency: price.currency, cost: price.cost });
        this._options.onRewardPulled?.(out);
        return { poolId, drawCount, results: out.results, presentation: this._system.presentation(poolId) };
    }

    private async _presentOutcome(outcome: GachaPullOutcome, retry: () => Promise<void>): Promise<void> {
        const p = outcome.presentation;
        const title = gachaPoolTitle(p, outcome.drawCount);
        const repull = p.repull === 'none' ? null : retry;
        const host = this._options.getHost();
        if (!host) {
            await showGachaResults(title, outcome.results, () => { void retry(); });
            return;
        }
        await this._renderPullResult(host, outcome.drawCount, outcome.results, title, p.currency, {
            hero: pickTopGachaResult(outcome.results),
            onBack: this._options.onBackToGacha,
            repull,
            hideHeroAfterReveal: p.heroReveal === 'hide',
            labels: p.labels ? { header: p.labels.header, heroSub: p.labels.heroSub, heroDesc: '', back: p.labels.back, repull: p.labels.repull } : undefined,
        });
    }

    public async showHistory(limit = 30): Promise<void> {
        try {
            const data = await this._options.gachaService.getRecentPullHistory(limit);
            showGachaHistory(data);
        } catch (error) {
            this._emitError(error, '讀取紀錄失敗');
        }
    }

    /** 黃金召喚、召喚券也是轉蛋系統的一池（PROG-2-9021） */
    public async runGoldSummon(): Promise<void> {
        await this._runPool(GOLD_SUMMON_POOL_ID, 1, this._options.getGenerals(), 'gold', () => this.runGoldSummon(), '黃金召喚失敗');
    }

    public async runTicketSummon(): Promise<void> {
        await this._runPool(TICKET_SUMMON_POOL_ID, 1, this._options.getGenerals(), 'tickets', () => this.runTicketSummon(), '召喚券失敗');
    }

    /** 紅顏池召喚（PROG-2-1086）：扣 1 張召喚券抽 1 位女性武將，入名冊後可去結緣 */
    public async runBeautySummon(poolId: string, generals: GeneralConfig[], drawCount = 1): Promise<void> {
        await this._runPool(poolId, drawCount, generals, 'heroine', () => this.runBeautySummon(poolId, generals, drawCount), '紅顏池召喚失敗');
    }

    /**
     * 支援卡池召喚（PROG-2-1085）：扣支援券、抽支援卡目錄裡的武將；抽到的只變成教官卡，不入名冊。
     * generals 由呼叫端先篩成本池候選且有支援卡資料的武將。
     */
    public async runSupportSummon(poolId: string, generals: GeneralConfig[], drawCount = 1): Promise<void> {
        await this._runPool(poolId, drawCount, generals, 'mentor', () => this.runSupportSummon(poolId, generals, drawCount), '支援卡召喚失敗');
    }

    /** 限定池召喚（PROG-2-9024）：只收靈玉，本期焦點武將由排程帶入並提高機率 */
    public async runLimitedSummon(poolId: string, generals: GeneralConfig[], drawCount = 1): Promise<void> {
        await this._runPool(poolId, drawCount, generals, 'limited', () => this.runLimitedSummon(poolId, generals, drawCount), '限定池召喚失敗');
    }

    public async runLocalGacha(drawCount: number): Promise<void> {
        const resolvedCount = Math.max(1, Math.floor(Number.isFinite(drawCount) ? drawCount : 1));
        const poolId = this._options.poolId ?? DEFAULT_POOL_ID;
        const retry = resolvedCount === 10 && this._options.onRepullTen
            ? async () => { await this._options.onRepullTen!(); }
            : () => this.runLocalGacha(resolvedCount);
        await this._runPool(poolId, resolvedCount, this._options.getGenerals(), 'hero', retry, '單機轉蛋失敗');
    }

    /**
     * 宿命池（PROG-2-2243）：轉蛋系統的一池，免費。用同一個十連結果畫面顯示本輪，
     * 「再抽」改成免費「重轉」，「返回」改成「確定」（十位全收）；大立繪是本輪的宿命名將。
     */
    public async presentDestinyPool(
        host: UIScreenPreviewHost, results: LocalGachaResultEntry[],
        pool: { heroId: string | null; quote: string; message: string; resets: number; onReroll: () => void; onConfirm: () => void },
    ): Promise<void> {
        const hero = results.find(entry => entry.general.id === pool.heroId) ?? pickTopGachaResult(results);
        // 文案、再抽方式、展示後收起武將都讀池設定（PROG-2-9020）
        await this._ensurePools();
        const p = this._system.presentation(DESTINY_POOL_ID);
        const labels = p.labels;
        await this._renderPullResult(host, results.length, results, gachaPoolTitle(p, results.length), p.currency, {
            hero, onBack: pool.onConfirm, repull: p.repull === 'none' ? null : pool.onReroll,
            hideHeroAfterReveal: p.heroReveal === 'hide', showBalance: false,
            labels: labels ? {
                header: gachaPoolHeader(p, pool.resets),
                heroSub: labels.heroSub,
                // 有訊息先顯示訊息；否則用台詞表，台詞表沒有才用池內引言
                heroDesc: pool.message,
                heroDescFallback: pool.quote ? `「${pool.quote}」` : '',
                back: labels.back,
                repull: labels.repull,
            } : undefined,
        });
    }

    private async _renderPullResult(
        host: UIScreenPreviewHost, drawCount: number, results: LocalGachaResultEntry[], title: string,
        currency: 'gems' | 'gold' | 'tickets' | 'mentorTickets',
        flow: {
            hero: LocalGachaResultEntry | undefined; onBack: () => void | Promise<void>; repull: (() => void | Promise<void>) | null;
            /** 池別文案（宿命池等）；沒給時用一般轉蛋文案 */
            labels?: { header: string; heroSub: string; heroDesc: string; heroDescFallback?: string; back: string; repull: string };
            /** 點掉全螢幕展示後收起武將（只留結果面板）；預設移到面板左側 */
            hideHeroAfterReveal?: boolean;
            /** 標題附上抽完剩餘資源；免費池（宿命池）不附 */
            showBalance?: boolean;
        },
    ): Promise<void> {
        const topResult = flow.hero;
        const repull = flow.repull;
        const cardTexts: Record<string, string> = {};

        for (let index = 0; index < GACHA_PULL_RESULT_CARD_NODE_MAP.length; index += 1) {
            const nodeMap = GACHA_PULL_RESULT_CARD_NODE_MAP[index];
            const entry = results[index];
            cardTexts[nodeMap.rarityId] = entry ? this._toPullResultRarityLabel(entry.rarityTier) : '-';
            cardTexts[nodeMap.nameId] = entry ? entry.general.name : '未召喚';
            cardTexts[nodeMap.starsId] = entry ? gachaCardStars(toGachaCardTier(entry.rarityTier)) : '';
        }

        // 抽完還剩多少：玩家要決定「再抽」前看得到（PROG-2-9117）
        const balanceText = flow.showBalance === false ? '' : `　｜　剩餘 ${formatResultBalance(currency, this._options.gachaService.getWalletSnapshot())}`;
        // 統計列依這一輪實際稀有度動態排列（含 N），固定三格放不下時最後一格收容剩下的
        const raritySlots = raritySummarySlots(
            countPullResultRarities(results.map((entry) => entry.rarityTier)).map(({ label, count }) => `${label} ×${count}`), 3);
        // 本次主角登場台詞（PROG-2-2244）：所有池共用；沒有台詞退回原本描述
        const lineTable = await awaitWithTimeout<GachaLineTable>(loadGachaLines(), GACHA_LOAD_MAX_MS, {}, { label: 'gacha:load-lines' });
        const heroLine = topResult ? formatGachaLine(lineTable, topResult.general.id) : null;

        const screenShown = await awaitWithTimeout(host.showScreen(GACHA_PULL_RESULT_SCREEN_ID).then(() => true, () => false),
            GACHA_LOAD_MAX_MS * 2, false, { label: 'gacha:show-result-screen' });
        if (!screenShown) throw new Error('召喚已完成並入冊，但結果畫面載入失敗。');
        const binder = host.binder;
        if (!binder) {
            throw new Error('召喚已完成並入冊，但結果畫面 binder 缺失。');
        }

        const cards = GACHA_PULL_RESULT_CARDS;
        const cardActives: Record<string, boolean> = {};
        cards.forEach((name, index) => { cardActives[name] = index < results.length; });
        cardActives.GachaPullResult_repull = repull !== null;
        // 統計列沒用到的格整格隱藏（否則綠點會留著）
        Object.assign(cardActives, raritySummaryCellActives(raritySlots, GACHA_PULL_RESULT_SUMMARY_CELLS));
        binder.setActives(cardActives);

        const opening = repull === null;
        const labels = flow.labels;
        const backText = labels?.back ?? (opening ? '進入大廳' : '返回卡池');
        const repullText = labels?.repull ?? (drawCount === 10 ? '再抽十連' : `再${title}一次`);
        binder.setTexts({
            ...cardTexts,
            GachaPullResult_title: `✦ ${labels?.header ?? title}結果 (${results.length}/${drawCount})${topResult ? ` · 最高 ${this._toPullResultRarityLabel(topResult.rarityTier)} ${topResult.general.name}` : ''}${balanceText}`,
            GachaPullResult_back: backText,
            GachaPullResult_span_1: backText,
            GachaPullResult_repull: repullText,
            GachaPullResult_span_2: repullText,
            GachaPullResult_sum_high: raritySlots[0],
            GachaPullResult_sum_mid: raritySlots[1],
            GachaPullResult_sum_low: raritySlots[2],
            GachaPullResult_hero_rarity: topResult ? `✦ ${this._toPullResultRarityLabel(topResult.rarityTier)} · 絕世登場 ✦` : '✦ 絕世名將 ✦',
            GachaPullResult_hero_name: topResult ? `${topResult.general.name}${topResult.general.courtesyName ? ` · ${topResult.general.courtesyName}` : ''}` : '絕世名將',
            GachaPullResult_hero_desc: heroLine ?? (topResult ? (topResult.general.description || '義薄雲天 · 威震華夏 · 萬世流芳') : '名揚四海 · 天下歸心'),
            // 宿命池等有專屬文案時覆蓋
            ...(labels ? { GachaPullResult_hero_desc: labels.heroDesc || heroLine || labels.heroDescFallback || '' } : {}),
        });

        await awaitWithTimeout(this._restyleCardsByRarity(host, cards, results, topResult), GACHA_LOAD_MAX_MS, undefined, { label: 'gacha:restyle-cards' });
        // 逐字快取（CHAR）配英文 TTF 時中文畫不出來，換字後也會疊字；結果畫面整片改不快取
        disableCharCache(host.node);
        this._updateCardPortraits(binder, cards, results);

        if (topResult) {
            this._updateHeroPortrait(binder, topResult.general.id);
        }
        this._stageHeroReveal(binder, topResult !== null, flow.hideHeroAfterReveal === true);
        this._styleRepullButton(binder, repull !== null);
        // 展示區跟著「目前顯示的武將」走：初始是主角，點結果卡換人；提示橫幅與台詞此時才出現（PROG-2-9143）
        this._showcaseId = topResult ? topResult.general.id : null;
        this._showcaseResults = results;
        this._showcaseBinder = binder;
        this._showcaseLines = lineTable;
        this._bindCardTaps(binder, results.length, flow.hideHeroAfterReveal === true);
        if (topResult) this._announceShowcase(binder, topResult.general.id, false);

        this._resultBackAction = flow.onBack;
        this._resultRepullAction = repull;

        const backNode = binder.getNode('GachaPullResult_back');
        if (backNode) {
            backNode.getComponent(Button) ?? backNode.addComponent(Button);
            backNode.off(Button.EventType.CLICK, this._onResultBack, this);
            backNode.on(Button.EventType.CLICK, this._onResultBack, this);
        }

        const closeNode = binder.getNode('GachaPullResult_close');
        if (closeNode) {
            closeNode.getComponent(Button) ?? closeNode.addComponent(Button);
            closeNode.off(Button.EventType.CLICK, this._onResultBack, this);
            closeNode.on(Button.EventType.CLICK, this._onResultBack, this);
        }

        const repullNode = repull ? binder.getNode('GachaPullResult_repull') : null;
        if (repullNode) {
            repullNode.getComponent(Button) ?? repullNode.addComponent(Button);
            repullNode.off(Button.EventType.CLICK, this._onResultRepullTen, this);
            repullNode.on(Button.EventType.CLICK, this._onResultRepullTen, this);
        }
    }

    /** 展示這位武將時才跳他的提示橫幅，下方台詞同時淡入（不是整批一次丟出） */
    private _announceShowcase(binder: any, generalId: string, refreshTexts: boolean): void {
        void this._showcaseTexts(binder, generalId, refreshTexts);
    }

    private async _showcaseTexts(binder: any, generalId: string, refreshTexts: boolean): Promise<void> {
        const entry = this._showcaseResults.find((item) => item.general.id === generalId);
        if (!entry) return;
        if (refreshTexts) {
            binder.setTexts({
                GachaPullResult_hero_rarity: `✦ ${this._toPullResultRarityLabel(entry.rarityTier)} · 絕世登場 ✦`,
                GachaPullResult_hero_name: `${entry.general.name}${entry.general.courtesyName ? ` · ${entry.general.courtesyName}` : ''}`,
                GachaPullResult_hero_desc: showcaseDesc(entry.general, this._showcaseLines),
            });
            this._updateHeroPortrait(binder, entry.general.id);
            // 展示區的稀有度標籤與底框跟著這位武將的稀有度換色
            void this._resultHost?.restyleWithSlots({ ...this._resultCardAliases, ...buildHeroSlotAliases(toGachaCardTier(entry.rarityTier)) });
        }
        // 台詞淡入：重用同一個 UIOpacity，不每次新建節點
        const descNode: Node | null = binder.getNode ? binder.getNode('GachaPullResult_hero_desc') : null;
        if (descNode) {
            const opacity = descNode.getComponent(UIOpacity) ?? descNode.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(opacity).to(0.45, { opacity: 255 }).start();
        }
        const lines = await this._options.bannerLinesOf?.(generalId) ?? [];
        // 等資料的空檔玩家可能已點去看別人：不是目前展示的這位就不跳（提示只跟著畫面上的人）
        if (this._showcaseId !== generalId) return;
        for (const message of lines) this._options.onShowBanner?.(message);
    }

    /** 點結果卡 → 展示區換成那位武將（提示與台詞跟著換）；展示區會收起的池（宿命池等）沒有人在展示，不綁 */
    private _bindCardTaps(binder: any, count: number, showcaseHides: boolean): void {
        for (let index = 0; index < GACHA_PULL_RESULT_CARDS.length; index += 1) {
            const card: Node | null = binder.getNode ? binder.getNode(GACHA_PULL_RESULT_CARDS[index]) : null;
            if (!card) continue;
            this._cardTapHandlers[index] ??= () => this._onCardTap(index);
            card.off(Node.EventType.TOUCH_END, this._cardTapHandlers[index], this);
            if (!showcaseHides && index < count) card.on(Node.EventType.TOUCH_END, this._cardTapHandlers[index], this);
        }
    }

    private _onCardTap(index: number): void {
        const entry = this._showcaseResults[index];
        const binder = this._showcaseBinder;
        if (!entry || !binder || !shouldSwitchShowcase(this._showcaseId, entry.general.id)) return;
        this._showcaseId = entry.general.id;
        this._options.onClearBanner?.();
        this._announceShowcase(binder, entry.general.id, true);
    }

    private _notifyPullSuccess(results: LocalGachaResultEntry[]): void {
        if (this._options.onAfterPullSuccess) {
            try {
                this._options.onAfterPullSuccess(results);
            } catch (error) {
                UCUFLogger.warn(LogCategory.DATA, '[GachaFlowCoordinator] onAfterPullSuccess failed', error);
            }
        }

        if (this._options.onWalletChanged) {
            try {
                this._options.onWalletChanged();
            } catch (error) {
                UCUFLogger.warn(LogCategory.DATA, '[GachaFlowCoordinator] onWalletChanged failed', error);
            }
        }
    }

    /**
     * 結果卡配色照實際稀有度（PROG-2-9810）：每張卡的外框、角標、底圖、名牌、星列，以及右側展示區的標籤與底框，
     * 全部由該卡自己的 rarityTier 查 skin 的 `gacha.card.<稀有度>.<部位>` 色票，同稀有度必同色。
     * 舊作法是「找原稿同稀有度那張示意卡當樣板」，示意卡順序一變、或樣板沒套上，就會顯示原稿的固定配色（SR 變綠、R 變藍）。
     */
    private async _restyleCardsByRarity(host: UIScreenPreviewHost, cards: readonly string[], results: LocalGachaResultEntry[], hero: LocalGachaResultEntry | undefined): Promise<void> {
        const rarityTiers = results.map((entry) => entry.rarityTier);
        this._resultHost = host;
        this._resultCardAliases = buildResultSlotAliases(cards, rarityTiers, undefined);
        await host.restyleWithSlots({ ...this._resultCardAliases, ...(hero ? buildHeroSlotAliases(toGachaCardTier(hero.rarityTier)) : {}) });
    }

    private _toPullResultRarityLabel(rarityTier: string | null | undefined): string {
        return pullResultRarityLabel(rarityTier);
    }

    private _onResultBack(): void {
        const action = this._resultBackAction;
        if (!action || this._resultRepullPending) {
            return;
        }

        Promise.resolve(action()).catch((error) => {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] back action failed', error);
        });
    }

    private _onResultRepullTen(): void {
        const action = this._resultRepullAction;
        if (!action || this._resultRepullPending) {
            return;
        }
        this._resultRepullPending = true;
        Promise.resolve(action()).catch((error) => {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] repull action failed', error);
        }).then(() => { this._resultRepullPending = false; });
    }

    /**
     * 兩段揭曉（#2107-8）：先讓最高稀有武將置中獨佔全螢幕，結果面板藏起來；
     * 點畫面任一處才把武將移回左側、亮出結果面板，兩者不再同時擠在畫面上。
     */
    /** 可按的再抽／免費重轉用亮金字；skin 的深墨字配上沒有底圖的按鈕看起來像停用（#2107） */
    private _styleRepullButton(binder: any, enabled: boolean): void {
        if (!enabled) return;
        const node: Node | null = binder.getNode ? binder.getNode('GachaPullResult_repull') : null;
        const label = node?.getComponent(Label);
        if (label) label.color = REPULL_ENABLED_COLOR;
        const spanNode: Node | null = binder.getNode ? binder.getNode('GachaPullResult_span_2') : null;
        const spanLabel = spanNode?.getComponent(Label) ?? (binder.getLabel ? binder.getLabel('GachaPullResult_span_2') : null);
        if (spanLabel) spanLabel.color = REPULL_ENABLED_COLOR;
    }

    private _stageHeroReveal(binder: any, hasHero: boolean, hideAfterReveal = false): void {
        const showcase: Node | null = binder.getNode ? binder.getNode('GachaPullResult_hero_showcase') : null;
        const panel: Node | null = binder.getNode ? binder.getNode('GachaPullResult_panel') : null;
        const stage: Node | null = binder.getNode ? binder.getNode('GachaPullResult_stage') : null;
        if (!showcase || !panel || !stage) return;
        // 側邊位置取版面原位（原稿左側留白區）；對齊元件關掉，改由程式移動
        const widget = showcase.getComponent(Widget);
        if (widget) widget.enabled = false;
        const holder = showcase as Node & { __sideX?: number };
        holder.__sideX ??= showcase.position.x;
        const sideCenter = holder.__sideX;
        const place = (x: number): void => { showcase.setPosition(x, showcase.position.y, 0); };
        // 收起武將時結果面板置中並等比放大成滿版十連（使用者 11/13：要全螢幕滿版，不是小框）
        const panelWidget = panel.getComponent(Widget);
        panel.setScale(1, 1, 1);
        const centerPanel = (): void => {
            if (panelWidget) {
                panelWidget.isAlignHorizontalCenter = true; panelWidget.horizontalCenter = 0;
                panelWidget.isAlignVerticalCenter = true; panelWidget.verticalCenter = 0;
                panelWidget.updateAlignment();
            } else panel.setPosition(0, 0, 0);
            const scale = fullScreenPanelScale(stage.getComponent(UITransform), panel.getComponent(UITransform));
            panel.setScale(scale, scale, 1);
        };
        stage.off(Node.EventType.TOUCH_END);
        showcase.active = true; // 重轉後重新展示（上一輪可能已收起）
        if (!hasHero) { place(sideCenter); showcase.active = !hideAfterReveal; if (hideAfterReveal) centerPanel(); panel.active = true; return; }
        place(0);
        panel.active = false;
        stage.on(Node.EventType.TOUCH_END, () => {
            stage.off(Node.EventType.TOUCH_END);
            if (hideAfterReveal) { showcase.active = false; centerPanel(); }
            else place(sideCenter);
            panel.active = true;
        });
    }

    /**
     * 十張卡片各掛武將頭像（PROG-2-2247）：掛在卡片第一層底框裡，放在名稱上方；
     * 載完才顯示，換輪時先藏起來，不讓上一輪的頭像冒充。
     */
    private _updateCardPortraits(binder: any, cardIds: readonly string[], results: LocalGachaResultEntry[]): void {
        const seq = ++this._cardPortraitSeq;
        cardIds.forEach((id, index) => {
            const card: Node | null = binder.getNode ? binder.getNode(id) : null;
            const frameHost = card;
            const cardBox = card?.getComponent(UITransform);
            if (!card || !frameHost || !cardBox) return;
            let portraitNode = frameHost.getChildByName(CARD_PORTRAIT_NODE);
            if (!portraitNode) {
                portraitNode = new Node(CARD_PORTRAIT_NODE);
                portraitNode.layer = frameHost.layer;
                // 插在卡面底圖層之上、框線／角標／名牌之下
                const art = frameHost.getChildByName(`skinLayer_${id}_art`);
                frameHost.insertChild(portraitNode, art ? art.getSiblingIndex() + 1 : 0);
                portraitNode.addComponent(UITransform);
                portraitNode.addComponent(Sprite);
            }
            const sprite = portraitNode.getComponent(Sprite)!;
            sprite.enabled = false;
            const entry = results[index];
            if (!entry) return;
            bindAvatarTalk(portraitNode, entry.general.id);
            // 頭像填滿名牌以上的卡面（名牌 64px）：寬度扣掉外框，高度到名牌上緣；圖是方的，載入後置中裁成同比例，不拉伸
            const width = cardBox.width - 12;
            const height = cardBox.height - 64 - 6;
            portraitNode.getComponent(UITransform)!.setContentSize(width, height);
            portraitNode.setPosition(0, cardBox.height * 0.5 - height * 0.5 - 6, 0);
            void loadGeneralAvatar(entry.general.id).then((frame) => {
                if (seq !== this._cardPortraitSeq || !sprite.isValid || !frame) return;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.trim = false;
                // 裁切比例用節點的世界縮放算，父層非等比縮放時立繪才不會被壓扁
            const worldScale = portraitNode.getWorldScale();
            sprite.spriteFrame = cropFrameToAspect(frame, renderedBoxAspect(width, height, worldScale.x, worldScale.y));
                sprite.enabled = true;
            }).catch((error) => {
                UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] card portrait load failed', error);
            });
        });
    }

    private _updateHeroPortrait(binder: any, generalId: string): void {
        const portraitNode: Node | null = binder.getNode ? binder.getNode('GachaPullResult_hero_portrait') : null;
        if (!portraitNode) return;
        bindAvatarTalk(portraitNode, generalId);
        // 版面 objectFit 非 fill 時，圖畫在 <id>_ImageContent 子節點（已按 contain 置中）；換圖要換在那裡並重算大小，
        // 不能在外框另掛 Sprite，否則版面烘進去的示意立繪（關羽）會疊在後面（issue #2086）。
        const content = portraitNode.getChildByName(`${portraitNode.name}_ImageContent`);
        const sprite = (content ?? portraitNode).getComponent(Sprite) ?? (content ?? portraitNode).addComponent(Sprite);
        // 新立繪載完前先藏起來：不讓版面預設圖或上一位冒充這次的主角
        const seq = ++this._heroPortraitSeq;
        sprite.enabled = false;
        void loadGeneralPortrait(generalId).then((frame) => frame ?? loadGeneralAvatar(generalId)).then((frame) => {
            if (seq !== this._heroPortraitSeq || !sprite.isValid || !frame) return;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.trim = false;
            sprite.spriteFrame = frame;
            const box = portraitNode.getComponent(UITransform);
            const target = sprite.node.getComponent(UITransform);
            if (box && target) {
                const fit = fitContain(box.width, box.height, frame.originalSize.width, frame.originalSize.height);
                target.setContentSize(fit.width, fit.height);
            }
            sprite.enabled = true;
        }).catch((error) => {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] hero portrait load failed', error);
        });
    }

    private _emitError(error: unknown, fallbackMessage: string): void {
        const message = this._options.formatError
            ? this._options.formatError(error, fallbackMessage)
            : (error instanceof Error ? error.message : fallbackMessage);
        this._options.onShowError(message);
    }
}

