/**
 * QSymbolSystem.ts — 頭上生活符號管理器（WP2，QLIFE-01 第 5 章）
 *
 * 單一 tick 迴圈驅動所有符號；每顆頭（或兩人互動 pairSocket）一個項目。
 * - 資料驅動：活動 → 符號組 → 圖層動態，全在 q-symbol-groups.json。
 * - 預算：LOD 與預算每 0.25 秒重算（或有變動時），超量依距離降級，不新增節點。
 * - 節點池：子精靈只借還；池容量 = 預算的子精靈總上限。
 * - 不用粒子系統、不用 tween；驅動介面只要每幀 dt（IQSymbolClock），之後可接 WP1 管理器。
 *
 * 純邏輯，無 Cocos 依賴；畫面端實作 ISymbolSprite 即可（見 QSymbolLayer.ts）。
 */
import {
    allocateLods, BudgetItem, LOD2_ALPHA, LOD_RECALC_INTERVAL, lodForDistance, SYMBOL_BUDGETS, SymbolBudget,
} from './QSymbolBudget';
import { evalMotion } from './QSymbolMotion';
import {
    elementCount, mixTint, moodMultiplier, planElements, PlannedElement, resolvePart, Rgb, SYMBOL_BASE_SIZE_H,
} from './QSymbolData';
import { ISymbolSprite, SymbolSpritePool } from './QSymbolSprites';
import { IQSymbolClock, QSymbolData, SymbolDef, SymbolLod, SymbolTier } from './types';

/** 手動驅動的時鐘（測試與預覽用）：呼叫 advance(dt) 就推進一幀 */
export class ManualSymbolClock implements IQSymbolClock {
    private readonly subs = new Set<(dt: number) => void>();
    subscribe(cb: (dt: number) => void): () => void {
        this.subs.add(cb);
        return () => { this.subs.delete(cb); };
    }
    advance(dt: number): void {
        for (const cb of Array.from(this.subs)) cb(dt);
    }
    get subscriberCount(): number { return this.subs.size; }
}

export interface AddHeadOptions {
    /** 符號掛點（sockets.symbol）的像素座標 */
    x: number;
    y: number;
    /** 頭高（像素） */
    size: number;
    activity?: string | null;
    /** 副符號活動（只有高階機種會顯示） */
    subActivity?: string | null;
    /** 主兵器部件（S02 練武用） */
    weaponPart?: string;
    /** 相位種子：讓同活動的人不同步 */
    seed?: string | number;
}

interface PlannedDefEl extends PlannedElement {
    defIdx: number;
}

interface Entry {
    id: number;
    kind: 'head' | 'pair';
    x: number;
    y: number;
    size: number;
    onScreen: boolean;
    defs: SymbolDef[];
    weaponPart?: string;
    mood: number;
    angry: boolean;
    phase: number;
    lod: SymbolLod;
    plan: PlannedDefEl[];
    sprites: ISymbolSprite[];
    posDirty: boolean;
}

/** 字串／數字 → [0,1) 的確定性雜湊（FNV-1a） */
export function hash01(seed: string | number): number {
    const s = String(seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
}

const PHASE_SPAN_SEC = 10;

export class QSymbolSystem {
    readonly pool: SymbolSpritePool;
    private budget: SymbolBudget;
    private tierName: SymbolTier;
    private readonly entries = new Map<number, Entry>();
    private nextId = 1;
    private time = 0;
    private frame = 0;
    private recalcTimer = 0;
    private dirty = true;
    private focusX = 0;
    private focusY = 0;
    private screenWidth = 1920;
    private unsub: (() => void) | null = null;

    constructor(
        private readonly data: QSymbolData,
        factory: () => ISymbolSprite,
        tier: SymbolTier = 'mid',
        clock: IQSymbolClock | null = null,
    ) {
        this.tierName = tier;
        this.budget = SYMBOL_BUDGETS[tier];
        this.pool = new SymbolSpritePool(factory, this.budget.maxTotalSprites);
        if (clock) this.unsub = clock.subscribe((dt) => this.tick(dt));
    }

    get tier(): SymbolTier { return this.tierName; }
    get now(): number { return this.time; }
    get entryCount(): number { return this.entries.size; }

    setTier(tier: SymbolTier): void {
        this.tierName = tier;
        this.budget = SYMBOL_BUDGETS[tier];
        this.pool.setCapacity(Math.max(this.pool.created, this.budget.maxTotalSprites));
        this.dirty = true;
    }

    setFocus(x: number, y: number, screenWidth: number): void {
        this.focusX = x;
        this.focusY = y;
        this.screenWidth = screenWidth > 0 ? screenWidth : 1;
        this.dirty = true;
    }

    addHead(o: AddHeadOptions): number {
        const e = this.newEntry('head', o.x, o.y, o.size, hash01(o.seed ?? this.nextId) * PHASE_SPAN_SEC);
        e.weaponPart = o.weaponPart;
        this.entries.set(e.id, e);
        this.setHeadActivity(e.id, o.activity ?? null, o.subActivity ?? null);
        return e.id;
    }

    /** 兩人互動符號：掛 pairSocket（兩人錨點中點），單一元素、占 1 個符號名額 */
    addPair(kind: string, x: number, y: number, size: number): number {
        const def = this.data.pairs[kind];
        if (!def) throw new Error(`未知互動符號 ${kind}`);
        const e = this.newEntry('pair', x, y, size, hash01(`pair:${kind}:${this.nextId}`) * PHASE_SPAN_SEC);
        e.defs = [def];
        this.entries.set(e.id, e);
        this.replan(e);
        this.dirty = true;
        return e.id;
    }

    setHeadActivity(id: number, activity: string | null, subActivity: string | null = null): void {
        const e = this.must(id);
        const defs: SymbolDef[] = [];
        const main = activity ? this.data.activities[activity] : undefined;
        if (activity && !main) throw new Error(`未知活動 ${activity}`);
        if (main) defs.push(this.data.symbols[main.symbol]);
        if (subActivity && main && this.budget.mainPerHead >= 2) {
            const sub = this.data.activities[subActivity];
            if (!sub) throw new Error(`未知活動 ${subActivity}`);
            defs.push(this.data.symbols[sub.symbol]);
        }
        this.releaseAll(e);
        e.defs = defs;
        this.replan(e);
        this.dirty = true;
    }

    move(id: number, x: number, y: number, size?: number): void {
        const e = this.must(id);
        if (e.x === x && e.y === y && (size === undefined || size === e.size)) return;
        e.x = x;
        e.y = y;
        if (size !== undefined) e.size = size;
        e.posDirty = true;
    }

    setMood(id: number, mood: number, angry = false): void {
        const e = this.must(id);
        e.mood = mood;
        e.angry = angry;
        e.posDirty = true;
    }

    setOnScreen(id: number, onScreen: boolean): void {
        const e = this.must(id);
        if (e.onScreen !== onScreen) {
            e.onScreen = onScreen;
            this.dirty = true;
        }
    }

    remove(id: number): void {
        const e = this.entries.get(id);
        if (!e) return;
        this.releaseAll(e);
        this.entries.delete(id);
        this.dirty = true;
    }

    lodOf(id: number): SymbolLod { return this.must(id).lod; }
    spriteCountOf(id: number): number { return this.must(id).sprites.length; }

    /** 目前所有項目用掉的子精靈總數 */
    get totalSprites(): number {
        let n = 0;
        this.entries.forEach((e) => { n += e.sprites.length; });
        return n;
    }

    /** 同畫面完整動畫（LOD0）的符號數 */
    get animatedCount(): number {
        let n = 0;
        this.entries.forEach((e) => { if (e.lod === 0 && e.defs.length > 0) n++; });
        return n;
    }

    tick(dt: number): void {
        this.time += dt;
        this.frame++;
        this.recalcTimer += dt;
        if (this.dirty || this.recalcTimer >= LOD_RECALC_INTERVAL) {
            this.rebalance();
            this.recalcTimer = 0;
            this.dirty = false;
        }
        this.entries.forEach((e) => this.drive(e));
    }

    dispose(): void {
        if (this.unsub) this.unsub();
        this.unsub = null;
        this.entries.forEach((e) => this.releaseAll(e));
        this.entries.clear();
    }

    // ------------------------------------------------------------ 內部

    private newEntry(kind: 'head' | 'pair', x: number, y: number, size: number, phase: number): Entry {
        return {
            id: this.nextId++, kind, x, y, size, onScreen: true, defs: [], mood: 0, angry: false, phase,
            lod: 0, plan: [], sprites: [], posDirty: true,
        };
    }

    private must(id: number): Entry {
        const e = this.entries.get(id);
        if (!e) throw new Error(`未知符號項目 ${id}`);
        return e;
    }

    private replan(e: Entry): void {
        e.plan = [];
    }

    private releaseAll(e: Entry): void {
        for (const s of e.sprites) this.pool.release(s);
        e.sprites = [];
        e.plan = [];
    }

    /** 各 LOD 需要的子精靈數（預算用）。副符號只在 LOD0 算 */
    private costs(e: Entry): [number, number, number] {
        const max = this.budget.maxSubPerSymbol;
        const main = e.defs[0];
        if (!main) return [0, 0, 0];
        const sub = e.defs[1];
        return [
            elementCount(main, max, 0) + (sub ? elementCount(sub, max, 0) : 0),
            elementCount(main, max, 1),
            elementCount(main, max, 2),
        ];
    }

    private planFor(e: Entry, lod: SymbolLod): PlannedDefEl[] {
        const out: PlannedDefEl[] = [];
        const max = this.budget.maxSubPerSymbol;
        const upto = lod === 0 ? e.defs.length : Math.min(1, e.defs.length);
        for (let d = 0; d < upto; d++) {
            for (const el of planElements(e.defs[d], max, lod)) out.push({ ...el, defIdx: d });
        }
        return out;
    }

    private rebalance(): void {
        const items: BudgetItem[] = [];
        this.entries.forEach((e) => {
            if (e.defs.length === 0) return;
            const dist = Math.hypot(e.x - this.focusX, e.y - this.focusY) / this.screenWidth;
            items.push({ id: e.id, dist, wantLod: lodForDistance(dist, e.onScreen), sprites: this.costs(e) });
        });
        const lods = allocateLods(items, this.budget);
        // 先全部還，再借，避免交換時暫時超量
        const targets = new Map<number, PlannedDefEl[]>();
        this.entries.forEach((e) => {
            if (e.defs.length === 0) { e.lod = 3; return; }
            const lod = lods.get(e.id) as SymbolLod;
            const plan = this.planFor(e, lod);
            targets.set(e.id, plan);
            e.lod = lod;
            while (e.sprites.length > plan.length) this.pool.release(e.sprites.pop() as ISymbolSprite);
        });
        this.entries.forEach((e) => {
            const plan = targets.get(e.id);
            if (!plan) return;
            while (e.sprites.length < plan.length) {
                const s = this.pool.acquire();
                if (!s) break;
                e.sprites.push(s);
            }
            e.plan = plan.slice(0, e.sprites.length);
            e.posDirty = true;
        });
    }

    private drive(e: Entry): void {
        if (e.sprites.length === 0 || e.lod === 3) return;
        if (e.lod === 2) {
            if (!e.posDirty) return;
            this.apply(e, 0);
        } else if (e.lod === 1) {
            if (!e.posDirty && (this.frame + e.id) % 2 !== 0) return;
            this.apply(e, this.time + e.phase);
        } else {
            this.apply(e, this.time + e.phase);
        }
        e.posDirty = false;
    }

    private apply(e: Entry, t: number): void {
        const mul: Rgb = e.kind === 'head' ? moodMultiplier(e.mood, e.angry) : [1, 1, 1];
        const alphaMul = e.lod === 2 ? LOD2_ALPHA : 1;
        for (let k = 0; k < e.plan.length; k++) {
            const el = e.plan[k];
            const def = e.defs[el.defIdx];
            const layer = def.layers[el.layerIdx];
            const st = evalMotion(layer, el.i, el.n, t, resolvePart(def, el, e.weaponPart));
            const c = mixTint(layer.tint ?? def.tint, mul);
            const px = e.size * SYMBOL_BASE_SIZE_H;
            e.sprites[k].show(
                st.part, e.x + st.x * e.size, e.y + st.y * e.size, st.scaleX * px, st.scaleY * px,
                st.rot, st.alpha * alphaMul, st.flipX, c[0], c[1], c[2],
            );
        }
    }
}
