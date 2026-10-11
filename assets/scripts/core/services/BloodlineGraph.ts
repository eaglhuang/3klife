// @spec-source → 血統理論系統.md (doc_spec_0011) §E #1 #4、結緣系統（配種）.md (doc_spec_0028) §K
import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';
/**
 * BloodlineGraph.ts
 *
 * 血統圖服務 — 從 PersonRegistry 提供祖先查詢、14 人祖譜、共同祖先距離、子嗣登記。
 *
 * Unity 對照：類似一個自定義的 Graph Traversal System，
 * 以 Dictionary<uid, PersonRecord> 取代嵌套 ScriptableObject 樹，
 * 等同於把 GameObject 樹壓平成 Adjacency List 的圖走訪問題。
 *
 * 記憶體優勢：
 *   5 代 500 位 + 2000 虛擬祖先，扁平結構 < 嵌套結構的 30% 記憶體使用量。
 *   （嵌套時每個節點含完整 GeneralConfig copy；扁平只存 uid + 輕量 PersonRecord）
 *
 * 純邏輯，不依賴 cc：person-registry.json 的讀取方式由外部用 setRegistryLoader() 注入
 * （正式環境由 ServiceLoader 接上 ResourceManager，測試直接 loadFromData()）。
 */

import { PersonRecord, BloodlineLink, PersonRegistryData } from '../models/PersonRegistry';

/** 14 人祖譜的位置代碼：F/M = 父母，FF..MM = 祖父母，FFF..MMM = 曾祖父母 */
export const PEDIGREE_SLOTS = [
  'F', 'M',
  'FF', 'FM', 'MF', 'MM',
  'FFF', 'FFM', 'FMF', 'FMM', 'MFF', 'MFM', 'MMF', 'MMM',
] as const;

export type PedigreeSlot = typeof PEDIGREE_SLOTS[number];

/** 每個位置對應的 uid；未知祖先為 null */
export type Pedigree = Record<PedigreeSlot, string | null>;

/** 位置代碼的長度就是世代（F = 1、FF = 2、FFF = 3） */
export function pedigreeSlotGeneration(slot: PedigreeSlot): 1 | 2 | 3 {
  return slot.length as 1 | 2 | 3;
}

export function createEmptyPedigree(): Pedigree {
  const pedigree = {} as Pedigree;
  for (const slot of PEDIGREE_SLOTS) pedigree[slot] = null;
  return pedigree;
}

export type RegistryLoader = () => Promise<PersonRegistryData | null>;

export class BloodlineGraph {
  private static _instance: BloodlineGraph | null = null;

  /** uid → PersonRecord 的快速索引 */
  private _persons: Map<string, PersonRecord> = new Map();
  /** child_uid → BloodlineLink[] 的出邊索引（向上查祖先） */
  private _parentLinks: Map<string, BloodlineLink[]> = new Map();
  /** parent_uid → BloodlineLink[] 的入邊索引（向下查後代） */
  private _childLinks: Map<string, BloodlineLink[]> = new Map();

  private _loaded = false;
  private _loader: RegistryLoader | null = null;

  static getInstance(): BloodlineGraph {
    if (!BloodlineGraph._instance) {
      BloodlineGraph._instance = new BloodlineGraph();
    }
    return BloodlineGraph._instance;
  }

  /** 是否已載入 */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /** 注入 person-registry.json 的讀取方式（正式環境走 ResourceManager） */
  setRegistryLoader(loader: RegistryLoader | null): void {
    this._loader = loader;
  }

  /** 透過注入的 loader 載入 person-registry.json */
  async loadRegistry(force = false): Promise<void> {
    if (this._loaded && !force) return;
    const data = this._loader ? await this._loader().catch(() => null) : null;
    if (!data) {
      UCUFLogger.warn(LogCategory.DATA, '[BloodlineGraph] person-registry.json 不存在、為空或尚未設定 loader。');
      this._loaded = true;
      return;
    }
    this.loadFromData(data);
  }

  /** 直接以資料重建索引（headless 測試與 loader 共用） */
  loadFromData(data: PersonRegistryData): void {
    this._persons.clear();
    this._parentLinks.clear();
    this._childLinks.clear();

    for (const p of data.persons ?? []) {
      this._persons.set(p.uid, p);
    }
    for (const link of data.links ?? []) {
      this._addLink(link);
    }

    this._loaded = true;
  }

  /**
   * 取得指定武將的祖先 uid 鏈（BFS 廣度優先，按世代排列）。
   * @param uid 武將 uid
   * @param depth 最大世代深度（預設 3，涵蓋 14 位祖先）
   * @returns 祖先 uid 陣列（含指定深度內所有祖先，由近至遠）
   */
  getAncestorChain(uid: string, depth = 3): string[] {
    const result: string[] = [];
    const queue: Array<{ uid: string; gen: number }> = [{ uid, gen: 0 }];
    const visited = new Set<string>([uid]);

    while (queue.length > 0) {
      const { uid: current, gen } = queue.shift()!;
      if (gen >= depth) continue;

      const parents = this._parentLinks.get(current) ?? [];
      for (const link of parents) {
        if (!visited.has(link.parent_uid)) {
          visited.add(link.parent_uid);
          result.push(link.parent_uid);
          queue.push({ uid: link.parent_uid, gen: gen + 1 });
        }
      }
    }

    return result;
  }

  /** 取得直系父母；relation 為 U 的連結依序補進空位 */
  getParents(uid: string): { father: string | null; mother: string | null } {
    let father: string | null = null;
    let mother: string | null = null;
    const unknown: string[] = [];
    for (const link of this._parentLinks.get(uid) ?? []) {
      if (link.relation === 'F' && !father) father = link.parent_uid;
      else if (link.relation === 'M' && !mother) mother = link.parent_uid;
      else unknown.push(link.parent_uid);
    }
    for (const parent of unknown) {
      if (!father) father = parent;
      else if (!mother) mother = parent;
    }
    return { father, mother };
  }

  /**
   * 依位置取得 14 人祖譜（F、M、FF…MMM）。
   * 與 getAncestorChain 不同：近親時同一位祖先會出現在多個位置，不會被去重，
   * 因此可直接拿來判定「14 人是否完全無重複」。
   */
  getPedigree(uid: string): Pedigree {
    const pedigree = createEmptyPedigree();
    for (const slot of PEDIGREE_SLOTS) {
      const parentSlot = slot.slice(0, -1);
      const childUid = parentSlot === '' ? uid : pedigree[parentSlot as PedigreeSlot];
      if (!childUid) continue;
      const parents = this.getParents(childUid);
      pedigree[slot] = slot.endsWith('F') ? parents.father : parents.mother;
    }
    return pedigree;
  }

  /**
   * 兩人在 maxGeneration 代內的最近共同祖先距離。
   * 距離定義為「共同祖先離兩人中較遠的那一邊的世代數」：兄弟姊妹 = 1、堂表親 = 2、再從 = 3；
   * 其中一人是另一人的祖先（例如父女）也算，距離為該祖先的世代數。
   * @returns 沒有交集時回傳 null
   */
  commonAncestorDistance(uidA: string, uidB: string, maxGeneration = 3): number | null {
    if (uidA === uidB) return 0;
    const depthA = this._ancestorDepths(uidA, maxGeneration);
    const depthB = this._ancestorDepths(uidB, maxGeneration);
    let best: number | null = null;
    for (const [ancestor, distA] of depthA) {
      const distB = depthB.get(ancestor);
      if (distB === undefined) continue;
      const distance = Math.max(distA, distB);
      if (best === null || distance < best) best = distance;
    }
    return best;
  }

  /**
   * 計算武將的血統 EP（根據 PersonRegistry 的 ep_base 遞迴加權）。
   * 公式：本人 ep_base + Σ(祖先 ep_base * 0.5^世代)
   * @param uid 武將 uid
   * @param maxDepth 計算深度（預設 3）
   */
  calculateEP(uid: string, maxDepth = 3): number {
    const person = this._persons.get(uid);
    if (!person) return 0;

    let totalEP = person.ep_base;
    const queue: Array<{ uid: string; gen: number }> = [{ uid, gen: 0 }];
    const visited = new Set<string>([uid]);

    while (queue.length > 0) {
      const { uid: current, gen } = queue.shift()!;
      if (gen >= maxDepth) continue;

      const parents = this._parentLinks.get(current) ?? [];
      for (const link of parents) {
        if (!visited.has(link.parent_uid)) {
          visited.add(link.parent_uid);
          const ancestor = this._persons.get(link.parent_uid);
          if (ancestor) {
            const weight = Math.pow(0.5, gen + 1);
            totalEP += ancestor.ep_base * weight;
          }
          queue.push({ uid: link.parent_uid, gen: gen + 1 });
        }
      }
    }

    return Math.round(totalEP);
  }

  /**
   * 取得指定武將的所有後代 uid 陣列。
   * @param uid 武將 uid
   * @param maxDepth 最大深度（預設 3）
   */
  getDescendants(uid: string, maxDepth = 3): string[] {
    const result: string[] = [];
    const queue: Array<{ uid: string; gen: number }> = [{ uid, gen: 0 }];
    const visited = new Set<string>([uid]);

    while (queue.length > 0) {
      const { uid: current, gen } = queue.shift()!;
      if (gen >= maxDepth) continue;

      const children = this._childLinks.get(current) ?? [];
      for (const link of children) {
        if (!visited.has(link.child_uid)) {
          visited.add(link.child_uid);
          result.push(link.child_uid);
          queue.push({ uid: link.child_uid, gen: gen + 1 });
        }
      }
    }

    return result;
  }

  /**
   * 依 uid 查詢 PersonRecord。
   */
  getPerson(uid: string): PersonRecord | null {
    return this._persons.get(uid) ?? null;
  }

  hasPerson(uid: string): boolean {
    return this._persons.has(uid);
  }

  /** 新增或覆寫一筆人物記錄（名冊武將不在 registry 時用） */
  upsertPerson(person: PersonRecord): void {
    this._persons.set(person.uid, person);
  }

  /**
   * 登記一位新生子嗣與父母連結。重複登記同一位子嗣時只更新記錄、不重複加邊。
   */
  registerChild(child: PersonRecord, fatherUid: string, motherUid: string): void {
    this._persons.set(child.uid, child);
    if ((this._parentLinks.get(child.uid) ?? []).length > 0) return;
    this._addLink({ child_uid: child.uid, parent_uid: fatherUid, relation: 'F', generation: 1 });
    this._addLink({ child_uid: child.uid, parent_uid: motherUid, relation: 'M', generation: 1 });
  }

  /**
   * 登記初代名將的虛擬祖先（VirtualAncestorGenerator 產出）。
   * 名將已經有父母連結（registry 或子嗣）時不動，回傳 false；已存在的人物記錄不覆寫。
   */
  registerFounderAncestry(founderUid: string, persons: PersonRecord[], links: BloodlineLink[]): boolean {
    if ((this._parentLinks.get(founderUid) ?? []).length > 0) return false;
    for (const person of persons) {
      if (!this._persons.has(person.uid)) this._persons.set(person.uid, person);
    }
    for (const link of links) this._addLink(link);
    return true;
  }

  /** 清除快取 */
  clear(): void {
    this._persons.clear();
    this._parentLinks.clear();
    this._childLinks.clear();
    this._loaded = false;
  }

  // ---- private helpers ----

  private _addLink(link: BloodlineLink): void {
    if (!this._parentLinks.has(link.child_uid)) {
      this._parentLinks.set(link.child_uid, []);
    }
    this._parentLinks.get(link.child_uid)!.push(link);

    if (!this._childLinks.has(link.parent_uid)) {
      this._childLinks.set(link.parent_uid, []);
    }
    this._childLinks.get(link.parent_uid)!.push(link);
  }

  /** 本人（距離 0）與 maxGeneration 代內所有祖先的最短距離 */
  private _ancestorDepths(uid: string, maxGeneration: number): Map<string, number> {
    const depths = new Map<string, number>([[uid, 0]]);
    let frontier = [uid];
    for (let gen = 1; gen <= maxGeneration; gen++) {
      const next: string[] = [];
      for (const current of frontier) {
        for (const link of this._parentLinks.get(current) ?? []) {
          if (!depths.has(link.parent_uid)) {
            depths.set(link.parent_uid, gen);
            next.push(link.parent_uid);
          }
        }
      }
      frontier = next;
    }
    return depths;
  }
}
