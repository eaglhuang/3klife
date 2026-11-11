// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-2237（各池共用轉蛋畫面：切池同時換橫幅、右側內容與附加區塊）
/**
 * 轉蛋畫面切池（純流程，不依賴 cc）。
 *
 * 一次切池做完：橫幅 → 右側內容片段 → 該池在橫幅區的內容（延遲載入的區塊）→ 池的附加區塊 → 文字。
 * 文字放最後，因為區塊與片段是延遲載入，載入前節點還不存在。
 * 連點時只讓最後一次生效，前面還在載入的那次不再寫字、不再通知。
 *
 * Unity 對照：TabController.Select(index)，內容區換 SubView prefab 後再交給 Presenter 填資料。
 */
import { GACHA_CONTENT_SLOT, GACHA_POOLS, GachaPoolDef, gachaPoolBannerTexts, gachaPullBarTexts } from './GachaScreenNodes';

export interface GachaPoolHostPort {
    setActives(actives: Record<string, boolean>): void;
    setTexts(texts: Record<string, string>): void;
    switchLazySlot(slotId: string, fragmentId: string): Promise<boolean>;
    applyTabRegionsForFragment(fragmentId: string): Promise<void>;
    mountSection(anchor: string, fragmentId: string, replaceContent: boolean): Promise<unknown>;
}

export class GachaPoolSwitcher {
    private _index = 0;
    private _seq = 0;

    constructor(
        private readonly _port: GachaPoolHostPort,
        private readonly _pools: readonly GachaPoolDef[] = GACHA_POOLS,
        /** 切池完成（內容都載好）後呼叫，供畫面填該池的動態資料 */
        private readonly _onShown?: (pool: GachaPoolDef, index: number) => void,
    ) {}

    public get index(): number {
        return this._index;
    }

    public get pool(): GachaPoolDef {
        return this._pools[this._index];
    }

    public step(delta: number): Promise<void> {
        const count = this._pools.length;
        return this.show((((this._index + delta) % count) + count) % count);
    }

    public async show(index: number): Promise<void> {
        if (index < 0 || index >= this._pools.length) return;
        this._index = index;
        const seq = ++this._seq;
        const pool = this._pools[index];
        const actives: Record<string, boolean> = {};
        for (const each of this._pools) actives[each.banner] = each === pool;
        this._port.setActives(actives);

        await this._port.switchLazySlot(GACHA_CONTENT_SLOT, pool.contentFragment);
        if (seq !== this._seq) return;
        await this._port.applyTabRegionsForFragment(pool.contentFragment);
        if (seq !== this._seq) return;
        if (pool.section) {
            await this._port.mountSection(pool.section.anchor, pool.section.fragment, pool.section.replaceContent);
            if (seq !== this._seq) return;
        }
        this._port.setTexts({ ...gachaPullBarTexts(), ...gachaPoolBannerTexts(pool) });
        this._onShown?.(pool, index);
    }
}
