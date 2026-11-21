// @spec-source → 技能系統 Base 框架規格書 (doc_spec_1187) §4 ISkillService、§11 伺服器 API；共用框架總綱 (doc_spec_1182) §12 SKL-M；PROG-2-9204
/**
 * SkillService — 技能學習、授予、升級、調整值的純邏輯（零依賴，不 import cc）。
 *
 * 職責：學／授予／升／調整值；不碰戰場即時解算（命中、傷害）。
 * 持有的讀寫與 TP 事實都經 port（SkillHolderStore、SkillLearnAuthority），單機由 GameSession 實作，
 * 連線時換伺服器；本類別本身不持有任何狀態，所以同一份邏輯本機與伺服器通用。
 *
 * 冪等：grant／applyModifier 對已存在的項目只回「略過」，重送不會重複加；learn／upgrade 重送由命令層 idemKey 擋。
 * 所有寫入先在複本上算完、確定成功才 save 一次，失敗不留半套（呼應「寫失敗不前進」）。
 */
import type { SkillRegistry } from './SkillRegistry';
import type {
    GrantResult, HolderRef, LearnCheck, LearnResult, SkillBlock, SkillDef, SkillHolderStore, SkillHolding, SkillLearnAuthority,
    SkillModifier, SkillRecord, UpgradeResult,
} from './SkillTypes';

export interface SkillServiceDeps {
    registry: SkillRegistry;
    store: SkillHolderStore;
    /** 學習權威（TP、槽位）；沒綁定時 canLearn／learn 回 null，由命令層轉成「不可用」 */
    authority?: SkillLearnAuthority | null;
    /** 學習條件（def.learn.needs）評估；未提供視為全部成立 */
    needsMet?: (holder: HolderRef, def: SkillDef) => boolean;
    now?: () => number;
}

/** 占槽位的類別：戰法（戰場、培育）。天賦、職業等第二版另有欄位，不占戰法槽 */
const SLOT_DOMAINS: readonly string[] = ['battle', 'nurture'];

/** 持有者不存在 */
export class SkillHolderMissing extends Error {}

export class SkillService {
    public constructor(private readonly _deps: SkillServiceDeps) {}

    private _now(): number {
        return this._deps.now ? this._deps.now() : Date.now();
    }

    private _load(holder: HolderRef): SkillHolding {
        const holding = this._deps.store.load(holder);
        if (!holding) throw new SkillHolderMissing(`持有者不存在：${holder.kind}:${holder.id}`);
        return { holder, skills: holding.skills.map((s) => ({ ...s })), modifiers: holding.modifiers.map((m) => ({ ...m })) };
    }

    /** 查詢某人的技能與調整值（複本）；可依類別過濾 */
    public list(holder: HolderRef, domain?: string): SkillHolding {
        const holding = this._load(holder);
        if (!domain) return holding;
        return { ...holding, skills: holding.skills.filter((s) => this._deps.registry.get(s.skillId)?.domain === domain) };
    }

    /**
     * 學習可否（不寫入）。依序：定義 → 已學 → 來源資格 → TP 門檻 → 學習條件 → 槽位。
     * 沒有學習權威時回 null（呼叫端轉成「不可用」）。
     */
    public canLearn(holder: HolderRef, skillId: string): LearnCheck | null {
        const def = this._deps.registry.get(skillId);
        if (!def) return { ok: false, blocked: 'INVALID_SKILL' };
        const holding = this._load(holder);
        if (holding.skills.some((s) => s.skillId === skillId)) return { ok: false, blocked: 'ALREADY_LEARNED' };
        const authority = this._deps.authority;
        const facts = authority ? authority.facts(holder, def) : null;
        if (!facts) return null;
        const tpCost = Math.max(0, facts.tpCost ?? def.cost?.tp ?? 0);
        const tpThreshold = tpCost * (def.learn?.tpThresholdMul ?? 0);
        const block = (blocked: SkillBlock): LearnCheck => ({ ok: false, blocked, tpThreshold, tpCost });
        if (facts.qualified === false) return block('NOT_INSPIRED');
        if (!Number.isFinite(facts.tp) || facts.tp < tpThreshold) return block('TP_SHORT');
        if (this._deps.needsMet && !this._deps.needsMet(holder, def)) return block('APTITUDE_UNMET');
        const used = holding.skills.filter((s) => SLOT_DOMAINS.includes(this._deps.registry.get(s.skillId)?.domain ?? '')).length;
        if (SLOT_DOMAINS.includes(def.domain) && used >= facts.slotCapacity) return block('NO_SLOT');
        return { ok: true, tpThreshold, tpCost };
    }

    /** 學習：判定通過才扣 TP 並寫持有；回傳 null 代表沒有學習權威 */
    public learn(holder: HolderRef, skillId: string, source: string): LearnResult | null {
        const check = this.canLearn(holder, skillId);
        if (!check) return null;
        if (!check.ok) return { ok: false, blocked: check.blocked };
        const tpCost = check.tpCost ?? 0;
        if (tpCost > 0 && !this._deps.authority!.spendTp(holder, tpCost)) return { ok: false, blocked: 'TP_SHORT' };
        const holding = this._load(holder);
        const record: SkillRecord = { skillId, level: 1, xp: 0, learnedFrom: source, learnedAt: this._now() };
        holding.skills.push(record);
        this._deps.store.save(holder, holding);
        return { ok: true, skill: { ...record }, spent: { tp: tpCost } };
    }

    /**
     * 授予：不經 TP 與槽位判定（結業、獎勵、教官傳授等已由上游判定的來源）。
     * 已持有者略過（冪等）；定義庫查無的 id 仍寫入但列在 unknown，避免舊資料或暫定 id 讓結業掉戰法。
     */
    public grant(holder: HolderRef, skillIds: readonly string[], source: string): GrantResult {
        const holding = this._load(holder);
        const result: GrantResult = { granted: [], skipped: [], unknown: [] };
        const seen = new Set(holding.skills.map((s) => s.skillId));
        const at = this._now();
        for (const id of skillIds) {
            if (!id) continue;
            if (seen.has(id)) { if (result.skipped.indexOf(id) < 0) result.skipped.push(id); continue; }
            seen.add(id);
            if (!this._deps.registry.has(id)) result.unknown.push(id);
            holding.skills.push({ skillId: id, level: 1, xp: 0, learnedFrom: source, learnedAt: at });
            result.granted.push(id);
        }
        if (result.granted.length > 0) this._deps.store.save(holder, holding);
        return result;
    }

    /** 升級：需有等級表且熟練度達下一級要求；否則 MAX_LEVEL／NOT_LEARNED。規格 Q2：戰法預設不分等級 */
    public upgrade(holder: HolderRef, skillId: string): UpgradeResult {
        const def = this._deps.registry.get(skillId);
        if (!def) return { ok: false, blocked: 'INVALID_SKILL' };
        const holding = this._load(holder);
        const record = holding.skills.find((s) => s.skillId === skillId);
        if (!record) return { ok: false, blocked: 'NOT_LEARNED' };
        const next = (def.levels ?? []).find((l) => l.lv === record.level + 1);
        if (!next) return { ok: false, blocked: 'MAX_LEVEL' };
        if (record.xp < (next.xpRequired ?? 0)) return { ok: false, blocked: 'APTITUDE_UNMET' };
        record.level = next.lv;
        this._deps.store.save(holder, holding);
        return { ok: true, skill: { ...record } };
    }

    /**
     * 套用調整值（期中方針 policy:* 等）：不同 id 可並存（疊加）；同 id 重送視為刷新、不重複。
     * 回傳是否新增。
     */
    public applyModifier(holder: HolderRef, modifier: Omit<SkillModifier, 'appliedAt'>): { applied: boolean; modifiers: SkillModifier[] } {
        const holding = this._load(holder);
        const existing = holding.modifiers.find((m) => m.id === modifier.id);
        if (existing) {
            existing.source = modifier.source;
            existing.until = modifier.until;
            this._deps.store.save(holder, holding);
            return { applied: false, modifiers: holding.modifiers };
        }
        holding.modifiers.push({ ...modifier, appliedAt: this._now() });
        this._deps.store.save(holder, holding);
        return { applied: true, modifiers: holding.modifiers };
    }

    /** 移除調整值；沒有該項視為已移除（冪等） */
    public removeModifier(holder: HolderRef, modifierId: string): { removed: boolean; modifiers: SkillModifier[] } {
        const holding = this._load(holder);
        const next = holding.modifiers.filter((m) => m.id !== modifierId);
        const removed = next.length !== holding.modifiers.length;
        if (removed) {
            holding.modifiers = next;
            this._deps.store.save(holder, holding);
        }
        return { removed, modifiers: holding.modifiers };
    }

    /** 清掉某種到期類別的調整值（結業時清 until=graduation）；回傳清掉的 id */
    public clearModifiersUntil(holder: HolderRef, until: SkillModifier['until']): string[] {
        const holding = this._load(holder);
        const cleared = holding.modifiers.filter((m) => m.until === until).map((m) => m.id);
        if (cleared.length > 0) {
            holding.modifiers = holding.modifiers.filter((m) => m.until !== until);
            this._deps.store.save(holder, holding);
        }
        return cleared;
    }
}
