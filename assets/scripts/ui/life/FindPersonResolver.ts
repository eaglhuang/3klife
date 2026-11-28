// @spec-source → Q版社會總規格書 QSOC-01 第 4.3 節（搜尋武將）、第 5.2 節（情報等級）；PROG-2-10212
/**
 * FindPersonResolver — 「找人」分頁：依情報等級決定每位武將顯示什麼（純邏輯，不依賴 cc）
 *
 * 職責：intel 值換等級、熟人例外（+1 級、上限 Lv5）、搜尋（名、拼音、勢力、官職）、
 *       把「武將實際所在」過濾成該等級看得到的內容與可跳的目標。
 * 不負責：武將真正在哪個場景（WP3 作息引擎提供；本包只收假資料）、情報值怎麼升（QSOC-01 第 5.3 節）。
 * 重點：低等級的結果「不帶」不該知道的欄位（Lv0 沒有 sceneId、Lv1 沒有場景），避免 UI 誤顯示洩漏。
 */
import type { SceneRegistry } from './SceneRegistry';

export type IntelLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** intel 值門檻（QSOC-01 第 5.2 節，PM 暫定；正式值日後由 life-intel-levels.json 提供） */
export const DEFAULT_INTEL_THRESHOLDS: readonly number[] = [0, 10, 25, 45, 65, 85];

/** 自家家臣在此等級（含）以下，位置與活動都不可見 */
export const VASSAL_HIDDEN_MAX_LEVEL = 2;

/** 友誼達此值（含）以上視為熟人 */
export const ACQUAINTANCE_FRIENDSHIP = 30;

export interface FindPersonEntry {
    generalId: string;
    name: string;
    pinyin: string;
    faction: string;
    office: string;
    /** 友誼值（-100～100） */
    friendship: number;
    hasBond: boolean;
    /** 此刻實際所在場景（WP3 提供，這裡先吃假資料） */
    sceneId: string;
    /** 此刻活動（符號組 id，例如 S04） */
    activityId: string;
    /** 下一時段預測場景 */
    nextSceneId?: string;
    /** 自家家臣（QSOC-01 第 5.2 節，使用者 11/28 裁決：身分永遠可見，位置與活動仍受情報等級限制） */
    isOwnVassal?: boolean;
}

/** 要跳去哪：focus=center 鏡頭置中、actor 對焦該武將、none 不特別對焦 */
export interface FindJumpTarget {
    sceneId: string;
    focus: 'center' | 'actor' | 'none';
}

export interface FindResultView {
    generalId: string;
    name: string;
    /** 實際套用的等級（含熟人加成） */
    level: IntelLevel;
    friendBoost: boolean;
    /** 「在哪」文字的 i18n key 與參數 key（參數是要再翻譯的 i18n key） */
    locationTextKey: string;
    locationArgKeys: string[];
    /** Lv2 場景名後面的「？」符號 */
    questionMark: boolean;
    showAvatar: boolean;
    /** Lv4 以上才有 */
    activityId?: string;
    /** Lv5 才有（下一時段預測） */
    nextSceneNameKey?: string;
    /** null＝這個等級沒有可跳的地方（Lv0） */
    jump: FindJumpTarget | null;
}

export function intelLevelFromValue(intel: number, thresholds: readonly number[] = DEFAULT_INTEL_THRESHOLDS): IntelLevel {
    let level = 0;
    for (let i = 0; i < thresholds.length && i <= 5; i++) {
        if (intel >= thresholds[i]) level = i;
    }
    return level as IntelLevel;
}

export function isAcquaintance(entry: Pick<FindPersonEntry, 'friendship' | 'hasBond'>): boolean {
    return entry.friendship >= ACQUAINTANCE_FRIENDSHIP || entry.hasBond;
}

/** 熟人例外：顯示等級比自己情報等級高 1 級，最高 Lv5 */
export function effectiveIntelLevel(baseLevel: IntelLevel, acquaintance: boolean): IntelLevel {
    return Math.min(5, baseLevel + (acquaintance ? 1 : 0)) as IntelLevel;
}

export function matchesQuery(entry: FindPersonEntry, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return true;
    return entry.name.toLowerCase().includes(q)
        || entry.pinyin.toLowerCase().includes(q)
        || entry.faction.toLowerCase().includes(q)
        || entry.office.toLowerCase().includes(q);
}

export class FindPersonResolver {
    public constructor(
        private readonly _registry: SceneRegistry,
        private readonly _thresholds: readonly number[] = DEFAULT_INTEL_THRESHOLDS,
    ) {}

    public levelOf(intel: number): IntelLevel {
        return intelLevelFromValue(intel, this._thresholds);
    }

    public resolve(entry: FindPersonEntry, playerIntel: number): FindResultView {
        const boost = isAcquaintance(entry);
        const base = this.levelOf(playerIntel);
        const level = effectiveIntelLevel(base, boost);
        const friendBoost = boost && level > base;
        const view: FindResultView = {
            generalId: entry.generalId,
            name: entry.name,
            level,
            friendBoost,
            locationTextKey: 'life.panel.find.cityOnly',
            locationArgKeys: [],
            questionMark: false,
            showAvatar: false,
            jump: null,
        };
        if (entry.isOwnVassal) view.showAvatar = true; // 家臣的臉與名永遠可見
        // 家臣在情報 Lv0～2：查不到所在場景、也看不到活動（熟人加成不適用；以玩家自身情報等級為準）
        const hidden = entry.isOwnVassal === true && base <= VASSAL_HIDDEN_MAX_LEVEL;
        const scene = this._registry.getScene(entry.sceneId);
        if (level === 0 || !scene || hidden) return view;

        if (level === 1) {
            const area = this._registry.getArea(scene.areaId);
            const first = this._registry.firstSceneOfArea(scene.areaId);
            if (!area || !first) return view;
            view.locationTextKey = 'life.panel.find.inArea';
            view.locationArgKeys = [area.nameKey];
            view.jump = { sceneId: first.id, focus: 'center' };
            return view;
        }

        view.locationTextKey = 'life.panel.find.inScene';
        view.locationArgKeys = [scene.nameKey];
        view.questionMark = level === 2;
        view.showAvatar = level >= 3 || entry.isOwnVassal === true;
        view.jump = { sceneId: scene.id, focus: level >= 3 ? 'actor' : 'none' };
        if (level >= 4) view.activityId = entry.activityId;
        if (level >= 5 && entry.nextSceneId) {
            const next = this._registry.getScene(entry.nextSceneId);
            if (next) view.nextSceneNameKey = next.nameKey;
        }
        return view;
    }

    public search(entries: readonly FindPersonEntry[], query: string, playerIntel: number): FindResultView[] {
        return entries
            .filter((e) => matchesQuery(e, query))
            .map((e) => this.resolve(e, playerIntel));
    }
}

/** 假資料：先讓「找人」分頁能試用；WP3 作息引擎接上後換成真實所在 */
export const FAKE_FIND_ROSTER: readonly FindPersonEntry[] = [
    { generalId: 'zhangfei', name: '張飛', pinyin: 'zhangfei', faction: '蜀', office: '車騎將軍', friendship: 45, hasBond: true, sceneId: 'mkt_tavern', activityId: 'S04', nextSceneId: 'home_nursery' },
    { generalId: 'zhugeliang', name: '諸葛亮', pinyin: 'zhugeliang', faction: '蜀', office: '軍師', friendship: 10, hasBond: false, sceneId: 'mkt_teahouse', activityId: 'S10', nextSceneId: 'gov_strategy' },
    { generalId: 'guanyu', name: '關羽', pinyin: 'guanyu', faction: '蜀', office: '前將軍', friendship: 20, hasBond: true, sceneId: 'mil_barracks', activityId: 'S02', nextSceneId: 'out_river' },
    { generalId: 'zhaoyun', name: '趙雲', pinyin: 'zhaoyun', faction: '蜀', office: '護軍', friendship: 5, hasBond: false, sceneId: 'mil_arena', activityId: 'S49', nextSceneId: 'mil_range' },
    { generalId: 'caocao', name: '曹操', pinyin: 'caocao', faction: '魏', office: '丞相', friendship: -10, hasBond: false, sceneId: 'gov_hall', activityId: 'S08', nextSceneId: 'home_garden' },
    { generalId: 'zhouyu', name: '周瑜', pinyin: 'zhouyu', faction: '吳', office: '都督', friendship: 0, hasBond: false, sceneId: 'edu_music', activityId: 'S18', nextSceneId: 'mkt_theater' },
    { generalId: 'diaochan', name: '貂蟬', pinyin: 'diaochan', faction: '群', office: '歌姬', friendship: 35, hasBond: false, sceneId: 'mkt_theater', activityId: 'S18', nextSceneId: 'home_garden' },
    { generalId: 'huatuo', name: '華佗', pinyin: 'huatuo', faction: '群', office: '醫官', friendship: 15, hasBond: false, sceneId: 'mkt_clinic', activityId: 'S23', nextSceneId: 'mkt_pharmacy' },
];
