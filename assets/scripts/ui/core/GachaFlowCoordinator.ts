import { Node } from 'cc';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { LocalGachaService, type LocalGachaResultEntry } from '../../core/services/LocalGachaService';
import { UIScreenPreviewHost } from '../components/UIScreenPreviewHost';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { showGachaHistory, showGachaResults } from '../dev/GachaDevOverlay';

const DEFAULT_GEMS_COST_PER_PULL = 100;
const DEFAULT_POOL_ID = 'GENERAL_STANDARD_01';

export const GACHA_SCREEN_ID = 'gacha-ds3';
export const GACHA_PULL_RESULT_SCREEN_ID = 'gacha-pull-result';

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
    private readonly _options: GachaFlowCoordinatorOptions;
    private _resultBackAction: (() => void | Promise<void>) | null = null;
    private _resultRepullAction: (() => void | Promise<void>) | null = null;

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
            showGachaResults('金幣召喚', results, () => { void this.runGoldSummon(); });
            this._notifyPullSuccess(results);
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
            showGachaResults('召喚券', results, () => { void this.runTicketSummon(); });
            this._notifyPullSuccess(results);
        } catch (error) {
            this._emitError(error, '召喚券失敗');
        }
    }

    public async runLocalGacha(drawCount: number): Promise<void> {
        const resolvedCount = Math.max(1, Math.floor(Number.isFinite(drawCount) ? drawCount : 1));
        const poolId = this._options.poolId ?? DEFAULT_POOL_ID;
        const gemsCostPerPull = this._options.gemsCostPerPull ?? DEFAULT_GEMS_COST_PER_PULL;
        const cost = resolvedCount * gemsCostPerPull;

        try {
            const results = await this._options.gachaService.performLocalGacha(
                poolId,
                resolvedCount,
                cost,
                this._options.getGenerals(),
                { factionFilter: this._options.factionFilter },
            );
            await this._presentLocalGachaResults(resolvedCount, results);
            this._notifyPullSuccess(results);
        } catch (error) {
            this._emitError(error, '單機轉蛋失敗');
        }
    }

    private async _presentLocalGachaResults(drawCount: number, results: LocalGachaResultEntry[]): Promise<void> {
        const host = this._options.getHost();
        if (drawCount !== 10 || !host) {
            showGachaResults(drawCount === 1 ? '單抽' : '十連抽', results, () => {
                void this.runLocalGacha(drawCount);
            });
            return;
        }

        const topResult = results[0];
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

        await host.showScreen(GACHA_PULL_RESULT_SCREEN_ID);
        const binder = host.binder;
        if (!binder) {
            return;
        }

        binder.setTexts({
            ...cardTexts,
            GachaPullResult_div_42: this._options.tenPullHeaderText ?? '本地轉蛋結果 · 十連抽',
            GachaPullResult_div_195: topResult ? topResult.general.name : '本次召喚結果',
            GachaPullResult_div_196: topResult
                ? `${this._toPullResultRarityLabel(topResult.rarityTier)} · 本次最高稀有`
                : '十連抽完成',
            GachaPullResult_div_139: summary || '本次十連抽已完成。',
            GachaPullResult_div_203: `${results.length} / ${drawCount}`,
            GachaPullResult_div_343: `✦ 召喚結果 · 十連 (${results.length}/${drawCount})`,
            GachaPullResult_div_202: '返回轉蛋 ›',
            GachaPullResult_div_173: '再抽十連',
            GachaPullResult_div_186: wallet.gems.toLocaleString('zh-TW'),
            GachaPullResult_span_13: `SSR+ ×${rarityStats.high}`,
            GachaPullResult_span_14: `SR ×${rarityStats.mid}`,
            GachaPullResult_span_15: `R/N ×${rarityStats.low}`,
        });

        this._resultBackAction = this._options.onBackToGacha;
        this._resultRepullAction = this._options.onRepullTen ?? (() => this.runLocalGacha(10));

        const backNode = binder.getNode('GachaPullResult_div_202');
        if (backNode) {
            backNode.off(Node.EventType.TOUCH_END, this._onResultBack, this);
            backNode.on(Node.EventType.TOUCH_END, this._onResultBack, this);
        }

        const repullNode = binder.getNode('GachaPullResult_div_173');
        if (repullNode) {
            repullNode.off(Node.EventType.TOUCH_END, this._onResultRepullTen, this);
            repullNode.on(Node.EventType.TOUCH_END, this._onResultRepullTen, this);
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
        if (!action) {
            return;
        }

        Promise.resolve(action()).catch((error) => {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] back action failed', error);
        });
    }

    private _onResultRepullTen(): void {
        const action = this._resultRepullAction;
        if (!action) {
            return;
        }

        Promise.resolve(action()).catch((error) => {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[GachaFlowCoordinator] repull action failed', error);
        });
    }

    private _emitError(error: unknown, fallbackMessage: string): void {
        const message = this._options.formatError
            ? this._options.formatError(error, fallbackMessage)
            : (error instanceof Error ? error.message : fallbackMessage);
        this._options.onShowError(message);
    }
}