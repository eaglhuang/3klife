/**
 * UIBloodlineMirrorInfusion — 血脈灌注後在命鏡升階頁顯示結果（重複名將分流彈窗與復生重練協議規格書 §3；DUP-04；PROG-2-2071）
 *
 * 執行灌注（GameSession.infuseSpiritCard），把灌注前後的血脈等級、英靈濃度、虎符層級
 * 組成命鏡升階頁（ascension state）的文字。灌注數值由呼叫端傳入（規格未定）。
 */
import type { SpiritCard } from '../../core/models/SpiritCard';
import type { SpiritCardInfusionState } from '../../core/systems/BloodlineInfusion';

export interface MirrorInfusionSession {
    infuseSpiritCard(uid: string, duplicateCardValue: number): Promise<SpiritCard | null>;
}

/** 依命鏡 layout 節點名給的文字 */
export type MirrorInfusionResultTexts = Record<'HeaderTitle' | 'PhaseLabel' | 'MirrorLabel' | 'CrestLabel' | 'ProgressLabel', string>;

const value = (n: number | undefined): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

export function buildMirrorInfusionResultTexts(
    name: string,
    before: SpiritCardInfusionState,
    after: SpiritCardInfusionState,
): MirrorInfusionResultTexts {
    return {
        HeaderTitle: `${name}・血脈灌注`,
        PhaseLabel: `血脈等級: Lv${value(before.bloodlineLevel)} → Lv${value(after.bloodlineLevel)}`,
        MirrorLabel: `英靈濃度: ${value(before.spiritPower)} → ${value(after.spiritPower)}`,
        CrestLabel: `虎符層級: ${value(before.linkedTallyLevel)} → ${value(after.linkedTallyLevel)}`,
        ProgressLabel: '灌注完成',
    };
}

/** 灌注並回傳升階頁文字；session 無法灌注（找不到卡或未掛存檔）時回傳 null */
export async function runMirrorInfusion(
    session: MirrorInfusionSession,
    card: Pick<SpiritCard, 'uid' | 'name'> & SpiritCardInfusionState,
    duplicateCardValue: number,
): Promise<MirrorInfusionResultTexts | null> {
    const infused = await session.infuseSpiritCard(card.uid, duplicateCardValue);
    return infused ? buildMirrorInfusionResultTexts(card.name, card, infused) : null;
}
