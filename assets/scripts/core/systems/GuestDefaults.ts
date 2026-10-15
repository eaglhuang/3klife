// 未登入（訪客）預設內容（OPEN-14 / 新手開場 17.4）。
// PM 裁定（暫定）：訪客預設 = 沿用新存檔的起始狀態。本檔只組合既有起始值，不另定數字。
// 純 TS，不依賴 cc；每次呼叫回傳新副本，呼叫端改動不會回寫到常數。

import { STARTER_INVENTORY } from './PlayerInventory';
import { INITIAL_HERO_IDS } from './InitialHeroTable';
import { createInitialGameTimeState, GameTimeState } from './GameClock';
import { STARTER_GACHA_WALLET, WalletCurrencyKey } from '../services/GachaWalletRules';

export interface GuestDefaults {
    inventory: Record<string, number>;
    wallet: Record<WalletCurrencyKey, number>;
    initialHeroIds: string[];
    gameTime: GameTimeState;
}

export function createGuestDefaults(): GuestDefaults {
    return {
        inventory: { ...STARTER_INVENTORY },
        wallet: { ...STARTER_GACHA_WALLET },
        initialHeroIds: [...INITIAL_HERO_IDS],
        gameTime: createInitialGameTimeState(),
    };
}
