// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.8 啟動時綁定 adapter；PROG-2-9201
/**
 * createLocalApi — 組裝單機的本機伺服器 adapter：掛上存檔命令與錢包命令。
 *
 * 錢包權威由場景在 LocalGachaService 建好後以 setWallet 綁定（命令處理器每次呼叫才取，所以可後綁、可換）。
 */
import { LocalApiAdapter, type LocalApiAdapterOptions } from './LocalApiAdapter';
import { registerSaveCommands, type LocalSaveStore } from './SaveCommands';
import { registerWalletCommands, type WalletAuthority } from './WalletCommands';

export interface LocalApiBundle {
    api: LocalApiAdapter;
    setWallet(wallet: WalletAuthority | null): void;
}

export function createLocalApi(store: LocalSaveStore, opts: LocalApiAdapterOptions = {}): LocalApiBundle {
    const api = new LocalApiAdapter(opts);
    let wallet: WalletAuthority | null = null;
    registerSaveCommands(api, store);
    registerWalletCommands(api, () => wallet);
    return { api, setWallet: (next) => { wallet = next; } };
}
