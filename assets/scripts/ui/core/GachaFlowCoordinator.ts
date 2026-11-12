// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-1429 依建檔紀錄補標出處
import { Button, Node, Sprite, UITransform, Widget } from 'cc';
import { disableCharCache } from './LabelCjkCache';
import { formatGachaLine, loadGachaLines } from './GachaLines';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { LocalGachaService, type LocalGachaResultEntry } from '../../core/services/LocalGachaService';
import { UIScreenPreviewHost } from '../components/UIScreenPreviewHost';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { showGachaHistory, showGachaResults } from '../dev/GachaDevOverlay';
import { pickGachaCurrency, quoteGachaCost } from '../../core/systems/GachaCurrency';
import { fitContain, pickTopGachaResult } from './GachaResultRanking';
import { loadGeneralAvatar, loadGeneralPortrait } from './GeneralAvatarLoader';

export const DEFAULT_POOL_ID = 'GENERAL_STANDARD_01';

export { GACHA_SCREEN_ID } from './GachaScreenNodes';
export const GACHA_PULL_RESULT_SCREEN_ID = 'gacha-pull-result';

/** 揭曉後武將立繪回到左側的水平位移（與版面 hCenter 一致） */
const HERO_SIDE_CENTER_X = -320;

/** 卡片頭像節點名（PROG-2-2247） */
const CARD_PORTRAIT_NODE = 'CardPortrait';

const GACHA_PULL_RESULT_CARD_NODE_MAP = [
    { rarityId: 'GachaPullResult_div_351', nameId: 'GachaPullResult_div_352' },
    { rarityId: 'GachaPullResult_div_357', nameId: 'GachaPullResult_div_358' },
    { rarityId: 'GachaPullResult_div_363', nameId: 'GachaPullResult_div_364' },
    { rarityId: 'GachaPullResult_div_369', nameId: 'GachaPullResult_div_370' },
    { rarityId: 'GachaPullResult_div_375', nameId: 'GachaPullResult_div_377' },
    { rarityId: 'GachaPullResult_div_381', nameId: 'GachaPullResult_div_382' },
    { rarityId: 'GachaPullResult_div_386', nameId: 'GachaPullResult_div_387' },
    { rarityId: 'GachaPullResult_div_391', nameId: 'GachaPullResult_div_392' },
    { rarityId: 'GachaPullResult_div_396', nameId: 'GachaPullResult_div_397' },
    { rarityId: 'GachaPullResult_div_402', nameId: 'GachaPullResult_div_403' },
] as const;

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
}

export class GachaFlowCoordinator {
    private _heroPortraitSeq = 0;
    private _cardPortraitSeq = 0;
    private readonly _options: GachaFlowCoordinatorOptions;
    private _resultBackAction: (() => void | Promise<void>) | null = null;
    private _resultRepullAction: (() => void | Promise<void>) | null = null;
    private _resultRepullPending = false;

    public constructor(options: GachaFlowCoordinatorOptions) {
        this._options = options;
    }

    public async showHistory(limit = 30): Promise<void> {
        try {
            const data = await this._options.gachaService.getRecentPullHistory(limit);
            showGachaHistory(data);
        } catch (error) {
            this._emitError(error, '讀取紀錄失敗');
        }
    }

    public async runGoldSummon(): Promise<void> {
        try {
            const results = await this._options.gachaService.performGoldSummon(
                1,
                this._options.getGenerals(),
                { factionFilter: this._options.factionFilter },
            );
            this._notifyPullSuccess(results);
            await this._presentLocalGachaResults(1, results, '金幣召喚', () => this.runGoldSummon(), 'gold');
        } catch (error) {
            this._emitError(error, '金幣召喚失敗');
        }
    }

    public async runTicketSummon(): Promise<void> {
        try {
            const results = await this._options.gachaService.performTicketSummon(
                1,
                this._options.getGenerals(),
                { factionFilter: this._options.factionFilter },
            );
            this._notifyPullSuccess(results);
            await this._presentLocalGachaResults(1, results, '召喚券', () => this.runTicketSummon(), 'tickets');
        } catch (error) {
            this._emitError(error, '召喚券失敗');
        }
    }

    /** 紅顏池召喚（PROG-2-1086）：扣 1 張召喚券抽 1 位女性武將，入名冊後可去結緣 */
    public async runBeautySummon(poolId: string, generals: GeneralConfig[], drawCount = 1): Promise<void> {
        try {
            if (generals.length === 0) throw new Error('紅顏池目前沒有可抽的武將');
            const results = await this._options.gachaService.performPoolTicketSummon(poolId, drawCount, generals);
            this._notifyPullSuccess(results);
            await this._presentLocalGachaResults(drawCount, results, drawCount === 10 ? '召喚券十連' : '召喚券', () => this.runBeautySummon(poolId, generals, drawCount), 'tickets');
        } catch (error) {
            this._emitError(error, '紅顏池召喚失敗');
        }
    }

    /**
     * 支援卡池召喚（PROG-2-1085）：扣支援券、抽支援卡目錄裡的武將；抽到的只變成教官卡，不入名冊。
     * generals 由呼叫端先篩成本池候選且有支援卡資料的武將。
     */
    public async runSupportSummon(poolId: string, generals: GeneralConfig[], drawCount = 1): Promise<void> {
        try {
            if (generals.length === 0) throw new Error('支援卡池目前沒有可抽的教官');
            const results = await this._options.gachaService.performSupportCardSummon(poolId, drawCount, generals);
            this._notifyPullSuccess(results);
            await this._presentLocalGachaResults(drawCount, results, drawCount === 10 ? '支援券十連' : '支援券', () => this.runSupportSummon(poolId, generals, drawCount), 'mentorTickets');
        } catch (error) {
            this._emitError(error, '支援卡召喚失敗');
        }
    }

    public async runLocalGacha(drawCount: number): Promise<void> {
        const resolvedCount = Math.max(1, Math.floor(Number.isFinite(drawCount) ? drawCount : 1));
        const poolId = this._options.poolId ?? DEFAULT_POOL_ID;
        const service = this._options.gachaService;

        try {
            // 規格單抽 150、十連 1500，常設池先扣銅錢符；預覽場景有指定 gemsCostPerPull 時沿用舊的靈玉單價
            const fixed = this._options.gemsCostPerPull;
            const pick = fixed !== undefined
                ? { coin: 'gems' as const, cost: resolvedCount * fixed }
                : pickGachaCurrency('HERO', resolvedCount, { gems: service.getCurrencyAmount('gems'), bronze: service.getCurrencyAmount('bronze') });
            if (!pick) {
                throw new Error(`靈玉或銅錢符不足，需要 ${quoteGachaCost(resolvedCount)}`);
            }
            const results = await service.performLocalGacha(
                poolId,
                resolvedCount,
                pick.cost,
                this._options.getGenerals(),
                { factionFilter: this._options.factionFilter },
                pick.coin,
            );
            this._notifyPullSuccess(results);
            await this._presentLocalGachaResults(resolvedCount, results);
        } catch (error) {
            this._emitError(error, '單機轉蛋失敗');
        }
    }

    private async _presentLocalGachaResults(
        drawCount: number, results: LocalGachaResultEntry[],
        title = drawCount === 1 ? '單抽' : '十連抽',
        retry?: () => Promise<void>, currency: 'gems' | 'gold' | 'tickets' | 'mentorTickets' = 'gems',
    ): Promise<void> {
        const host = this._options.getHost();
        const repull = retry ?? (drawCount === 10 && this._options.onRepullTen
            ? this._options.onRepullTen : () => this.runLocalGacha(drawCount));
        if (!host) {
            await showGachaResults(title, results, () => { void repull(); });
            return;
        }
        await this._renderPullResult(host, drawCount, results, title, currency, {
            hero: pickTopGachaResult(results),
            onBack: this._options.onBackToGacha,
            repull,
        });
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
        await this._renderPullResult(host, results.length, results, '宿命轉蛋', 'gems', {
            hero, onBack: pool.onConfirm, repull: pool.onReroll,
            labels: {
                header: `宿命轉蛋 · 十連全收${pool.resets > 0 ? `（已重轉 ${pool.resets} 次）` : ''}`,
                heroSub: '宿命名將',
                // 有訊息先顯示訊息；否則用台詞表，台詞表沒有才用池內引言
                heroDesc: pool.message,
                heroDescFallback: pool.quote ? `「${pool.quote}」` : '',
                back: '確定 · 全部收下',
                repull: '免費重轉',
            },
        });
    }

    private async _renderPullResult(
        host: UIScreenPreviewHost, drawCount: number, results: LocalGachaResultEntry[], title: string,
        currency: 'gems' | 'gold' | 'tickets' | 'mentorTickets',
        flow: {
            hero: LocalGachaResultEntry | undefined; onBack: () => void | Promise<void>; repull: (() => void | Promise<void>) | null;
            /** 池別文案（宿命池等）；沒給時用一般轉蛋文案 */
            labels?: { header: string; heroSub: string; heroDesc: string; heroDescFallback?: string; back: string; repull: string };
        },
    ): Promise<void> {
        const topResult = flow.hero;
        const repull = flow.repull;
        const summary = results
            .slice(0, 5)
            .map((entry) => `${this._toPullResultRarityLabel(entry.rarityTier)} ${entry.general.name}`)
            .join(' / ');
        const wallet = this._options.gachaService.getWalletSnapshot();
        const cardTexts: Record<string, string> = {};

        for (let index = 0; index < GACHA_PULL_RESULT_CARD_NODE_MAP.length; index += 1) {
            const nodeMap = GACHA_PULL_RESULT_CARD_NODE_MAP[index];
            const entry = results[index];
            cardTexts[nodeMap.rarityId] = entry ? this._toPullResultRarityLabel(entry.rarityTier) : '-';
            cardTexts[nodeMap.nameId] = entry ? entry.general.name : '未召喚';
        }

        const rarityStats = this._buildPullResultRarityStats(results);
        // 本次主角登場台詞（PROG-2-2244）：所有池共用；沒有台詞退回原本描述
        const heroLine = topResult ? formatGachaLine(await loadGachaLines(), topResult.general.id) : null;

        try { await host.showScreen(GACHA_PULL_RESULT_SCREEN_ID); }
        catch { throw new Error('召喚已完成並入冊，但結果畫面載入失敗。'); }
        const binder = host.binder;
        if (!binder) {
            throw new Error('召喚已完成並入冊，但結果畫面 binder 缺失。');
        }

        const cards = ['347', '353', '359', '365', '371', '378', '383', '388', '393', '398'];
        const cardActives: Record<string, boolean> = {};
        cards.forEach((id, index) => { cardActives[`GachaPullResult_div_${id}`] = index < results.length; });
        cardActives.GachaPullResult_div_413 = repull !== null;
        binder.setActives(cardActives);

        const opening = repull === null;
        const labels = flow.labels;
        binder.setTexts({
            ...cardTexts,
            GachaPullResult_div_42: opening ? `${title} · ${drawCount === 10 ? '十連抽' : '結果'}` : drawCount === 10 ? this._options.tenPullHeaderText ?? '本地轉蛋結果 · 十連抽' : `${title}結果`,
            GachaPullResult_div_195: topResult ? topResult.general.name : '本次召喚結果',
            GachaPullResult_div_196: topResult
                ? `${this._toPullResultRarityLabel(topResult.rarityTier)} · ${opening ? '宿命核心' : '本次最高稀有'}`
                : '召喚完成',
            GachaPullResult_div_139: summary || '本次召喚已完成。',
            GachaPullResult_div_203: `${results.length} / ${drawCount}`,
            GachaPullResult_div_343: `✦ ${title}結果 (${results.length}/${drawCount})${topResult ? ` · 最高 ${this._toPullResultRarityLabel(topResult.rarityTier)} ${topResult.general.name}` : ''}`,
            GachaPullResult_div_202: opening ? '進入大廳 ›' : '返回轉蛋 ›',
            GachaPullResult_div_173: drawCount === 10 ? '再抽十連' : `再${title}一次`,
            GachaPullResult_div_412: opening ? '進入大廳' : '返回卡池',
            GachaPullResult_div_413: drawCount === 10 ? '再抽十連' : `再${title}一次`,
            GachaPullResult_div_186: `${currency === 'gold' ? '金幣' : currency === 'tickets' ? '召喚券' : currency === 'mentorTickets' ? '支援券' : '玉'} ${wallet[currency].toLocaleString('zh-TW')}`,
            GachaPullResult_span_13: `SSR+ ×${rarityStats.high}`,
            GachaPullResult_span_14: `SR ×${rarityStats.mid}`,
            GachaPullResult_span_15: `R/N ×${rarityStats.low}`,
            GachaPullResult_hero_rarity: topResult ? `✦ ${this._toPullResultRarityLabel(topResult.rarityTier)} · 絕世登場 ✦` : '✦ 絕世名將 ✦',
            GachaPullResult_hero_name: topResult ? `${topResult.general.name}${topResult.general.courtesyName ? ` · ${topResult.general.courtesyName}` : ''}` : '絕世名將',
            GachaPullResult_hero_desc: heroLine ?? (topResult ? (topResult.general.description || '義薄雲天 · 威震華夏 · 萬世流芳') : '名揚四海 · 天下歸心'),
            ...(labels ? {
                GachaPullResult_div_42: labels.header,
                GachaPullResult_div_196: topResult ? `${this._toPullResultRarityLabel(topResult.rarityTier)} · ${labels.heroSub}` : labels.heroSub,
                GachaPullResult_hero_desc: labels.heroDesc || heroLine || labels.heroDescFallback || '',
                GachaPullResult_div_202: `${labels.back} ›`,
                GachaPullResult_div_412: labels.back,
                GachaPullResult_div_173: labels.repull,
                GachaPullResult_div_413: labels.repull,
            } : {}),
        });

        // 逐字快取（CHAR）配英文 TTF 時中文畫不出來，換字後也會疊字；結果畫面整片改不快取
        disableCharCache(host.node);
        this._updateCardPortraits(binder, cards, results);

        if (topResult) {
            this._updateHeroPortrait(binder, topResult.general.id);
        }
        this._stageHeroReveal(binder, topResult !== null);

        this._resultBackAction = flow.onBack;
        this._resultRepullAction = repull;

        const backNode = binder.getNode('GachaPullResult_div_412');
        if (backNode) {
            backNode.getComponent(Button) ?? backNode.addComponent(Button);
            backNode.off(Button.EventType.CLICK, this._onResultBack, this);
            backNode.on(Button.EventType.CLICK, this._onResultBack, this);
        }

        const closeNode = binder.getNode('GachaPullResult_div_344');
        if (closeNode) {
            closeNode.getComponent(Button) ?? closeNode.addComponent(Button);
            closeNode.off(Button.EventType.CLICK, this._onResultBack, this);
            closeNode.on(Button.EventType.CLICK, this._onResultBack, this);
        }

        const repullNode = repull ? binder.getNode('GachaPullResult_div_413') : null;
        if (repullNode) {
            repullNode.getComponent(Button) ?? repullNode.addComponent(Button);
            repullNode.off(Button.EventType.CLICK, this._onResultRepullTen, this);
            repullNode.on(Button.EventType.CLICK, this._onResultRepullTen, this);
        }
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

    private _toPullResultRarityLabel(rarityTier: string | null | undefined): string {
        switch ((rarityTier || '').toLowerCase()) {
            case 'mythic': return 'UR';
            case 'legendary': return 'SSR';
            case 'epic': return 'SR';
            case 'rare': return 'R';
            case 'common': return 'N';
            default: return (rarityTier || 'R').toUpperCase();
        }
    }

    private _buildPullResultRarityStats(results: LocalGachaResultEntry[]): { high: number; mid: number; low: number } {
        let high = 0;
        let mid = 0;
        let low = 0;

        for (const entry of results) {
            const rarity = this._toPullResultRarityLabel(entry.rarityTier);
            if (rarity === 'SSR' || rarity === 'UR' || rarity === 'LR') {
                high += 1;
            } else if (rarity === 'SR') {
                mid += 1;
            } else {
                low += 1;
            }
        }

        return { high, mid, low };
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
    private _stageHeroReveal(binder: any, hasHero: boolean): void {
        const showcase: Node | null = binder.getNode ? binder.getNode('GachaPullResult_hero_showcase') : null;
        const panel: Node | null = binder.getNode ? binder.getNode('GachaPullResult_div_341') : null;
        const stage: Node | null = binder.getNode ? binder.getNode('GachaPullResult_div_264') : null;
        if (!showcase || !panel || !stage) return;
        const widget = showcase.getComponent(Widget);
        const sideCenter = HERO_SIDE_CENTER_X;
        const place = (x: number): void => {
            if (widget) { widget.horizontalCenter = x; widget.updateAlignment(); }
            else showcase.setPosition(x, showcase.position.y, 0);
        };
        stage.off(Node.EventType.TOUCH_END);
        if (!hasHero) { place(sideCenter); panel.active = true; return; }
        place(0);
        panel.active = false;
        stage.on(Node.EventType.TOUCH_END, () => {
            stage.off(Node.EventType.TOUCH_END);
            place(sideCenter);
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
            const card: Node | null = binder.getNode ? binder.getNode(`GachaPullResult_div_${id}`) : null;
            const frameHost = card?.children[0];
            const cardBox = card?.getComponent(UITransform);
            if (!card || !frameHost || !cardBox) return;
            let portraitNode = frameHost.getChildByName(CARD_PORTRAIT_NODE);
            if (!portraitNode) {
                portraitNode = new Node(CARD_PORTRAIT_NODE);
                portraitNode.layer = frameHost.layer;
                portraitNode.parent = frameHost;
                portraitNode.addComponent(UITransform);
                portraitNode.addComponent(Sprite);
            }
            const sprite = portraitNode.getComponent(Sprite)!;
            sprite.enabled = false;
            const entry = results[index];
            if (!entry) return;
            // 頭像占卡寬 86%，置於卡片上半部，下方留給名稱
            const size = Math.round(cardBox.width * 0.86);
            portraitNode.getComponent(UITransform)!.setContentSize(size, size);
            portraitNode.setPosition(0, cardBox.height * 0.5 - size * 0.5 - cardBox.height * 0.12, 0);
            void loadGeneralAvatar(entry.general.id).then((frame) => {
                if (seq !== this._cardPortraitSeq || !sprite.isValid || !frame) return;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.trim = false;
                sprite.spriteFrame = frame;
                sprite.enabled = true;
            }).catch((error) => {
                UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] card portrait load failed', error);
            });
        });
    }

    private _updateHeroPortrait(binder: any, generalId: string): void {
        const portraitNode: Node | null = binder.getNode ? binder.getNode('GachaPullResult_hero_portrait') : null;
        if (!portraitNode) return;
        // 版面 objectFit 非 fill 時，圖畫在 <id>_ImageContent 子節點（已按 contain 置中）；換圖要換在那裡並重算大小，
        // 不能在外框另掛 Sprite，否則版面烘進去的示意立繪（關羽）會疊在後面（issue #2086）。
        const content = portraitNode.getChildByName(`${portraitNode.name}_ImageContent`);
        const sprite = (content ?? portraitNode).getComponent(Sprite) ?? (content ?? portraitNode).addComponent(Sprite);
        // 新立繪載完前先藏起來：不讓版面預設圖或上一位冒充這次的主角
        const seq = ++this._heroPortraitSeq;
        sprite.enabled = false;
        void loadGeneralPortrait(generalId).then((frame) => {
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

