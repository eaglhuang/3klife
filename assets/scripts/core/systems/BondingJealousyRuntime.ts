// @spec-source → PROG-2-10043 結緣提親機率面板與吃醋彈窗掛載（資料組裝，純邏輯不依賴 cc）
/**
 * BondingJealousyRuntime — 把「提親機率面板」與「吃醋彈窗」需要的真實遊戲資料組起來（純邏輯）
 *
 * 職責：從家族／好感／相性帳本推出面板入參，並暫存提親被拒次數與吃醋抓包次數。
 * 不負責：畫面節點（LobbyScene 掛載）、數值公式（BondingSuccessService／JealousyAndDynastyService）。
 * 注意：暫存狀態目前只留在記憶體，沒有進存檔（見任務卡 PROG-2-10043 遺留問題）。
 */
import { familyPairKey, synergyKOf, type FamilySynergyLedger } from './FamilySynergy';
import type { BondingProposalState } from './BondingSuccessService';
import { JealousyAndDynastyService, type JealousyState } from './JealousyAndDynastyService';

/** 吃醋至少要有幾位配偶才會發生（只有一位配偶沒有「比較對象」） */
export const JEALOUSY_MIN_SPOUSES = 2;

/** 父母兩家的世交相性 K；任一方沒有家族編號、或尚無合譜紀錄時為 0 */
export function pairSynergyK(
    ledger: FamilySynergyLedger | undefined,
    father: { familyUid?: string } | null | undefined,
    mother: { familyUid?: string } | null | undefined,
): number {
    if (!ledger || !father?.familyUid || !mother?.familyUid) return 0;
    return synergyKOf(ledger.pairs[familyPairKey(father.familyUid, mother.familyUid)]);
}

/** 字串轉穩定整數種子（同一對父母每次抽到同一個小名） */
export function seedOfText(text: string): number {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return Math.abs(h);
}

interface ProposalMemo {
    rejectCount: number;
    cooldownSeasons: number;
}

export class BondingJealousyRuntime {
    private readonly _proposalMemo = new Map<string, ProposalMemo>();
    private _matchmakerFallbackUsed = false;
    private _jealousy: JealousyState = {
        favor: 0,
        stamina: 0,
        gold: 0,
        caughtCount: 0,
        unlockedTitles: [],
        spouseYearTriggerCount: {},
    };

    /** 組出某位提親對象的提親狀態：好感取真實值，被拒次數取暫存 */
    public proposalStateFor(targetId: string, favorF: number, hasPartner: boolean): BondingProposalState {
        const memo = this._proposalMemo.get(targetId) ?? { rejectCount: 0, cooldownSeasons: 0 };
        return {
            favorF,
            rejectCount: memo.rejectCount,
            cooldownSeasons: memo.cooldownSeasons,
            matchmakerFallbackUsed: this._matchmakerFallbackUsed,
            hasPartner,
        };
    }

    /** 提親結果回存：只記被拒次數、冷卻與保底是否用過；好感由呼叫端寫回真實好感系統 */
    public commitProposal(targetId: string, next: BondingProposalState): void {
        this._proposalMemo.set(targetId, { rejectCount: next.rejectCount, cooldownSeasons: next.cooldownSeasons });
        this._matchmakerFallbackUsed = next.matchmakerFallbackUsed;
    }

    /** 組出吃醋判定用的狀態：好感、銀兩、精力取真實值，抓包與年度次數取暫存 */
    public jealousyStateFor(real: { favor: number; stamina: number; silver: number }): JealousyState {
        return { ...this._jealousy, favor: real.favor, stamina: real.stamina, gold: real.silver };
    }

    public commitJealousy(next: JealousyState): void {
        this._jealousy = { ...next };
    }

    /** 本年還有名額的第一位配偶；配偶不足 2 位或都已哄過回 null */
    public pickJealousySpouse(spouseIds: readonly string[], year: number): string | null {
        if (spouseIds.length < JEALOUSY_MIN_SPOUSES) return null;
        return spouseIds.find((id) => JealousyAndDynastyService.hasQuotaLeft(this._jealousy, id, year)) ?? null;
    }
}
