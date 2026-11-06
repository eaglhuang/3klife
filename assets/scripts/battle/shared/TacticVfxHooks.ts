// @spec-source → 戰法系統 §H 美術特效配合（SSR/UR 閃現、火計格子 VFX、水計流向、資源目錄）與 §H-3 戰場掠奪（金色飄字）（PROG-2-1303，TAC-16）
/**
 * TacticVfxHooks — 戰法特效與掠奪飄字的程式掛點（純邏輯，不依賴 cc）
 *
 * 只決定「該播哪些特效、特效檔路徑是什麼、要飄哪些字」，實際播放由畫面層處理。
 * 戰法資料目前沒有 element、lootTrigger 等欄位，由呼叫端傳入；ID 命名與資源檔仍待企劃定案（暫定）。
 *
 * Unity 對照：像在技能執行前後呼叫一個 EventDispatcher，回傳要 Spawn 的 Prefab 清單，
 * 實際 Instantiate 與動畫交給 View。
 */
import { RULED_EXTRA_TALLIES, TIGER_TALLY_SPEC_TACTICS, type TigerTallySpecTactic } from '../../core/config/TigerTallySpecTactics';
import type { TacticFlashTiming, TacticFlashView } from '../../shared/interfaces/IBattleUIComponents';
import type { SalvageLootSource } from './StageSalvage';

export const FLASH_QUALITIES: readonly string[] = Object.freeze(['SSR', 'UR']);
export const TACTIC_FX_ROOT = 'assets/fx/tactics/';
export const LOOT_TEXT_COLOR = 'gold';

export type TacticElement = 'fire' | 'water';

export type TacticVfxHook =
    | { kind: 'flash'; tacticId: string }
    | { kind: 'grid-fire'; tacticId: string }
    | { kind: 'grid-water-ripple'; tacticId: string; flowDirection: 'right' };

export interface TacticVfxInput {
    tacticId: string;
    /** 品質標籤，如 SSR、UR；其他值不閃現 */
    quality: string;
    /** 元素屬性，目前只有火與水；未知或缺值不掛格子特效 */
    element?: TacticElement | null;
}

/** 特效掛點：依品質與元素回傳要播的 hook，順序固定為閃現、格子特效。 */
export function tacticVfxHooks(input: TacticVfxInput): TacticVfxHook[] {
    const hooks: TacticVfxHook[] = [];
    if (FLASH_QUALITIES.includes(input.quality)) {
        hooks.push({ kind: 'flash', tacticId: input.tacticId });
    }
    if (input.element === 'fire') {
        hooks.push({ kind: 'grid-fire', tacticId: input.tacticId });
    } else if (input.element === 'water') {
        hooks.push({ kind: 'grid-water-ripple', tacticId: input.tacticId, flowDirection: 'right' });
    }
    return hooks;
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

/**
 * 戰法特效 Prefab 路徑：assets/fx/tactics/<id>.prefab。
 * ID 不合規（大寫、空白、路徑符號）時回傳 null，避免組出錯誤路徑。
 */
export function tacticFxPath(tacticId: string): string | null {
    if (!SAFE_ID.test(tacticId)) return null;
    return `${TACTIC_FX_ROOT}${tacticId}.prefab`;
}

export interface LootEvent {
    tacticId: string;
    /** 是否為掠奪型戰法（峽谷落石、火燒敵營等），由資料提供 */
    lootTrigger: boolean;
    /** 敵方被擊破或佔領時才飄字 */
    outcome: 'destroyed' | 'captured' | 'survived';
    resources: readonly { name: string; amount: number }[];
}

export interface LootFloatingText {
    tacticId: string;
    text: string;
    color: string;
}

/**
 * 落石擊破、火燒掠奪與佔領水門的飄字（PROG-2-1852、PROG-2-1863）：落石算擊破，火燒格與水門算佔領，都是掠奪型。
 */
export function salvageLootTexts(source: SalvageLootSource, resources: readonly { name: string; amount: number }[]): LootFloatingText[] {
    return lootFloatingTexts([{
        tacticId: source,
        lootTrigger: true,
        outcome: source === 'rock-slide' ? 'destroyed' : 'captured',
        resources,
    }]);
}

/** 掠奪飄字：只有掠奪型戰法且結果為擊破或佔領時才產生；每項資源一行。 */
export function lootFloatingTexts(events: readonly LootEvent[]): LootFloatingText[] {
    const texts: LootFloatingText[] = [];
    for (const event of events) {
        if (!event.lootTrigger) continue;
        if (event.outcome === 'survived') continue;
        for (const resource of event.resources) {
            if (resource.amount <= 0) continue;
            texts.push({ tacticId: event.tacticId, text: `+${resource.name} ${resource.amount}`, color: LOOT_TEXT_COLOR });
        }
    }
    return texts;
}

/** 英靈閃現時序（PROG-2-1861；秒，暫定）：總長約 1.3 秒，不擋操作 */
export const TACTIC_FLASH_TIMING: TacticFlashTiming = { slideIn: 0.2, hold: 0.8, fadeOut: 0.3 };

const QUALITY_RANK: Readonly<Record<string, number>> = { R: 1, SR: 2, SSR: 3, UR: 4 };

/** 戰法 id 對到虎符表（含裁定追加的虎符）；同一招有多張虎符時取品質最高的那張 */
export function tallyTacticOf(battleSkillId: string): TigerTallySpecTactic | null {
    let best: TigerTallySpecTactic | null = null;
    for (const row of [...TIGER_TALLY_SPEC_TACTICS, ...RULED_EXTRA_TALLIES]) {
        if (row.battleSkillId !== battleSkillId) continue;
        if (!best || (QUALITY_RANK[row.quality] ?? 0) > (QUALITY_RANK[best.quality] ?? 0)) best = row;
    }
    return best;
}

/**
 * 戰法施放時的英靈閃現（戰法系統 §H-2，PROG-2-1861）：只有虎符表品質為 SSR／UR 的戰法才閃現；
 * 顯示施放方主將的半身立繪與虎符名。查不到品質的戰法（種子戰法、奧義等）不閃現。
 */
export function tacticFlashOf(battleSkillId: string, side: TacticFlashView['side']): TacticFlashView | null {
    const row = tallyTacticOf(battleSkillId);
    if (!row) return null;
    const flash = tacticVfxHooks({ tacticId: row.tacticId, quality: row.quality }).some((hook) => hook.kind === 'flash');
    return flash ? { side, quality: row.quality, caption: row.tallyName } : null;
}
