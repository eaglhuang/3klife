// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-5 背叛判定、RAIDER 週期侵襲、§G-1 事件文案；PROG-2-1769
/**
 * RivalPlayerEvents — 每季他國對玩家的非選擇性事件：盟友背叛、南蠻掠奪、國家滅亡（純邏輯，不依賴 cc）。
 *
 * 暫定（可逆）：
 * - 規格只寫南蠻每 6 季侵襲，沒寫損失量；暫定糧草 10%、兵力 5%。
 * - 只有 E-5 列出的 WARLORD 會背叛玩家；呂布沒有背叛台詞，文案省略台詞那一段。
 * - 領地歸零視為滅亡（規格沒寫條件）；殘餘武將流入傭兵市場沒有接，句子照規格顯示。
 *
 * Unity 對照：像回合結算的一個 System，吃世界狀態吐新狀態與待顯示訊息。
 */
import { aiDiplomacyIntents, applyRelationEvent } from './RivalAiDiplomacy';
import { nationDef, type NationState, type RivalWorld } from './RivalNations';
import { formatNationFallen, formatNationBetrayal, formatRaid } from './RivalRulerLines';

export const RAID_TUNING = Object.freeze({
    intervalSeasons: 6,
    foodRate: 0.1,
    troopRate: 0.05,
});

export interface RivalEventPlayer {
    readonly troops: number;
    readonly food: number;
}

export interface RivalPlayerEventsResult {
    readonly world: RivalWorld;
    readonly foodLost: number;
    readonly troopsLost: number;
    readonly notices: string[];
}

function nameOf(nation: NationState): string {
    return nationDef(nation.id)?.name ?? nation.id;
}

function strongestOf(nations: readonly NationState[]): NationState {
    return nations.reduce((best, n) => (n.troops > best.troops ? n : best));
}

export function resolveRivalPlayerEvents(
    world: RivalWorld,
    season: number,
    player: RivalEventPlayer,
    random: () => number,
): RivalPlayerEventsResult {
    const notices: string[] = [];
    const strongest = strongestOf(world.nations);
    let nations = world.nations.map((nation) => {
        const profile = nationDef(nation.id)?.profile;
        if (!nation.allied || nation.fallen || !profile) return nation;
        const intents = aiDiplomacyIntents(
            { profile, troops: nation.troops, gold: nation.resources?.gold ?? 0 },
            { id: 'player', troops: player.troops, food: player.food },
            { value: nation.relation, allied: true },
            { id: strongest.id, troops: strongest.troops, isSelf: strongest.id === nation.id },
            random,
        );
        if (!intents.some((intent) => intent.kind === 'BETRAY_ALLIANCE')) return nation;
        notices.push(formatNationBetrayal(nation.id, nameOf(nation)));
        return { ...nation, allied: false, relation: applyRelationEvent(nation.relation, 'BETRAY_ALLIANCE') };
    });

    nations = nations.map((nation) => {
        const fallen = nation.territories <= 0;
        if (fallen === (nation.fallen === true)) return nation;
        if (fallen) notices.push(formatNationFallen(nation.id, nameOf(nation)));
        const { fallen: _previous, ...rest } = nation;
        return fallen ? { ...rest, fallen: true, allied: false, atWar: false } : rest;
    });

    let foodLost = 0;
    let troopsLost = 0;
    const raider = nations.find((nation) => nationDef(nation.id)?.profile === 'RAIDER' && !nation.fallen);
    if (raider && season > 0 && season % RAID_TUNING.intervalSeasons === 0) {
        foodLost = Math.floor(player.food * RAID_TUNING.foodRate);
        troopsLost = Math.floor(player.troops * RAID_TUNING.troopRate);
        if (foodLost > 0 || troopsLost > 0) notices.push(formatRaid(foodLost, troopsLost));
    }

    return { world: { nations }, foodLost, troopsLost, notices };
}
