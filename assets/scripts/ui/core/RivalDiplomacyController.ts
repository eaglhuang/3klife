// @spec-source → 治理模式他國AI系統 E-5 外交、E-12 玩家互動（doc_spec_0020）；PROG-2-1088
/**
 * RivalDiplomacyController — 大廳「外交／出征」畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 左側 8 個勢力按鈕（btnNation0..7）切換選取，右側顯示邦交、兵力、領地
 *   - 送禮／結盟／宣戰／出征 → 呼叫 RivalNations 規則，結果寫回 GameSession
 *   - 出征直接自動模擬，結算句子顯示在 resultLabel
 *
 * 規則（邦交門檻、勝負公式）全在 RivalNations，這裡不重算。
 */
import {
    GIFT_GOLD_COST, NATION_DEFS, RELATION_TIER_LABEL,
    autoResolveBattle, declareWar, nationDef, proposeAlliance, relationTier, sendGift,
    type BattleGeneral, type RivalWorld,
} from '../../core/systems/RivalNations';

export interface RivalDiplomacyFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface RivalDiplomacyDeps {
    world: () => RivalWorld;
    setWorld: (world: RivalWorld) => Promise<void>;
    /** 出征陣容（GameSession.rivalBattleSquad） */
    squad: () => readonly BattleGeneral[];
    gold: () => number;
    spendGold: (amount: number) => boolean;
    grantGold: (amount: number) => void;
    random: () => number;
    /** 君主 id → 中文名（找不到就顯示 id） */
    leaderName?: (generalId: string) => string | undefined;
}

export const RIVAL_NATION_SLOTS = NATION_DEFS.length;

export class RivalDiplomacyController {
    private _index = 0;
    private _lines: string[] = ['選一個勢力，送禮拉近邦交、結盟，或直接出征。'];

    public constructor(private readonly _deps: RivalDiplomacyDeps) {}

    public get selectedId(): string {
        return NATION_DEFS[this._index].id;
    }

    public select(index: number): void {
        if (index >= 0 && index < RIVAL_NATION_SLOTS) this._index = index;
    }

    public async gift(): Promise<void> {
        const gold = this._deps.gold();
        const result = sendGift(this._deps.world(), this.selectedId, gold);
        if (result.ok && !this._deps.spendGold(result.goldSpent)) {
            this._lines = [`金幣不足（需要 ${GIFT_GOLD_COST}）`];
            return;
        }
        if (result.ok) await this._deps.setWorld(result.world);
        this._lines = [result.message];
    }

    public async alliance(): Promise<void> {
        const result = proposeAlliance(this._deps.world(), this.selectedId);
        if (result.ok) await this._deps.setWorld(result.world);
        this._lines = [result.message];
    }

    public async war(): Promise<void> {
        const result = declareWar(this._deps.world(), this.selectedId);
        if (result.ok) await this._deps.setWorld(result.world);
        this._lines = [result.message];
    }

    public async campaign(): Promise<void> {
        const battle = autoResolveBattle(this._deps.world(), this.selectedId, this._deps.squad(), this._deps.random);
        if (battle.goldReward > 0) this._deps.grantGold(battle.goldReward);
        await this._deps.setWorld(battle.world);
        this._lines = ['【出征結算】', ...battle.lines];
    }

    public getFlowView(): RivalDiplomacyFlowView {
        const world = this._deps.world();
        const texts: Record<string, string> = {};
        const enabled: Record<string, boolean> = {};
        NATION_DEFS.forEach((def, i) => {
            const state = world.nations.find((n) => n.id === def.id);
            const tier = state ? RELATION_TIER_LABEL[relationTier(state)] : '';
            texts[`btnNation${i}Label`] = `${i === this._index ? '▶ ' : ''}${def.name}（${tier}）`;
        });
        const def = nationDef(this.selectedId)!;
        const state = world.nations.find((n) => n.id === def.id)!;
        const squad = this._deps.squad();
        texts.nationDetail = [
            `${def.name}　君主：${this._deps.leaderName?.(def.leaderId) ?? def.leaderId}`,
            `邦交 ${state.relation}（${RELATION_TIER_LABEL[relationTier(state)]}）${state.atWar ? '　交戰中' : ''}${state.allied ? '　同盟' : ''}`,
            `兵力 ${state.troops}　領地 ${state.territories}`,
        ].join('\n');
        texts.goldLabel = `金幣 ${this._deps.gold()}　出征陣容：${squad.map((g) => g.name).join('、') || '無'}`;
        texts.resultLabel = this._lines.join('\n');
        enabled.btnGift = !state.atWar;
        enabled.btnAlliance = !state.allied && !state.atWar;
        enabled.btnWar = !state.atWar;
        enabled.btnCampaign = squad.length > 0;
        return { texts, actives: {}, enabled };
    }
}
