// @spec-source → 轉職與宿命系統.md (doc_spec_0043) §E #1 #2 §F
/**
 * UnveilingService — 宿命分流的玩家選擇（純邏輯，不依賴 cc）
 *
 * 開獎本身由 GameSession 每季自動跑（見 unveilDueGenerals）；
 * 這裡只處理「玩家對天命建議按下順應或逆天」這一步，並寫回名冊。
 *
 * Unity 對照：UI 的 Button.onClick 只呼叫 FateService.Choose(childId, accept)，不碰資料細節。
 */
import type { RosterStore } from '../managers/GameSession';
import { chooseFate, FateChoice, UnveilingGeneral } from '../systems/Unveiling';
import type { RandomSource } from '../systems/GeneralAging';

export class UnveilingError extends Error {}

export class UnveilingService {
    constructor(
        private readonly _roster: RosterStore,
        private readonly _random: RandomSource = Math.random,
    ) {}

    /** 等待玩家做宿命選擇的武將（已開獎、尚未選） */
    getPendingFate(): UnveilingGeneral[] {
        return (this._roster.getAll() as UnveilingGeneral[]).filter((g) => g.fate && !g.fate.choice);
    }

    choose(generalId: string, choice: FateChoice): UnveilingGeneral {
        const roster = this._roster.getAll() as UnveilingGeneral[];
        const index = roster.findIndex((g) => g.id === generalId);
        if (index < 0) throw new UnveilingError(`名冊中找不到 ${generalId}`);
        const updated = chooseFate(roster[index], choice, this._random);
        const next = [...roster];
        next[index] = updated;
        this._roster.replaceAll(next);
        return updated;
    }
}
