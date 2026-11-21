// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.1 配偶；首子誕生與少年名將開場流程規格書；PROG-2-9582
/**
 * FamilyCommands — 家族命令（family.enrollSpouse）在本機 adapter 的處理器。
 *
 * 配偶納入名冊屬於重要狀態：客戶端只送「來源」意圖，配偶本人（固定種子產生）、幕府等級上限與重複判定全在權威端（單機＝GameSession）。
 * 同來源重送冪等：已在名冊回 created=false，不是錯誤，首子流程中途斷線重進才不會卡住。
 */
import type { FamilyEnrollSpouseResult, FamilyMatchmakerOfferResult, FamilySpouseSource } from '../../../shared/api/ApiCommands';
import { ApiError, type ApiErrorKey } from '../../../shared/api/ApiErrors';
import type { ApiDeltaOp } from '../../../shared/api/ApiProtocol';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 來源對應的生成型配偶 slot（單一出處；規格 3.1 與 PM 11/21 裁示：首子系統配偶 slot＝first-child） */
export const SPOUSE_SOURCE_SLOT = { 'first-child': 'first-child' } as const;

export type EnrollReason = 'no-config' | 'duplicate' | 'cap-reached' | 'not-eligible' | 'affinity-low' | 'relation-low' | 'nation-limit' | 'not-open' | 'year-limit' | 'silver-low';
export interface EnrollOutcome { ok: boolean; reason?: EnrollReason; generalId?: string; /** 本次實扣的銀兩與扣後餘額（媒人禮金；PROG-2-9591） */ silver?: { spent: number; balance: number } }
export interface MatchmakerOfferView { open: boolean; notice: string; remaining: number; candidates: ReadonlyArray<{ index: number; generalId: string; name: string; ep: number; hint: string }> }

/** 權威端的家族宿主：單機由 GameSession 提供 */
export interface FamilyHost {
    /** 可回 Promise：單機的家族設定是延遲載入的，宿主要先等設定載好再納入 */
    enrollGeneratedSpouse(slot: string): EnrollOutcome | Promise<EnrollOutcome>;
    /** 結緣好感、聯姻、媒人三來源（PROG-2-9583）：判定都在宿主，命令層只轉意圖與翻錯誤碼 */
    enrollBond(generalId: string): EnrollOutcome | Promise<EnrollOutcome>;
    enrollDiplomatic(nationId: string): EnrollOutcome | Promise<EnrollOutcome>;
    matchmakerOffer(): MatchmakerOfferView | Promise<MatchmakerOfferView>;
    enrollMatchmaker(pick: number): EnrollOutcome | Promise<EnrollOutcome>;
}

const ENROLL_FIELDS: Record<FamilySpouseSource, string | null> = {
    'first-child': null, bond: 'generalId', diplomatic: 'nationId', matchmaker: 'pick',
};

const REASON_ERROR: Record<string, [ApiErrorKey, string]> = {
    'no-config': ['FAMILY_NO_CONFIG', '家族設定尚未載入'],
    'cap-reached': ['FAMILY_CAP_REACHED', '配偶人數已達幕府等級上限'],
    'not-eligible': ['FAMILY_SPOUSE_NOT_ELIGIBLE', '這位不能納為配偶（不在名冊、不是女性、或選位無效）'],
    'affinity-low': ['FAMILY_AFFINITY_LOW', '好感還沒到門檻，再多送幾次禮吧'],
    'relation-low': ['FAMILY_RELATION_LOW', '邦交還沒到友好，先送禮拉拉關係'],
    'nation-limit': ['FAMILY_NATION_LIMIT', '這個國家的聯姻名額已滿'],
    'not-open': ['FAMILY_MATCHMAKER_NOT_OPEN', '媒婆服務即將開放'],
    'year-limit': ['FAMILY_MATCHMAKER_YEAR_LIMIT', '今年的說親名額已用完，明年請早'],
    'silver-low': ['INSUFFICIENT_BALANCE', '家族銀兩不足，媒婆說她不賒帳'],
};

export function registerFamilyCommands(adapter: LocalApiAdapter, getHost: () => FamilyHost | null): void {
    adapter.register('family.enrollSpouse', async (args) => {
        const host = getHost();
        if (!host) throw new ApiError('FAMILY_UNAVAILABLE', '家族服務尚未就緒');
        const source = args.source;
        if (typeof source !== 'string' || !Object.prototype.hasOwnProperty.call(ENROLL_FIELDS, source)) {
            throw new ApiError('FAMILY_SOURCE_UNKNOWN', `未知的配偶來源 ${String(source)}`);
        }
        const field = ENROLL_FIELDS[source as FamilySpouseSource];
        const extra = Object.keys(args).find((k) => k !== 'source' && k !== field);
        if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
        let out: EnrollOutcome;
        if (source === 'first-child') {
            out = await host.enrollGeneratedSpouse(SPOUSE_SOURCE_SLOT['first-child']);
        } else if (source === 'bond') {
            if (typeof args.generalId !== 'string' || !args.generalId) throw new ApiError('FAMILY_SOURCE_UNKNOWN', 'bond 需要 generalId');
            out = await host.enrollBond(args.generalId);
        } else if (source === 'diplomatic') {
            if (typeof args.nationId !== 'string' || !args.nationId) throw new ApiError('FAMILY_SOURCE_UNKNOWN', 'diplomatic 需要 nationId');
            out = await host.enrollDiplomatic(args.nationId);
        } else {
            if (typeof args.pick !== 'number' || !Number.isInteger(args.pick)) throw new ApiError('FAMILY_SOURCE_UNKNOWN', 'matchmaker 需要整數 pick');
            out = await host.enrollMatchmaker(args.pick);
        }
        const mapped = !out.ok && out.reason ? REASON_ERROR[out.reason] : undefined;
        if (mapped) throw new ApiError(mapped[0], mapped[1]);
        if (!out.generalId) throw new ApiError('FAMILY_UNAVAILABLE', '配偶納入失敗');
        const result: FamilyEnrollSpouseResult = { generalId: out.generalId, created: out.ok, ...(out.silver ? { silverSpent: out.silver.spent } : {}) };
        const delta: ApiDeltaOp[] = out.ok ? [{ path: `/family/${out.generalId}`, op: 'add' as const, value: null }] : [];
        if (out.ok && out.silver) delta.push({ path: '/family/silver', op: 'replace', value: out.silver.balance });
        return { result, delta };
    });

    adapter.register('family.matchmakerOffer', async () => {
        const host = getHost();
        if (!host) throw new ApiError('FAMILY_UNAVAILABLE', '家族服務尚未就緒');
        const result: FamilyMatchmakerOfferResult = await host.matchmakerOffer();
        return { result };
    });
}
