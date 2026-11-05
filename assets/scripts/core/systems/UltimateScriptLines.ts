// @spec-source → 奧義系統.md §G 劇本相關；PROG-2-1780
/**
 * UltimateScriptLines — 奧義劇本句（純邏輯，不依賴 cc）
 *
 * 暫定選擇（可逆）：
 *   - 趙雲、諸葛亮的專屬句取代究極奧義句，同一次施放只說一句。
 *   - 規格寫「父親的奧義」；奧義來自母方時改說「母親」，以免與實際來源矛盾。
 *   - 查不到奧義名稱時不顯示解鎖句，不把內部 id 露給玩家。
 *
 * Unity 對照：像 ScriptableObject 上的台詞表，呼叫端只給名字與槽位。
 */
import type { GeneralUltimateSlotConfig } from '../models/GeneralUnit';

/** 5 轉解鎖的奧義欄位就是究極奧義（奧義系統 §J） */
const FINAL_ULTIMATE_SLOT = 5;

const SIGNATURE_CAST_LINES: Readonly<Record<string, string>> = {
    'ult-zhao-yun-3': '長坂坡的英魂再現——七進七出，無人可擋！',
    'ult-zhuge-liang-5': '丞相最後的計策……星辰隕落，敵軍盡滅。',
};

export function ultimateVitalityLowLine(generalName: string): string {
    return `${generalName} 精力不足，無法發動奧義！`;
}

/** 施放句；這次施放沒有專屬句也不是究極奧義時回傳 null */
export function ultimateCastLine(cast: { ultimateId: string; slot?: number; generalName: string; ultimateName?: string }): string | null {
    const signature = SIGNATURE_CAST_LINES[cast.ultimateId];
    if (signature) return signature;
    if (cast.slot !== FINAL_ULTIMATE_SLOT || !cast.ultimateName) return null;
    return `這是${cast.generalName}的全力一擊——【${cast.ultimateName}】！！`;
}

/** 這批轉生新解鎖的奧義；滿轉溢出沒有增加轉數，不算解鎖 */
export function ultimateUnlockLines(
    rebirths: ReadonlyArray<{ id: string; overflow: boolean; rebirthCount: number }>,
    generalOf: (id: string) => { name: string; ultimateSlots?: readonly GeneralUltimateSlotConfig[] } | undefined,
    ultimateNameOf: (ultimateId: string) => string | undefined,
): string[] {
    const lines: string[] = [];
    for (const rebirth of rebirths) {
        if (rebirth.overflow) continue;
        const general = generalOf(rebirth.id);
        for (const slot of general?.ultimateSlots ?? []) {
            if (slot.unlockReincarnation !== rebirth.rebirthCount) continue;
            const name = ultimateNameOf(slot.ultimateId);
            if (general && name) lines.push(`${general.name} 突破極限——第 ${slot.slot} 奧義【${name}】覺醒！`);
        }
    }
    return lines;
}

export function childUltimateAwakenLine(childName: string, fromFather: boolean): string {
    return `血脈中沉睡的力量甦醒了——${fromFather ? '父親' : '母親'}的奧義，在${childName}身上重現！`;
}
