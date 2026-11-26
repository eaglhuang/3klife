// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 第 3 章成員類別、第 7 章分家、第 8 章義子（含 Q-F1 開局義子特例）；PROG-2-9441
/**
 * FamilyService — 家族成員登記表（零依賴）。
 *
 * - 寫入只在權威端：玩法與 UI 不准直接呼叫下列寫入方法（addFamilyMember／removeFamilyMember／markFamilyBranch），
 *   一律走共通 API（後續 F3～F9 的命令處理器在 core/api 內呼叫）；check-api-bypass 的 family-write 規則掃這三個名字（TC-FAM-09）。
 * - 宿主生命週期操作（snapshot／restore／seedStarterAdoptee）不在偵測名單：與 OccupancyService 的 restore 同性質，
 *   是存檔讀寫與新局初始化，不是玩法寫入。
 * - 存檔欄位 familyState 由宿主經 save.load／save.full 讀寫；讀檔時壞紀錄丟棄、不拋錯（保護玩家存檔）。
 */
import { spouseCapFor, type FamilyConfigV1 } from './FamilyConfig';
import {
    ADOPT_SOURCES, FAMILY_MEMBER_KINDS, FAMILY_STATE_VERSION, FamilyError, emptyFamilyState,
    type AdoptSource, type FamilyBranchRecord, type FamilyMemberKind, type FamilyMemberRecord, type FamilyStateV1,
} from './FamilyTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 檢查一筆成員紀錄；回傳錯誤說明，合格回 null */
export function validateFamilyMember(member: FamilyMemberRecord): string | null {
    if (typeof member.personId !== 'string' || member.personId === '') return 'personId 必須是非空字串';
    if ((FAMILY_MEMBER_KINDS as readonly string[]).indexOf(member.kind) < 0) return `未知的成員類別 ${String(member.kind)}`;
    if (!Array.isArray(member.parentIds) || member.parentIds.length > 2 || member.parentIds.some((p) => typeof p !== 'string' || p === '')) {
        return 'parentIds 必須是最多兩個非空字串';
    }
    if (member.parentIds.indexOf(member.personId) >= 0) return '不能是自己的父母';
    if (member.kind === 'adopted') {
        if (!member.adoptSource || (ADOPT_SOURCES as readonly string[]).indexOf(member.adoptSource) < 0) return '義子必須標明來源 adoptSource';
    } else if (member.adoptSource !== undefined) {
        return `只有義子可以有 adoptSource（${member.kind}）`;
    }
    if (member.kind === 'retainerChild' && member.parentIds.length === 0) return '家臣子嗣必須記錄家臣（父母）';
    if (member.branchId !== null && (typeof member.branchId !== 'string' || member.branchId === '')) return 'branchId 必須是 null 或非空字串';
    if (typeof member.joinedAt !== 'number' || !Number.isFinite(member.joinedAt)) return 'joinedAt 必須是有限數字';
    return null;
}

function normalizeMember(raw: unknown): FamilyMemberRecord | null {
    if (!isRecord(raw)) return null;
    const member: FamilyMemberRecord = {
        personId: typeof raw.personId === 'string' ? raw.personId : '',
        kind: raw.kind as FamilyMemberKind,
        parentIds: Array.isArray(raw.parentIds) ? raw.parentIds.filter((p): p is string => typeof p === 'string' && p !== '') : [],
        branchId: typeof raw.branchId === 'string' && raw.branchId !== '' ? raw.branchId : null,
        joinedAt: finiteOr(raw.joinedAt, 0),
    };
    if (raw.adoptSource !== undefined) member.adoptSource = raw.adoptSource as AdoptSource;
    return validateFamilyMember(member) === null ? member : null;
}

function normalizeBranch(raw: unknown): FamilyBranchRecord | null {
    if (!isRecord(raw)) return null;
    if (typeof raw.branchId !== 'string' || raw.branchId === '' || typeof raw.headId !== 'string' || raw.headId === '') return null;
    return { branchId: raw.branchId, headId: raw.headId, atSeason: finiteOr(raw.atSeason, 0) };
}

/** 正規化存檔帶來的 familyState；缺值或壞資料回空狀態（壞的單筆丟棄、重複 personId 留第一筆） */
export function normalizeFamilyState(raw: unknown): FamilyStateV1 {
    if (!isRecord(raw)) return emptyFamilyState();
    const members: FamilyMemberRecord[] = [];
    for (const item of Array.isArray(raw.members) ? raw.members : []) {
        const member = normalizeMember(item);
        if (member && !members.some((m) => m.personId === member.personId)) members.push(member);
    }
    const branches: FamilyBranchRecord[] = [];
    for (const item of Array.isArray(raw.branches) ? raw.branches : []) {
        const branch = normalizeBranch(item);
        if (branch && !branches.some((b) => b.branchId === branch.branchId)) branches.push(branch);
    }
    const state: FamilyStateV1 = { v: FAMILY_STATE_VERSION, members, branches };
    // 銀兩壞值（非有限、負數）丟棄回「尚未動用」，不拋錯（保護玩家存檔）
    if (typeof raw.silver === 'number' && Number.isFinite(raw.silver) && raw.silver >= 0) state.silver = Math.floor(raw.silver);
    return state;
}

export class FamilyService {
    private _state: FamilyStateV1 = emptyFamilyState();

    /** 存檔快照（深複製） */
    public snapshot(): FamilyStateV1 {
        const out: FamilyStateV1 = {
            v: FAMILY_STATE_VERSION,
            members: this._state.members.map((m) => ({ ...m, parentIds: [...m.parentIds] })),
            branches: this._state.branches.map((b) => ({ ...b })),
        };
        if (this._state.silver !== undefined) out.silver = this._state.silver;
        return out;
    }

    /** 家族銀兩餘額：尚未動用過就是開局銀兩（由宿主依設定傳入，本類別不讀設定） */
    public silverBalance(startingSilver: number): number {
        return this._state.silver ?? startingSilver;
    }

    /** 扣銀兩：不足回 false 且不扣；amount 須為正整數 */
    public trySpendSilver(amount: number, startingSilver: number): boolean {
        if (!Number.isInteger(amount) || amount <= 0) return false;
        const have = this.silverBalance(startingSilver);
        if (have < amount) return false;
        this._state.silver = have - amount;
        return true;
    }

    /** 入帳銀兩（家族收入、捐贈換回、退款）；amount 須為正整數 */
    public creditSilver(amount: number, startingSilver: number): void {
        if (!Number.isInteger(amount) || amount <= 0) return;
        this._state.silver = this.silverBalance(startingSilver) + amount;
    }

    public restore(raw: unknown): void {
        this._state = normalizeFamilyState(raw);
    }

    public reset(): void {
        this._state = emptyFamilyState();
    }

    public get(personId: string): FamilyMemberRecord | undefined {
        const found = this._state.members.find((m) => m.personId === personId);
        return found ? { ...found, parentIds: [...found.parentIds] } : undefined;
    }

    public members(kind?: FamilyMemberKind): FamilyMemberRecord[] {
        return this._state.members.filter((m) => kind === undefined || m.kind === kind).map((m) => ({ ...m, parentIds: [...m.parentIds] }));
    }

    public branches(): FamilyBranchRecord[] {
        return this._state.branches.map((b) => ({ ...b }));
    }

    /** 目前在本家的配偶數（已分家者不算） */
    public spouseCount(): number {
        return this._state.members.filter((m) => m.kind === 'spouse' && m.branchId === null).length;
    }

    /** 依幕府等級與設定檢查還能不能再納一位配偶（TC-FAM-01 的上限） */
    public canAddSpouse(config: FamilyConfigV1, hallLevel: number): boolean {
        return this.spouseCount() < spouseCapFor(config, hallLevel);
    }

    /**
     * 新增成員。重複 personId 丟 DUPLICATE；欄位不合格丟 INVALID。
     * 配偶上限不在這裡擋（需要幕府等級與設定，由 F3 命令處理器先用 canAddSpouse 判斷並回 CAP_REACHED）。
     */
    public addFamilyMember(member: FamilyMemberRecord): FamilyMemberRecord {
        const problem = validateFamilyMember(member);
        if (problem) throw new FamilyError('INVALID', problem);
        if (this._state.members.some((m) => m.personId === member.personId)) throw new FamilyError('DUPLICATE', `${member.personId} 已在家族名冊`);
        const stored: FamilyMemberRecord = { ...member, parentIds: [...member.parentIds] };
        this._state.members.push(stored);
        return { ...stored, parentIds: [...stored.parentIds] };
    }

    /**
     * 納配偶：先檢查幕府等級的配偶上限（超過丟 CAP_REACHED），再登記 kind=spouse（重複丟 DUPLICATE）。
     * 玩法端（GameSession）只呼叫這個，不直接 addFamilyMember（TC-FAM-09）。
     */
    public addSpouse(personId: string, joinedAt: number, config: FamilyConfigV1, hallLevel: number): FamilyMemberRecord {
        if (this._state.members.some((m) => m.personId === personId)) throw new FamilyError('DUPLICATE', `${personId} 已在家族名冊`);
        if (!this.canAddSpouse(config, hallLevel)) throw new FamilyError('CAP_REACHED', `配偶已達幕府 Lv${hallLevel} 的上限`);
        return this.addFamilyMember({ personId, kind: 'spouse', parentIds: [], branchId: null, joinedAt });
    }

    /** 移除成員（例如外嫁、遺孤改託）；沒有該成員回 false */
    public removeFamilyMember(personId: string): boolean {
        const index = this._state.members.findIndex((m) => m.personId === personId);
        if (index < 0) return false;
        this._state.members.splice(index, 1);
        return true;
    }

    /**
     * 標記分家：成員改記分家 id（不進家譜），並登記分家紀錄。同一位只能分家一次（擋重複領 branchPrestige）。
     */
    public markFamilyBranch(personId: string, branchId: string, atSeason: number): FamilyBranchRecord {
        const member = this._state.members.find((m) => m.personId === personId);
        if (!member) throw new FamilyError('NOT_FOUND', `${personId} 不在家族名冊`);
        if (member.kind === 'spouse') throw new FamilyError('INVALID', '配偶不能分家');
        if (member.branchId !== null) throw new FamilyError('DUPLICATE', `${personId} 已經分家`);
        if (branchId === '') throw new FamilyError('INVALID', 'branchId 必須是非空字串');
        if (this._state.branches.some((b) => b.branchId === branchId)) throw new FamilyError('DUPLICATE', `分家 ${branchId} 已存在`);
        member.branchId = branchId;
        const branch: FamilyBranchRecord = { branchId, headId: personId, atSeason: finiteOr(atSeason, 0) };
        this._state.branches.push(branch);
        return { ...branch };
    }

    /**
     * 宿主初始化：登記「開局義子特例」（Q-F1，趙雲、關羽、諸葛亮等 14 歲少年）。
     * 標記義子、進家譜、可入學、不遺傳血統；冪等（已在名冊就保留原紀錄）。新局與舊檔對帳共用。
     */
    public seedStarterAdoptee(personId: string, joinedAt: number): FamilyMemberRecord {
        const existing = this.get(personId);
        if (existing) return existing;
        return this.addFamilyMember({ personId, kind: 'adopted', adoptSource: 'starter', parentIds: [], branchId: null, joinedAt });
    }

    /**
     * 宿主初始化：登記「開局幼苗」（PROG-2-10058，7 歲，父＝核心主將）。
     * 與開局義子特例同為 kind=adopted、adoptSource=starter（進家譜、可入學、不遺傳血統），差別只在有父親紀錄；冪等。
     */
    public seedStarterSeedling(personId: string, parentIds: readonly string[], joinedAt: number): FamilyMemberRecord {
        const existing = this.get(personId);
        if (existing) return existing;
        return this.addFamilyMember({ personId, kind: 'adopted', adoptSource: 'starter', parentIds: [...parentIds], branchId: null, joinedAt });
    }

    /**
     * 結緣誕生親生子嗣登記（PROG-2-9973）：寫入家族登記表 kind='biological'；冪等，已在名冊就保留原紀錄。
     */
    public recordBiologicalChild(personId: string, parentIds: readonly string[], joinedAt: number): FamilyMemberRecord {
        const existing = this.get(personId);
        if (existing) return existing;
        return this.addFamilyMember({
            personId,
            kind: 'biological',
            parentIds: [...parentIds],
            branchId: null,
            joinedAt,
        });
    }
}
