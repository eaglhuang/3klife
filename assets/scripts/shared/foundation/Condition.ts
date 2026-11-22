// @spec-source → 共用框架總綱規格書 (doc_spec_1182) 第 11.1 節 UnlockCondition／IConditionEvaluator；任務、劇情、技能、商店共用；PROG-2-9202
/**
 * Condition — 以 JSON 描述的條件與評估器（零依賴純函式庫）。
 *
 * 任務接取／完成／可見、劇情觸發、技能解鎖、商店上架、入學資格……都用同一套條件語言。
 *
 * 內建種類（JSON 範例）：
 *   { "all": [ ... ] } / { "any": [ ... ] } / { "not": { ... } }       與、或、非
 *   { "kind": "compare", "fact": "gold", "op": ">=", "value": 500 }   數值比較（事實由 ctx.getNumber 提供）
 *   { "kind": "hasItem", "itemId": "token.academy", "count": 1 }      持有物（ctx.countItem）
 *   { "kind": "flag", "key": "story.intro.done", "value": true }      旗標（ctx.getFlag；value 預設 true）
 *   { "kind": "rank", "op": ">=", "value": 3 }                       官職階位（ctx.getRank）
 *   { "kind": "const", "value": true }                                 常數（測試、停用開關）
 *
 * 擴充：各框架用 `evaluator.register(kind, handler)` 註冊自己的種類（例如 troopType），
 * 不必改這個檔。事實查詢（ctx）由宿主提供：伺服器側用權威存檔、客戶端預覽用快照。
 * 條件只讀不寫，因此客戶端拿快照評估只能做「顯示用預覽」，真正放行仍由伺服器評估。
 */

export type CompareOp = '==' | '!=' | '>' | '>=' | '<' | '<=';

/** 邏輯節點 */
export interface AllCondition { all: Condition[] }
export interface AnyCondition { any: Condition[] }
export interface NotCondition { not: Condition }

/** 葉節點：kind 為內建或已註冊的種類，其餘欄位由該種類決定 */
export interface LeafCondition {
    kind: string;
    [field: string]: unknown;
}

export type Condition = AllCondition | AnyCondition | NotCondition | LeafCondition;

/** 內建種類所需的事實查詢；沒有的事實回傳 undefined／0／false */
export interface ConditionFacts {
    /** 數值事實（金、糧、等級、回合數…）；未知 fact 回傳 undefined（比較時視為 0） */
    getNumber?(fact: string): number | undefined;
    getFlag?(key: string): boolean;
    countItem?(itemId: string): number;
    /** 官職階位（數字越大越高） */
    getRank?(): number;
}

/** 葉節點處理器 */
export type ConditionHandler<Ctx> = (cond: LeafCondition, ctx: Ctx) => boolean;

/** 評估說明：ok=false 時 failed 列出造成失敗的葉節點，供 UI 顯示「缺什麼」 */
export interface ConditionExplain {
    ok: boolean;
    failed: Condition[];
}

/** 設定錯誤（格式不對、未註冊種類）；與「條件不成立」不同，不可吞掉 */
export class ConditionError extends Error {
    public constructor(message: string) {
        super(`[Condition] ${message}`);
        this.name = 'ConditionError';
    }
}

const MAX_DEPTH = 32;
const COMPARE_OPS: readonly string[] = ['==', '!=', '>', '>=', '<', '<='];

export function compareValues(left: number, op: CompareOp, right: number): boolean {
    switch (op) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '<': return left < right;
        case '<=': return left <= right;
        default: throw new ConditionError(`不支援的比較運算子 "${String(op)}"`);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(cond: LeafCondition, field: string): string {
    const v = cond[field];
    if (typeof v !== 'string' || v === '') throw new ConditionError(`${cond.kind} 缺少字串欄位 "${field}"`);
    return v;
}

function requireNumber(cond: LeafCondition, field: string): number {
    const v = cond[field];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new ConditionError(`${cond.kind} 缺少數值欄位 "${field}"`);
    return v;
}

function requireOp(cond: LeafCondition): CompareOp {
    const op = cond.op;
    if (typeof op !== 'string' || !COMPARE_OPS.includes(op)) throw new ConditionError(`${cond.kind} 的 op 無效："${String(op)}"`);
    return op as CompareOp;
}

export class ConditionEvaluator<Ctx = ConditionFacts> {
    private readonly _handlers = new Map<string, ConditionHandler<Ctx>>();

    /** 註冊（或覆寫）葉節點種類；kind 不可與邏輯關鍵字衝突 */
    public register(kind: string, handler: ConditionHandler<Ctx>): this {
        if (kind === '' || kind === 'all' || kind === 'any' || kind === 'not') {
            throw new ConditionError(`不可註冊保留字種類 "${kind}"`);
        }
        this._handlers.set(kind, handler);
        return this;
    }

    public hasKind(kind: string): boolean {
        return this._handlers.has(kind);
    }

    /** 評估；格式錯誤或未註冊種類丟 ConditionError。空的 all 為真、空的 any 為假（與數學慣例一致） */
    public evaluate(cond: Condition, ctx: Ctx): boolean {
        return this._eval(cond, ctx, 0);
    }

    /** 評估並指出失敗的葉節點 */
    public explain(cond: Condition, ctx: Ctx): ConditionExplain {
        const failed: Condition[] = [];
        const ok = this._explain(cond, ctx, 0, failed);
        return { ok, failed };
    }

    /**
     * 載入時靜態檢查：回傳錯誤字串清單（空陣列＝合格）。
     * 只檢查結構與種類是否已註冊，不呼叫處理器、不需要 ctx。
     */
    public validate(cond: unknown, path = '$'): string[] {
        return this._validate(cond, path, 0);
    }

    private _eval(cond: Condition, ctx: Ctx, depth: number): boolean {
        if (depth > MAX_DEPTH) throw new ConditionError(`條件巢狀超過 ${MAX_DEPTH} 層`);
        if (!isRecord(cond)) throw new ConditionError('條件必須是物件');
        if ('all' in cond) return this._list(cond.all, 'all').every((c) => this._eval(c, ctx, depth + 1));
        if ('any' in cond) return this._list(cond.any, 'any').some((c) => this._eval(c, ctx, depth + 1));
        if ('not' in cond) return !this._eval(cond.not as Condition, ctx, depth + 1);
        const leaf = cond as LeafCondition;
        const handler = this._handlers.get(leaf.kind);
        if (!handler) throw new ConditionError(`未註冊的條件種類 "${String(leaf.kind)}"`);
        return handler(leaf, ctx);
    }

    private _explain(cond: Condition, ctx: Ctx, depth: number, failed: Condition[]): boolean {
        if (depth > MAX_DEPTH) throw new ConditionError(`條件巢狀超過 ${MAX_DEPTH} 層`);
        if (!isRecord(cond)) throw new ConditionError('條件必須是物件');
        if ('all' in cond) {
            let ok = true;
            for (const c of this._list(cond.all, 'all')) {
                if (!this._explain(c, ctx, depth + 1, failed)) ok = false;
            }
            return ok;
        }
        if ('any' in cond) {
            const list = this._list(cond.any, 'any');
            const sub: Condition[] = [];
            const ok = list.some((c) => this._explain(c, ctx, depth + 1, sub));
            // any 通過時，內部失敗的分支不算缺項；沒通過時全部分支都是缺項
            if (!ok) failed.push(...sub);
            return ok;
        }
        if ('not' in cond) {
            const ok = !this._eval(cond.not as Condition, ctx, depth + 1);
            if (!ok) failed.push(cond);
            return ok;
        }
        const ok = this._eval(cond, ctx, depth);
        if (!ok) failed.push(cond);
        return ok;
    }

    private _list(value: unknown, key: string): Condition[] {
        if (!Array.isArray(value)) throw new ConditionError(`"${key}" 必須是陣列`);
        return value as Condition[];
    }

    private _validate(cond: unknown, path: string, depth: number): string[] {
        if (depth > MAX_DEPTH) return [`${path}: 巢狀超過 ${MAX_DEPTH} 層`];
        if (!isRecord(cond)) return [`${path}: 條件必須是物件`];
        if ('all' in cond || 'any' in cond) {
            const key = 'all' in cond ? 'all' : 'any';
            const list = cond[key];
            if (!Array.isArray(list)) return [`${path}.${key}: 必須是陣列`];
            return list.flatMap((c, i) => this._validate(c, `${path}.${key}[${i}]`, depth + 1));
        }
        if ('not' in cond) return this._validate(cond.not, `${path}.not`, depth + 1);
        if (typeof cond.kind !== 'string') return [`${path}: 缺少 kind`];
        if (!this._handlers.has(cond.kind)) return [`${path}: 未註冊的條件種類 "${cond.kind}"`];
        return [];
    }
}

/** 建立已掛好內建種類的評估器（每個呼叫端自己持有一份，避免互相污染註冊表） */
export function createConditionEvaluator<Ctx extends ConditionFacts = ConditionFacts>(): ConditionEvaluator<Ctx> {
    const evaluator = new ConditionEvaluator<Ctx>();
    evaluator.register('const', (c) => {
        if (typeof c.value !== 'boolean') throw new ConditionError('const 缺少布林欄位 "value"');
        return c.value;
    });
    evaluator.register('compare', (c, ctx) => {
        const fact = requireString(c, 'fact');
        const actual = ctx.getNumber?.(fact) ?? 0;
        return compareValues(actual, requireOp(c), requireNumber(c, 'value'));
    });
    evaluator.register('hasItem', (c, ctx) => {
        const need = c.count === undefined ? 1 : requireNumber(c, 'count');
        return (ctx.countItem?.(requireString(c, 'itemId')) ?? 0) >= need;
    });
    evaluator.register('flag', (c, ctx) => {
        const expect = c.value === undefined ? true : c.value === true;
        return (ctx.getFlag?.(requireString(c, 'key')) ?? false) === expect;
    });
    evaluator.register('rank', (c, ctx) => compareValues(ctx.getRank?.() ?? 0, requireOp(c), requireNumber(c, 'value')));
    return evaluator;
}
