// @spec-source → 武將人物介面規格書.md (doc_ui_0012)、血統理論系統.md (doc_spec_0011)；D-2 general-bloodline-vignette（PROG-2-1428）
/**
 * BloodlineVignetteText — 血統小傳開窗的文字（純邏輯，不依賴 cc）
 *
 * 人物頁總覽按「血統小傳」打開：標題、血脈傳聞全文、六格故事（逸事）逐格解鎖。
 * 故事格取 storyStripCells（缺時退 profilePresentation.storyStripCells），依 origin→future 排序。
 * 文案走語系表（ui.bloodline.vignette.*）；查不到時退回 zh-TW 預設，與 RankProgressText 相同做法。
 *
 * 暫定（可逆）：解鎖規則取自 UI-2-0054 劇本樣本「取得先開第一則，升星、覺醒後逐步解鎖」——
 * 取得時開 1 格，轉數（rebirthCount）每多 1 轉多開 1 格；命紋覺醒（crestState === 'awakened'）六格全開。
 *
 * Unity 對照：像 ViewModel 把 ScriptableObject 的故事陣列轉成 List<string> 給六個 Text 顯示。
 */
import type { GeneralConfig, GeneralDetailStorySlot } from '../../core/models/GeneralUnit';
import { fillBreedText, type BreedTextLookup } from './BreedingTexts';

/** 開窗固定格數，對應 layout 的 vignetteCell0~vignetteCell5 */
export const BLOODLINE_VIGNETTE_CELL_COUNT = 6;

const SLOT_ORDER: readonly GeneralDetailStorySlot[] = ['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'];

/** zh-TW 預設：語系表未載入或缺 key 時使用 */
export const BLOODLINE_VIGNETTE_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.bloodline.vignette.open': '血統小傳',
    'ui.bloodline.vignette.title': '血統小傳　{0}',
    'ui.bloodline.vignette.close': '關閉',
    'ui.bloodline.vignette.progress': '已解鎖 {0}/{1}',
    'ui.bloodline.vignette.cell': '{0}．{1}　{2}',
    'ui.bloodline.vignette.locked': '（{0} 轉或命紋覺醒後解鎖）',
    'ui.bloodline.vignette.no_rumor': '血脈傳聞尚未流傳。',
    'ui.bloodline.vignette.empty': '這位武將的逸事尚未記載。',
    'ui.bloodline.vignette.slot.origin': '出身',
    'ui.bloodline.vignette.slot.faction': '陣營',
    'ui.bloodline.vignette.slot.role': '定位',
    'ui.bloodline.vignette.slot.awakening': '覺醒',
    'ui.bloodline.vignette.slot.bloodline': '血脈',
    'ui.bloodline.vignette.slot.future': '未來',
};

export interface BloodlineVignetteCell {
    slot: string;
    unlocked: boolean;
    line: string;
}

export interface BloodlineVignetteView {
    title: string;
    rumor: string;
    progress: string;
    closeLabel: string;
    cells: BloodlineVignetteCell[];
}

type VignetteSource = Pick<GeneralConfig, 'name' | 'bloodlineRumor' | 'storyStripCells' | 'profilePresentation' | 'rebirthCount' | 'crestState'>;

function vignetteText(lookup: BreedTextLookup, key: string, ...args: string[]): string {
    const localized = lookup(key, ...args);
    return localized === key ? fillBreedText(BLOODLINE_VIGNETTE_TEXT_FALLBACK_ZH_TW[key] ?? key, args) : localized;
}

/** 人物頁總覽「血統小傳」按鈕文字 */
export function bloodlineVignetteOpenLabel(lookup: BreedTextLookup = (key) => key): string {
    return vignetteText(lookup, 'ui.bloodline.vignette.open');
}

/** 已解鎖格數：取得開 1 格，每多 1 轉多開 1 格，命紋覺醒全開 */
export function bloodlineVignetteUnlockedCount(source: Pick<VignetteSource, 'rebirthCount' | 'crestState'>, total: number): number {
    if (source.crestState === 'awakened') return total;
    const rebirth = Math.max(1, Math.floor(Number(source.rebirthCount) || 1));
    return Math.min(total, rebirth);
}

/** 組血統小傳開窗的全部文字 */
export function bloodlineVignetteViewOf(source: VignetteSource, lookup: BreedTextLookup = (key) => key): BloodlineVignetteView {
    const raw = source.storyStripCells?.length ? source.storyStripCells : source.profilePresentation?.storyStripCells ?? [];
    const ordered = raw
        .filter((cell) => typeof cell?.text === 'string' && cell.text.trim() !== '')
        .slice()
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
        .slice(0, BLOODLINE_VIGNETTE_CELL_COUNT);
    const unlockedCount = bloodlineVignetteUnlockedCount(source, ordered.length);
    const cells = ordered.map((cell, index): BloodlineVignetteCell => {
        const unlocked = index < unlockedCount;
        const label = vignetteText(lookup, `ui.bloodline.vignette.slot.${cell.slot}`);
        const body = unlocked ? cell.text.trim() : vignetteText(lookup, 'ui.bloodline.vignette.locked', String(index + 1));
        return { slot: cell.slot, unlocked, line: vignetteText(lookup, 'ui.bloodline.vignette.cell', String(index + 1), label, body) };
    });
    const rumor = source.bloodlineRumor?.trim();
    return {
        title: vignetteText(lookup, 'ui.bloodline.vignette.title', source.name ?? ''),
        rumor: rumor || vignetteText(lookup, 'ui.bloodline.vignette.no_rumor'),
        progress: ordered.length > 0
            ? vignetteText(lookup, 'ui.bloodline.vignette.progress', String(unlockedCount), String(ordered.length))
            : vignetteText(lookup, 'ui.bloodline.vignette.empty'),
        closeLabel: vignetteText(lookup, 'ui.bloodline.vignette.close'),
        cells,
    };
}
