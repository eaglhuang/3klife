// @spec-source → 新手開場規格書.md §7.2、血統理論系統.md §F §I、名將虛擬祖先生成器規格.md (doc_spec_0072) §2~§5
/**
 * VirtualAncestorGenerator — 初代名將的 14 位虛擬祖先（始祖溯源），純邏輯，不依賴 cc
 *
 * 規格重點：
 * - 沒有父母的初代名將，自動補齊上三代 14 個祖先位（F、M、FF…MMM）
 * - ID：V_PID_{GeneralID}_{Position}（例：V_PID_zhao-yun_FF）
 * - 祖先地域受出生地限制，不能亂生（張飛偏北境、孫策偏吳越江淮）
 * - 因子色系權重：G1 藍 50% / 綠 50%；G2 藍 40% / 粉 30% / 白 30%；G3 藍 20% / 白 80%
 * - 星等：G1 ★3 80% / ★4 20%；G2 ★2 70% / ★3 30%；G3 ★1 90% / ★2 10%
 * - 標籤映射：父系一代偏向繼承名將本身的因子，母系一代補足次要特質；祖輩開始出現地域因子
 * - 主屬性回溯：武力 > 90 → 祖輩必帶勇猛、體魄；智力 > 90 → 祖輩必帶謀略
 * - 14 個位置中隨機挑 1 個位點帶變異因子
 * - 顯示名稱：父系「[地域] 某姓氏長輩」，母系「[地域] 某氏遺風」
 *
 * 暫定（規格沒寫，PROG-2-0067）：
 * - 出生地：先看 birthRegion 參數，再從 historicalAnecdote 開頭 80 字找最早出現的州名或郡縣名，最後依勢力給預設州
 * - 地域分六區（北境、中原、吳越、荊楚、巴蜀、西涼）；父系祖先只在本區內，母系 70% 本區、30% 相鄰區
 * - 地域因子（粉）：北境 / 西涼 / 中原 = 騎兵適性、神速；吳越 / 荊楚 = 水戰適性；巴蜀 = 山地、林地適性
 * - 核心標籤 = 武將 genes + 指定的核心因子（registry gene_refs）+ 五維 ≥ 80 推導（武勇、謀略、號令、治世、義勇、福運）
 * - 「冷靜」因子字典沒有，智力回溯只補謀略
 * - 變異因子取紫色（天命 / 福運），因子標記 mutation
 * - 虛擬祖先 ep_base 固定 48；地域不寫進 core_tags，避免所有初代名將都吃到血脈共鳴
 * - 預設亂數以武將 id 為種子，同一位武將每次生成結果相同（讀檔後重建也一致）
 *
 * Unity 對照：像一個 static class ProgenitorTrace.Generate(general, dictionary)，
 * 回傳 14 個 ScriptableObject 資料，由 BloodlineGraph 登記進族譜。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import type { BloodlineLink, PersonRecord } from '../models/PersonRegistry';
import { PEDIGREE_SLOTS, PedigreeSlot, pedigreeSlotGeneration } from '../services/BloodlineGraph';
import { FactorColor, FactorDictionary, resolveFactorColor } from './FactorInheritance';
import type { RandomSource } from './GeneralAging';
import { SeededRandom } from './SeededRandom';

export const VIRTUAL_ANCESTOR_PREFIX = 'V_PID_';
export const VIRTUAL_ANCESTOR_EP_BASE = 48;

export type AncestorRegion = 'north' | 'central' | 'wuyue' | 'jingchu' | 'bashu' | 'xiliang';

export const REGION_NAMES: Readonly<Record<AncestorRegion, string>> = {
    north: '北境',
    central: '中原',
    wuyue: '吳越',
    jingchu: '荊楚',
    bashu: '巴蜀',
    xiliang: '西涼',
};

/** 州 → 地域 */
export const PROVINCE_REGION: Readonly<Record<string, AncestorRegion>> = {
    幽州: 'north', 并州: 'north', 冀州: 'north',
    司隸: 'central', 豫州: 'central', 兗州: 'central', 青州: 'central', 徐州: 'central',
    揚州: 'wuyue',
    荊州: 'jingchu', 交州: 'jingchu',
    益州: 'bashu',
    涼州: 'xiliang', 雍州: 'xiliang',
};

/** 相鄰地域（母系祖先可能來自這裡） */
export const REGION_NEIGHBORS: Readonly<Record<AncestorRegion, readonly AncestorRegion[]>> = {
    north: ['central', 'xiliang'],
    central: ['north', 'wuyue', 'jingchu', 'xiliang'],
    wuyue: ['central', 'jingchu'],
    jingchu: ['central', 'wuyue', 'bashu'],
    bashu: ['jingchu', 'xiliang'],
    xiliang: ['north', 'central', 'bashu'],
};

/** 地域因子（粉色適性） */
export const REGION_FACTORS: Readonly<Record<AncestorRegion, readonly string[]>> = {
    north: ['gene_cavalry', 'gene_dash'],
    central: ['gene_cavalry', 'gene_dash'],
    wuyue: ['gene_naval'],
    jingchu: ['gene_naval'],
    bashu: ['gene_mountain', 'gene_forest'],
    xiliang: ['gene_cavalry', 'gene_dash'],
};

/** 簡體 / 異體字 → 正體州名 */
const PROVINCE_ALIASES: Readonly<Record<string, string>> = {
    幷州: '并州', 兖州: '兗州', 扬州: '揚州', 荆州: '荊州', 凉州: '涼州', 司隶: '司隸',
};

/** 史料常見郡縣 → 州（historicalAnecdote 沒寫州名時用） */
const COMMANDERY_PROVINCE: ReadonlyArray<readonly [string, string]> = [
    ['涿', '幽州'], ['范陽', '幽州'], ['漁陽', '幽州'], ['右北平', '幽州'], ['遼東', '幽州'], ['遼西', '幽州'], ['辽东', '幽州'], ['渔阳', '幽州'],
    ['太原', '并州'], ['五原', '并州'], ['雁門', '并州'], ['雁门', '并州'], ['上黨', '并州'], ['上党', '并州'], ['西河', '并州'],
    ['河間', '冀州'], ['河间', '冀州'], ['常山', '冀州'], ['鉅鹿', '冀州'], ['巨鹿', '冀州'], ['渤海', '冀州'], ['清河', '冀州'], ['魏郡', '冀州'], ['中山', '冀州'], ['安平', '冀州'], ['趙國', '冀州'], ['赵国', '冀州'],
    ['潁川', '豫州'], ['颍川', '豫州'], ['汝南', '豫州'], ['沛', '豫州'], ['譙', '豫州'], ['谯', '豫州'], ['梁國', '豫州'], ['陳國', '豫州'],
    ['陳留', '兗州'], ['陈留', '兗州'], ['山陽', '兗州'], ['山阳', '兗州'], ['東郡', '兗州'], ['东郡', '兗州'], ['泰山', '兗州'], ['濟陰', '兗州'], ['任城', '兗州'],
    ['北海', '青州'], ['東萊', '青州'], ['东莱', '青州'], ['平原', '青州'], ['樂安', '青州'], ['濟南', '青州'], ['济南', '青州'],
    ['琅邪', '徐州'], ['琅琊', '徐州'], ['下邳', '徐州'], ['彭城', '徐州'], ['東海', '徐州'], ['东海', '徐州'], ['廣陵', '徐州'], ['广陵', '徐州'], ['臨淮', '徐州'],
    ['河內', '司隸'], ['河内', '司隸'], ['河東', '司隸'], ['河东', '司隸'], ['弘農', '司隸'], ['弘农', '司隸'], ['京兆', '司隸'], ['洛陽', '司隸'], ['洛阳', '司隸'], ['河南尹', '司隸'],
    ['吳郡', '揚州'], ['吴郡', '揚州'], ['會稽', '揚州'], ['会稽', '揚州'], ['廬江', '揚州'], ['庐江', '揚州'], ['九江', '揚州'], ['丹陽', '揚州'], ['丹阳', '揚州'], ['豫章', '揚州'], ['吳縣', '揚州'], ['富春', '揚州'],
    ['南陽', '荊州'], ['南阳', '荊州'], ['義陽', '荊州'], ['义阳', '荊州'], ['襄陽', '荊州'], ['襄阳', '荊州'], ['江夏', '荊州'], ['南郡', '荊州'], ['長沙', '荊州'], ['长沙', '荊州'], ['零陵', '荊州'], ['桂陽', '荊州'], ['武陵', '荊州'],
    ['交趾', '交州'], ['南海', '交州'], ['蒼梧', '交州'], ['苍梧', '交州'],
    ['巴郡', '益州'], ['巴西', '益州'], ['蜀郡', '益州'], ['犍為', '益州'], ['犍为', '益州'], ['廣漢', '益州'], ['广汉', '益州'], ['建寧', '益州'], ['永昌', '益州'], ['南中', '益州'], ['漢中', '益州'], ['汉中', '益州'],
    ['武威', '涼州'], ['隴西', '涼州'], ['陇西', '涼州'], ['天水', '涼州'], ['金城', '涼州'], ['西涼', '涼州'], ['西凉', '涼州'], ['扶風', '雍州'], ['扶风', '雍州'], ['馮翊', '雍州'],
];

/** 讀不到出生地時依勢力給的預設州 */
const FACTION_DEFAULT_PROVINCE: Readonly<Record<string, string>> = {
    wei: '豫州', shu: '益州', wu: '揚州',
};
const FALLBACK_PROVINCE = '司隸';
/** 史料只掃開頭這麼多字找籍貫 */
const BIRTHPLACE_SCAN_LENGTH = 80;

/** 複姓（取顯示用姓氏） */
const COMPOUND_SURNAMES = ['夏侯', '諸葛', '司馬', '公孫', '太史', '皇甫', '歐陽', '上官', '令狐', '東方', '尉遲', '長孫', '宇文', '慕容', '鍾離', '呼延', '軻比', '诸葛', '司马', '公孙'];

/** 各世代主因子的色系權重 */
export const ANCESTOR_COLOR_WEIGHTS: Readonly<Record<1 | 2 | 3, ReadonlyArray<readonly [FactorColor, number]>>> = {
    1: [['blue', 0.5], ['green', 0.5]],
    2: [['blue', 0.4], ['pink', 0.3], ['white', 0.3]],
    3: [['blue', 0.2], ['white', 0.8]],
};

/** 各世代星等：[低星, 高星, 高星機率] */
export const ANCESTOR_STAR_DISTRIBUTION: Readonly<Record<1 | 2 | 3, { low: number; high: number; highRate: number }>> = {
    1: { low: 3, high: 4, highRate: 0.2 },
    2: { low: 2, high: 3, highRate: 0.3 },
    3: { low: 1, high: 2, highRate: 0.1 },
};

/** 父系一代承襲名將自身因子的比例（規格：繼承名將 70% 的標籤特質） */
export const PATERNAL_TAG_RATE = 0.7;

/** 主屬性回溯門檻與祖輩必帶因子 */
export const BACKTRACK_STAT_THRESHOLD = 90;
export const STR_BACKTRACK_FACTORS = ['gene_bravery', 'gene_vitality'] as const;
export const INT_BACKTRACK_FACTORS = ['gene_strategy'] as const;

/** 五維推導核心因子的門檻（武將沒有因子資料時，仍能做標籤映射） */
export const CORE_STAT_THRESHOLD = 80;
const STAT_CORE_FACTORS: ReadonlyArray<readonly ['str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk', string]> = [
    ['str', 'gene_bravery'], ['int', 'gene_strategy'], ['lea', 'gene_command'],
    ['pol', 'gene_politics'], ['cha', 'gene_honor'], ['luk', 'gene_luck'],
];

/** 名將的核心因子：武將 genes、指定的核心因子、五維 ≥ 80 推導的因子 */
export function deriveCoreFactorIds(general: GeneralConfig, extra: readonly string[] = []): string[] {
    const ids: string[] = [];
    const add = (id: string | undefined) => { if (id && !ids.includes(id)) ids.push(id); };
    for (const gene of general.genes ?? []) add(gene.id);
    for (const id of extra) add(id);
    for (const [stat, id] of STAT_CORE_FACTORS) {
        if ((general[stat] ?? 0) >= CORE_STAT_THRESHOLD) add(id);
    }
    return ids;
}

/** 變異位點可抽的因子 */
export const MUTATION_FACTORS = ['gene_destiny', 'gene_luck'] as const;

export interface VirtualAncestorFactor {
    id: string;
    color: FactorColor;
    level: number;
    /** 變異位點帶的因子 */
    mutation?: boolean;
}

export interface VirtualAncestor {
    uid: string;
    slot: PedigreeSlot;
    generation: 1 | 2 | 3;
    gender: '男' | '女';
    /** 祖先所在的州 */
    province: string;
    region: AncestorRegion;
    name: string;
    factors: VirtualAncestorFactor[];
}

export interface VirtualAncestry {
    generalId: string;
    birthProvince: string;
    birthRegion: AncestorRegion;
    ancestors: VirtualAncestor[];
    /** 帶變異因子的位置 */
    mutationSlot: PedigreeSlot;
}

export interface VirtualAncestorOptions {
    dictionary?: FactorDictionary;
    /** 指定出生州（例：'幽州'），優先於史料推斷 */
    birthRegion?: string;
    /** 名將的核心因子（例：person-registry 的 gene_refs）；與武將 genes、五維推導的因子合併 */
    coreFactorIds?: readonly string[];
    /** 地域人才庫：地域 → 該地名將身上的因子 id */
    regionalTalent?: Partial<Record<AncestorRegion, readonly string[]>>;
    /** 不給時以武將 id 為種子 */
    random?: RandomSource;
}

export function virtualAncestorUid(generalId: string, slot: PedigreeSlot): string {
    return `${VIRTUAL_ANCESTOR_PREFIX}${generalId}_${slot}`;
}

export function isVirtualAncestorUid(uid: string): boolean {
    return uid.startsWith(VIRTUAL_ANCESTOR_PREFIX);
}

function normalizeProvince(value: string): string | null {
    const name = PROVINCE_ALIASES[value] ?? value;
    return name in PROVINCE_REGION ? name : null;
}

/** 推斷出生州：指定值 → 史料最早出現的州名 → 郡縣名 → 勢力預設 */
export function resolveBirthProvince(
    general: Pick<GeneralConfig, 'faction'> & { historicalAnecdote?: string },
    explicit?: string,
): string {
    if (explicit) {
        const name = normalizeProvince(explicit);
        if (name) return name;
    }
    // 籍貫通常寫在第一句；只看開頭，避免抓到後文征戰的地名
    const text = (general.historicalAnecdote ?? '').slice(0, BIRTHPLACE_SCAN_LENGTH);
    let best: { province: string; index: number } | null = null;
    const consider = (needle: string, province: string) => {
        const index = text.indexOf(needle);
        if (index >= 0 && (!best || index < best.index)) best = { province, index };
    };
    for (const name of [...Object.keys(PROVINCE_REGION), ...Object.keys(PROVINCE_ALIASES)]) {
        consider(name, normalizeProvince(name)!);
    }
    for (const [needle, province] of COMMANDERY_PROVINCE) consider(needle, province);
    const found = best as { province: string; index: number } | null;
    if (found) return found.province;
    return FACTION_DEFAULT_PROVINCE[general.faction ?? ''] ?? FALLBACK_PROVINCE;
}

export function surnameOf(name: string | undefined): string {
    const text = (name ?? '').trim();
    if (!text) return '某';
    const compound = COMPOUND_SURNAMES.find((s) => text.startsWith(s));
    return compound ?? text.charAt(0);
}

function seedFromId(id: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

function pickWeighted<T>(entries: ReadonlyArray<readonly [T, number]>, random: RandomSource): T | null {
    const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    if (total <= 0) return null;
    let roll = random() * total;
    for (const [value, weight] of entries) {
        roll -= Math.max(0, weight);
        if (roll < 0) return value;
    }
    return entries[entries.length - 1][0];
}

function provincesIn(region: AncestorRegion): string[] {
    return Object.keys(PROVINCE_REGION).filter((p) => PROVINCE_REGION[p] === region);
}

function rollStar(generation: 1 | 2 | 3, random: RandomSource): number {
    const dist = ANCESTOR_STAR_DISTRIBUTION[generation];
    return random() < dist.highRate ? dist.high : dist.low;
}

/** 純父系（F、FF、FFF）承襲名將的姓氏 */
function isSurnameLine(slot: PedigreeSlot): boolean {
    return /^F+$/.test(slot);
}

const SURNAME_TITLES: Readonly<Record<1 | 2 | 3, string>> = { 1: '長輩', 2: '祖輩', 3: '先祖' };

/**
 * 為初代名將產生 14 位虛擬祖先。純函式：不改傳入武將，同一武將（預設亂數）結果固定。
 */
export function generateVirtualAncestry(
    general: GeneralConfig & { historicalAnecdote?: string },
    options: VirtualAncestorOptions = {},
): VirtualAncestry {
    const random = options.random ?? (() => { const rng = new SeededRandom(seedFromId(general.id)); return () => rng.next(); })();
    const dictionary = options.dictionary;
    const birthProvince = resolveBirthProvince(general, options.birthRegion);
    const birthRegion = PROVINCE_REGION[birthProvince];
    const surname = surnameOf(general.name);

    const colorOf = (id: string, gene?: GeneralGeneConfig): FactorColor | null => resolveFactorColor(id, dictionary, gene);

    // 名將本身的因子（標籤映射來源）
    const own = new Map<string, FactorColor>();
    for (const id of deriveCoreFactorIds(general, options.coreFactorIds)) {
        const color = colorOf(id, (general.genes ?? []).find((gene) => gene.id === id));
        if (color) own.set(id, color);
    }
    // 字典裡可用的因子（隱藏因子 resolveFactorColor 回傳 null，自然排除）
    const pool = new Map<string, FactorColor>();
    for (const def of Array.from(dictionary?.values() ?? [])) {
        const color = colorOf(def.id);
        if (color) pool.set(def.id, color);
    }
    // 沒有字典時，至少讓地域因子可用
    if (!dictionary) {
        for (const region of Object.keys(REGION_FACTORS) as AncestorRegion[]) {
            for (const id of REGION_FACTORS[region]) if (!pool.has(id)) pool.set(id, 'pink');
        }
    }
    own.forEach((color, id) => { if (!pool.has(id)) pool.set(id, color); });

    const ancestors: VirtualAncestor[] = [];
    for (const slot of PEDIGREE_SLOTS) {
        const generation = pedigreeSlotGeneration(slot);
        const paternal = slot.charAt(0) === 'F';

        // 地域：父系只在本區，母系 70% 本區、30% 相鄰區
        const region: AncestorRegion = paternal || random() < 0.7
            ? birthRegion
            : (REGION_NEIGHBORS[birthRegion][Math.floor(random() * REGION_NEIGHBORS[birthRegion].length)] ?? birthRegion);
        const provinces = provincesIn(region);
        const province = region === birthRegion && (paternal ? random() < 0.6 : random() < 0.4)
            ? birthProvince
            : provinces[Math.floor(random() * provinces.length)] ?? birthProvince;

        // 主因子：先依世代權重決定色系，再依標籤映射 / 地域 / 字典加權抽因子
        const color = pickWeighted(ANCESTOR_COLOR_WEIGHTS[generation], random);
        const regional = new Set([...REGION_FACTORS[region], ...(options.regionalTalent?.[region] ?? [])]);
        const ownOfColor: string[] = [];
        const candidates: Array<readonly [string, number]> = [];
        pool.forEach((c, id) => {
            if (c !== color) return;
            if (own.has(id)) ownOfColor.push(id);
            let weight = 1;
            if (own.has(id)) weight = generation === 1 ? (paternal ? 0 : 1) : 2;
            else if (generation === 1 && !paternal) weight = 2; // 母系一代補足名將沒有的次要特質
            if (regional.has(id)) weight += generation === 1 ? 1 : 3;
            candidates.push([id, weight]);
        });
        // 父系一代：70% 直接承襲名將自身同色因子（血脈最純）
        const inheritOwn = generation === 1 && paternal && ownOfColor.length > 0
            && (random() < PATERNAL_TAG_RATE || candidates.every(([, w]) => w <= 0));
        const factorId = inheritOwn
            ? ownOfColor[Math.floor(random() * ownOfColor.length)]
            : pickWeighted(candidates, random);
        const factors: VirtualAncestorFactor[] = [];
        if (factorId && color) factors.push({ id: factorId, color, level: rollStar(generation, random) });

        const name = isSurnameLine(slot)
            ? `${province} ${surname}氏${SURNAME_TITLES[generation]}`
            : `${province} 某氏遺風`;
        ancestors.push({
            uid: virtualAncestorUid(general.id, slot),
            slot,
            generation,
            gender: slot.charAt(slot.length - 1) === 'F' ? '男' : '女',
            province,
            region,
            name,
            factors,
        });
    }

    // 主屬性回溯：祖輩（G2）必帶對應因子，依序放進還沒有這個因子的祖輩
    const grandparents = ancestors.filter((a) => a.generation === 2);
    const required: string[] = [];
    if ((general.str ?? 0) > BACKTRACK_STAT_THRESHOLD) required.push(...STR_BACKTRACK_FACTORS);
    if ((general.int ?? 0) > BACKTRACK_STAT_THRESHOLD) required.push(...INT_BACKTRACK_FACTORS);
    let cursor = 0;
    for (const id of required) {
        const color = pool.get(id) ?? colorOf(id);
        if (!color || grandparents.some((a) => a.factors.some((f) => f.id === id))) continue;
        const target = grandparents[cursor++ % grandparents.length];
        target.factors.push({ id, color, level: rollStar(2, random) });
    }

    // 變異位點：14 位中隨機 1 位多帶一個紫色因子
    const mutationSlot = PEDIGREE_SLOTS[Math.floor(random() * PEDIGREE_SLOTS.length)] ?? 'F';
    const mutant = ancestors.find((a) => a.slot === mutationSlot)!;
    const mutationChoices = MUTATION_FACTORS.filter((id) => (pool.get(id) ?? colorOf(id)) && !mutant.factors.some((f) => f.id === id));
    if (mutationChoices.length > 0) {
        const id = mutationChoices[Math.floor(random() * mutationChoices.length)];
        mutant.factors.push({ id, color: (pool.get(id) ?? colorOf(id))!, level: rollStar(mutant.generation, random), mutation: true });
    }

    return { generalId: general.id, birthProvince, birthRegion, ancestors, mutationSlot };
}

/** 轉成血統圖用的人物記錄與親子連結（連結 generation = 親代相對名將的世代） */
export function toRegistryEntries(
    ancestry: VirtualAncestry,
    faction = 'unknown',
): { persons: PersonRecord[]; links: BloodlineLink[] } {
    const persons: PersonRecord[] = ancestry.ancestors.map((a) => ({
        uid: a.uid,
        template_id: null,
        name: a.name,
        gender: a.gender,
        gene_refs: a.factors.map((f) => f.id),
        ep_base: VIRTUAL_ANCESTOR_EP_BASE,
        faction,
        is_virtual: true,
    }));
    const uidOf = new Map(ancestry.ancestors.map((a) => [a.slot as string, a.uid]));
    const links: BloodlineLink[] = ancestry.ancestors.map((a) => {
        const childSlot = a.slot.slice(0, -1);
        return {
            child_uid: childSlot === '' ? ancestry.generalId : uidOf.get(childSlot)!,
            parent_uid: a.uid,
            relation: a.slot.charAt(a.slot.length - 1) === 'F' ? 'F' : 'M',
            generation: a.generation,
        };
    });
    return { persons, links };
}
