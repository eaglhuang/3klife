// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.8 啟動時綁定 adapter；PROG-2-9201、PROG-2-9203
/**
 * createLocalApi — 組裝單機的本機伺服器 adapter：掛上存檔命令、錢包命令與物品庫存命令。
 *
 * 錢包權威由場景在 LocalGachaService 建好後以 setWallet 綁定（命令處理器每次呼叫才取，所以可後綁、可換）。
 * 物品庫存的存放位置（家庭倉庫＝GameSession 的玩家庫存表）由 setItemAuthority 綁定；設定由 setItemConfig 換入。
 */
import { DEFAULT_ITEM_CONFIG, type ItemConfigV1 } from '../../../shared/item/ItemConfig';
import { registerItemCommands, type ItemAuthority } from './ItemCommands';
import { LocalApiAdapter, type LocalApiAdapterOptions } from './LocalApiAdapter';
import { registerSkillCommands, type SkillHost } from './SkillCommands';
import { registerSaveCommands, type LocalSaveStore } from './SaveCommands';
import { registerWalletCommands, type WalletAuthority } from './WalletCommands';

export interface LocalApiBundle {
    api: LocalApiAdapter;
    setWallet(wallet: WalletAuthority | null): void;
    /** 綁定技能宿主（單機＝GameSession）；命令處理器每次呼叫才取，可後綁、可換 */
    setSkillHost(host: SkillHost | null): void;
    setItemAuthority(authority: ItemAuthority | null): void;
    setItemConfig(config: ItemConfigV1): void;
}

export function createLocalApi(store: LocalSaveStore, opts: LocalApiAdapterOptions = {}): LocalApiBundle {
    const api = new LocalApiAdapter(opts);
    let wallet: WalletAuthority | null = null;
    let authority: ItemAuthority | null = null;
    let config: ItemConfigV1 = DEFAULT_ITEM_CONFIG;
    let skillHost: SkillHost | null = null;
    registerSaveCommands(api, store);
    registerWalletCommands(api, () => wallet);
    registerItemCommands(api, () => ({ authority, wallet, config }));
    registerSkillCommands(api, () => skillHost);
    return {
        api,
        setWallet: (next) => { wallet = next; },
        setItemAuthority: (next) => { authority = next; },
        setItemConfig: (next) => { config = next; },
        setSkillHost: (next) => { skillHost = next; },
    };
}
