// @spec-source → 見 docs/cross-reference-index.md
/**
 * SeasonHudController — 大廳季度 HUD（PROG-2-1633 自 LobbyScene 拆出）
 *
 * 顯示「第 N 年 M 季」、模式、季節效果與倒數圖示；推進按鈕交回宿主。
 * 事件訂閱與城池主視覺連動由宿主負責（afterRefresh）。
 */
import { formatModeLabel, type GameTimeState } from '../../core/systems/GameClock';
import { buildCountdownIconFlowView } from '../../core/systems/CountdownIconView';
import type { CountdownState } from '../../core/systems/CountdownManager';
import type { BreedTextLookup } from './BreedingTexts';
import { seasonDisplayText, seasonEffectHintText } from './SeasonTexts';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface SeasonHudDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    gameTime(): GameTimeState;
    countdown(): Readonly<CountdownState> | null;
    now(): number;
    lookup: BreedTextLookup;
    onAdvance(): void;
    /** 每次刷新後的連動（城池主視覺） */
    afterRefresh(): void;
}

export class SeasonHudController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;

    constructor(private readonly _deps: SeasonHudDeps<H>) {}

    public get host(): H | null {
        return this._host;
    }

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnAdvanceSeason', handler: () => this._deps.onAdvance() },
        ]);
        this.refresh();
    }

    public refresh(): void {
        const time = this._deps.gameTime();
        const lookup = this._deps.lookup;
        this._host?.binder?.setTexts({
            seasonLabel: seasonDisplayText(lookup, time),
            modeLabel: formatModeLabel(time.currentMode),
            seasonEffectLabel: seasonEffectHintText(lookup, time.currentSeason),
        });
        const countdownIcon = buildCountdownIconFlowView(this._deps.countdown(), this._deps.now());
        this._host?.binder?.setTexts(countdownIcon.texts);
        this._host?.binder?.setActives(countdownIcon.actives);
        this._deps.afterRefresh();
    }
}
