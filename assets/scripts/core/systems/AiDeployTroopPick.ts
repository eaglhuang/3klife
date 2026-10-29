// @spec-source → AI武將強度系統.md (doc_data_0002) E-3 部署傾向、E-4「部署決策」AI_Deploy（PROG-2-1468）
/**
 * AiDeployTroopPick — AI 每支部署要出哪個兵種（純邏輯，不依賴 cc）
 *
 * 規格偽碼：
 * - IQ ≥ NORMAL：分析玩家場上兵種，有剋制兵種就出剋制兵種。
 * - 否則依 Profile 偏好兵種隨機挑（filterByProfile → pickRandom）。
 *
 * 暫定（可逆）：
 * - 低 IQ 不剋制；其他 IQ 沿用既有 35% 機率剋制，只有 preferCounter 的 Profile（STRATEGIC）必定剋制。
 * - 未套難度表（iq 為 null）與沒有 Profile 時沿用既有行為（35% 剋制、全兵種隨機）。
 * - 偏好兵種都買不起或 Profile 沒列偏好時，從買得起的全兵種隨機。
 *
 * Unity 對照：像 Spawner 的兵種挑選器，先問「要不要針對玩家」，不針對就從自己的偏好清單抽。
 */
import { BattleTactic, TroopType } from '../../shared/CommonEnums';
import type { AiIqLevel } from './AiDifficultyTable';
import type { AiTroopCode } from './AiProfiles';

export interface AiDeployPreference {
    preferredTroops: readonly AiTroopCode[];
    preferCounter: boolean;
}

/** AI 兵種代碼 → 戰場兵種；不在 AI 可部署範圍的代碼（SIEGE、NAVY）不列 */
export const AI_TROOP_CODE_TO_TYPE: Partial<Record<AiTroopCode, TroopType>> = {
    CAVALRY: TroopType.Cavalry,
    INFANTRY: TroopType.Infantry,
    SHIELD: TroopType.Shield,
    PIKE: TroopType.Pikeman,
    ARCHER: TroopType.Archer,
};

export interface AiDeployTroopInput {
    iq: AiIqLevel | null;
    /** 這支買得起的兵種（依呼叫端順序） */
    affordable: readonly TroopType[];
    /** 玩家場上最多的兵種；沒有玩家單位時為 null */
    playerMostCommon: TroopType | null;
    /** counter → 被剋兵種（TROOP_COUNTER_MAP） */
    counterMap: Readonly<Partial<Record<TroopType, TroopType>>>;
    preference: AiDeployPreference | null;
    counterChance: number;
    random: () => number;
}

function pickRandom(list: readonly TroopType[], random: () => number): TroopType {
    return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

export function pickAiDeployTroop(input: AiDeployTroopInput): TroopType | null {
    const { affordable, random } = input;
    if (affordable.length === 0) return null;

    if (input.iq !== 'LOW' && input.playerMostCommon) {
        const tryCounter = input.preference?.preferCounter === true || random() < input.counterChance;
        if (tryCounter) {
            const counter = affordable.find(type => input.counterMap[type] === input.playerMostCommon);
            if (counter) return counter;
        }
    }

    const preferredTypes = (input.preference?.preferredTroops ?? [])
        .map(code => AI_TROOP_CODE_TO_TYPE[code])
        .filter((type): type is TroopType => type !== undefined);
    const preferred = affordable.filter(type => preferredTypes.includes(type));
    return pickRandom(preferred.length > 0 ? preferred : affordable, random);
}

/**
 * 場景部署偏好（戰場部署系統 Tile-State preset 權威表「對部署的直接影響」，PROG-2-1605，兵種對應暫定）。
 * 敵將沒有 Profile 部署偏好時才套用；剋制判定照舊優先。
 */
export const SCENE_DEPLOY_PREFERENCE: Readonly<Partial<Record<BattleTactic, AiDeployPreference>>> = {
    // 森林埋伏：優先機動與伏擊單位，不鼓勵早交遠程
    [BattleTactic.AmbushAttack]: { preferredTroops: ['CAVALRY', 'INFANTRY'], preferCounter: false },
    // 夜襲：保留高爆發兵給營帳與主將擊殺窗口
    [BattleTactic.NightRaid]: { preferredTroops: ['CAVALRY', 'PIKE'], preferCounter: false },
    // 峽谷落石：耐打前排與擊退單位
    [BattleTactic.RockSlide]: { preferredTroops: ['SHIELD', 'PIKE'], preferCounter: false },
    // 水淹七軍：減少低適性騎兵投入
    [BattleTactic.FloodAttack]: { preferredTroops: ['INFANTRY', 'SHIELD', 'ARCHER'], preferCounter: false },
    // 火燒偷襲：高機動單位，避免低韌性精銳一次壓上
    [BattleTactic.FireAttack]: { preferredTroops: ['CAVALRY', 'ARCHER'], preferCounter: false },
};

/** 敵將 Profile 偏好優先；沒有時用場景偏好；都沒有回 null */
export function resolveAiDeployPreference(profile: AiDeployPreference | null | undefined, battleTactic: BattleTactic | null | undefined): AiDeployPreference | null {
    if (profile) return profile;
    return (battleTactic ? SCENE_DEPLOY_PREFERENCE[battleTactic] : undefined) ?? null;
}
