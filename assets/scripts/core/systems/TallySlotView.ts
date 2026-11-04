// @spec-source → 武將人物介面規格書.md (doc_ui_0012) §9；兵種（虎符）系統.md (doc_spec_0012) §G；UI-2-0170
/**
 * TallySlotView — 人物頁兵分頁虎符槽的顯示內容與按鈕狀態（純邏輯，不依賴 cc）。
 *
 * - 虎符卡沒有名稱欄位：規格表的虎符用規格名；陣亡產出的虎符用來源武將名；都查不到時用兵種名。
 * - 按鈕依模式切換：瀏覽、挑選候選、確認卸下、確認沒收。
 *
 * Unity 對照：像裝備槽 Presenter 的 ViewModel 加一個小狀態機，畫面只拿字串與開關。
 */
import type { TroopType } from '../config/Constants';
import { TIGER_TALLY_SPEC_TACTICS } from '../config/TigerTallySpecTactics';
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { resolveTroopDisplayName } from '../models/TroopUnit';
import { getTallyGrainCost, TALLY_TROOP_COST } from './SortieDeploy';
import { readCardStarState, starStatMultiplier } from './TigerTallyStar';

export const TALLY_SLOT_EMPTY_NAME = '尚未裝備虎符';
export const TALLY_SLOT_NO_CANDIDATE = '沒有可用的虎符。';
export const TALLY_SLOT_NOT_IN_ROSTER = '此武將不在麾下，無法變更虎符。';
export const TALLY_SLOT_SEASON_LIMIT = '本季已變更過此武將的虎符，下季才能再換。';
export const TALLY_SLOT_MAX_STARS = 5;

/** 提示列：一行約可放的全形字數與行高（寬 490、字級 13） */
const HINT_CHARS_PER_LINE = 36;
const HINT_LINE_HEIGHT = 20;

export type TallySlotMode = 'view' | 'picking' | 'confirm-unequip' | 'confirm-confiscate';

export interface TallySlotCardView {
    name: string;
    quality: string;
    stars: number;
    troopName: string;
    grainText: string;
    forceText: string;
    scoreText: string;
}

export interface TallySlotButtons {
    /** null 代表隱藏該按鈕 */
    primary: string | null;
    secondary: string | null;
    detail: string | null;
}

function specOf(templateId: string) {
    return TIGER_TALLY_SPEC_TACTICS.find((spec) => spec.tacticId === templateId) ?? null;
}

export function troopNameOf(card: Pick<TigerTallyCard, 'troopType'>): string {
    return card.troopType ? resolveTroopDisplayName(card.troopType as TroopType) : '—';
}

/** 虎符名稱；nameOfGeneral 查不到時回傳空值 */
export function resolveTallyName(
    card: Pick<TigerTallyCard, 'templateId' | 'sourceGeneralUid' | 'troopType'>,
    nameOfGeneral: (id: string) => string | null | undefined,
): string {
    const spec = specOf(card.templateId);
    if (spec) return spec.tallyName;
    const general = nameOfGeneral(card.sourceGeneralUid) ?? nameOfGeneral(card.templateId);
    if (general) return `虎符：${general}`;
    return card.troopType ? `虎符：${troopNameOf(card)}` : '虎符';
}

function formatForce(quality: string): string {
    const troops = TALLY_TROOP_COST[quality];
    return troops === undefined ? '—' : troops.toLocaleString('en-US');
}

export function buildTallySlotCardView(card: TigerTallyCard, name: string): TallySlotCardView {
    const stars = readCardStarState(card).star;
    return {
        name,
        quality: card.quality,
        stars,
        troopName: troopNameOf(card),
        grainText: String(getTallyGrainCost(card.quality, stars)),
        forceText: formatForce(card.quality),
        scoreText: `虎符分 ${card.score}`,
    };
}

/** 「查看詳情」的文字：規格效果與出陣數值 */
export function buildTallySlotDetailText(card: TigerTallyCard): string {
    const lines: string[] = [];
    const spec = specOf(card.templateId);
    if (spec) lines.push(spec.effect);
    const stars = readCardStarState(card).star;
    const multiplier = starStatMultiplier(stars).toFixed(2);
    lines.push(`出陣：投入兵力 ${formatForce(card.quality)}｜糧耗 ${getTallyGrainCost(card.quality, stars)}｜星級倍率 ×${multiplier}`);
    return lines.join('\n');
}

export function tallySlotButtons(mode: TallySlotMode, hasTally: boolean, candidateCount: number): TallySlotButtons {
    switch (mode) {
        case 'picking':
            return { primary: candidateCount > 1 ? '下一張' : null, secondary: '確定', detail: '取消' };
        case 'confirm-unequip':
            return { primary: null, secondary: '確認卸下', detail: '取消' };
        case 'confirm-confiscate':
            return { primary: null, secondary: '確認沒收', detail: '取消' };
        default:
            return hasTally
                ? { primary: '更換虎符', secondary: '卸下虎符', detail: '查看詳情' }
                : { primary: '裝備虎符', secondary: null, detail: null };
    }
}

export function tallyPickHint(name: string, index: number, total: number): string {
    return `候選 ${index + 1}/${total}：【${name}】`;
}

export function tallyUnequipWarn(generalName: string): string {
    return `卸下虎符會使 ${generalName} 忠誠度下降。`;
}

export function tallyEquipLine(generalName: string, tallyName: string, troopName: string): string {
    return `${generalName} 裝備了【${tallyName}】，現可指揮 ${troopName}！`;
}

export function tallyUnequipLine(generalName: string, tallyName: string): string {
    return `${generalName} 卸下了【${tallyName}】。`;
}

export function tallyLoyaltyDropLine(generalName: string): string {
    return `${generalName} 對被拔除虎符一事感到不滿，忠誠度下降。`;
}

/** 提示列高度：依換行與字數估算行數；沒有文字時為 0 */
export function tallyHintHeight(text: string): number {
    if (!text) return 0;
    const lines = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / HINT_CHARS_PER_LINE)), 0);
    return lines * HINT_LINE_HEIGHT;
}
