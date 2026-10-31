// @spec-source → 見 docs/cross-reference-index.md
/**
 * DeckSelectController — 大廳最小選卡（PROG-2-1633 自 LobbyScene 拆出）
 *
 * 固定 4 個卡位（lobby-deck-select-screen 的 btnDeckCard0..3），點卡加入／移出出戰卡組。
 * 卡組讀寫與事件訂閱由宿主注入。
 */
import { PLAYER_DECK_MAX_SIZE } from '../../core/services/PlayerDeckRules';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

/** 卡位數，對應 btnDeckCard0..3（目前卡片目錄只有 4 張） */
export const DECK_SELECT_SLOTS = 4;

export interface DeckCardSummary {
    id: string;
    name: string;
    sub: string;
}

export interface DeckSelectDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    deck(): readonly string[];
    cards(): DeckCardSummary[];
    /** 切換一張卡；回傳 'full' 表示卡組已滿 */
    toggle(cardId: string, catalogIds: readonly string[]): Promise<string>;
    toast(message: string, duration: number): void;
    warn(message: string, error: unknown): void;
}

export class DeckSelectController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;

    constructor(private readonly _deps: DeckSelectDeps<H>) {}

    public get host(): H | null {
        return this._host;
    }

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost(Array.from({ length: DECK_SELECT_SLOTS }, (_, slot) => ({
            buttonId: `btnDeckCard${slot}`,
            handler: () => { void this.clickCard(slot); },
        })));
        this.refresh();
    }

    public refresh(): void {
        const binder = this._host?.binder;
        if (!binder) return;
        const deck = this._deps.deck();
        const cards = this._deps.cards();
        const texts: Record<string, string> = {
            deckTitleLabel: `出戰卡組 ${deck.length}/${PLAYER_DECK_MAX_SIZE}`,
        };
        const actives: Record<string, boolean> = {};
        for (let slot = 0; slot < DECK_SELECT_SLOTS; slot++) {
            const card = cards[slot];
            texts[`deckCardLabel${slot}`] = card ? `${deck.includes(card.id) ? '✓' : '　'} ${card.name}（${card.sub}）` : '－';
            actives[`btnDeckCard${slot}`] = card !== undefined;
        }
        binder.setTexts(texts);
        binder.setActives(actives);
    }

    public async clickCard(slot: number): Promise<void> {
        const cards = this._deps.cards();
        const card = cards[slot];
        if (!card) return;
        try {
            const outcome = await this._deps.toggle(card.id, cards.map((entry) => entry.id));
            if (outcome === 'full') {
                this._deps.toast(`卡組已滿（上限 ${PLAYER_DECK_MAX_SIZE} 張）`, 1.8);
            }
        } catch (error) {
            this._deps.warn('[LobbyScene] 卡組存檔失敗', error);
            this._deps.toast('卡組存檔失敗，請稍後再試', 2);
        }
    }
}
