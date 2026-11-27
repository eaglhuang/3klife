// @spec-source → 戰前情報偵查面板與戰法對策槽位容量規格書.md（doc_spec_0347）；PROG-2-10135
/**
 * ScoutAutofillBinding — 把偵察面板「幫我換上」接到主將戰法槽（不依賴 cc，LobbyScene 只負責傳依賴進來）
 *
 * - 預覽只算方案；apply 才寫入主將戰法槽並回傳重算後的偵察情資；undo 把戰法槽還原成按下前的樣子。
 * - 目前戰法槽沿用戰場組隊規則（BattleRoster）：有 tacticSlots 用 tacticSlots，沒有就取已習得戰法補到槽位上限；
 *   通用計謀不佔智力槽，但戰場一定會帶，所以算涵蓋缺口、不重複補。
 */
import type { EncounterConfig } from '../../shared/BattleEntryParams';
import type { GeneralConfig, GeneralTacticSlotConfig } from '../../core/models/GeneralUnit';
import type { TacticCounterTagTable } from '../../core/systems/LoadoutCheck';
import { BATTLE_TACTIC_SLOT_LIMIT, COMMON_TACTIC_ID, battleIntelligenceOf } from '../../core/systems/BattleRoster';
import { toLibraryTacticId } from '../../core/systems/InspiredTacticMap';
import { planTacticAutofill, type TacticAutofillPlan, type TacticAutofillRules } from '../../core/systems/TacticAutofill';
import { tacticLevelOf } from '../../core/systems/TacticRandomization';
import { tacticLoadoutCapacity } from '../../core/systems/TacticLoadout';
import type { AutofillPreview, LobbyScout, ScoutAutofillHooks } from './ScoutPanelController';

/** 主將目前實際會帶上戰場的智力槽（不含通用計謀） */
export function effectiveTacticSlots(general: GeneralConfig | null | undefined): GeneralTacticSlotConfig[] {
    if (!general) return [];
    const capacity = Math.min(tacticLoadoutCapacity(battleIntelligenceOf(general)), BATTLE_TACTIC_SLOT_LIMIT);
    const explicit = (general.tacticSlots ?? []).filter((slot) => slot.tacticId !== COMMON_TACTIC_ID);
    if (explicit.length > 0) return explicit.slice(0, capacity).map((slot) => ({ ...slot }));
    const learned = Array.from(new Set((general.learnedTactics ?? []).map(toLibraryTacticId))).slice(0, capacity);
    return learned.map((tacticId, index) => ({ slotId: `slot-${index + 1}`, tacticId, source: 'learned' as GeneralTacticSlotConfig['source'] }));
}

export interface ScoutAutofillDeps {
    encounter: Readonly<EncounterConfig>;
    /** 每次呼叫都讀最新的主將（apply 後要看到新戰法槽） */
    currentLead: () => GeneralConfig | null;
    tagTable: TacticCounterTagTable;
    rules: TacticAutofillRules;
    nameOf: (tacticId: string) => string;
    writeSlots: (generalId: string, slots: readonly GeneralTacticSlotConfig[]) => boolean;
    /** 依最新戰法槽重算偵察情資 */
    rebuild: () => LobbyScout;
}

/** 已持有的戰法：已習得＋戰法經驗表（轉蛋抽到的）；去重後轉戰法庫 id */
function ownedTacticIds(lead: GeneralConfig): string[] {
    return Array.from(new Set([...(lead.learnedTactics ?? []), ...Object.keys(lead.tacticExp ?? {}), ...(lead.tacticSlots ?? []).map((slot) => slot.tacticId)]));
}

export function planFor(deps: ScoutAutofillDeps, lead: GeneralConfig): TacticAutofillPlan {
    return planTacticAutofill({
        required: deps.encounter.requiredLoadout ?? [],
        recommended: deps.encounter.highlyRecommendedLoadout ?? [],
        equipped: effectiveTacticSlots(lead),
        alwaysOn: [COMMON_TACTIC_ID],
        owned: ownedTacticIds(lead),
        capacity: Math.min(tacticLoadoutCapacity(battleIntelligenceOf(lead)), BATTLE_TACTIC_SLOT_LIMIT),
        tagTable: deps.tagTable,
        levelOf: (id) => tacticLevelOf(lead.tacticExp?.[id]),
        enemyTroops: (deps.encounter.enemyInitialDeployment ?? []).map((unit) => unit.type),
        rules: deps.rules,
    });
}

export function buildScoutAutofillHooks(deps: ScoutAutofillDeps): ScoutAutofillHooks | undefined {
    if (!deps.currentLead()) return undefined;
    /** 按下「幫我換上」前的戰法槽（原樣保存，含沒有 tacticSlots 的舊資料） */
    let snapshot: GeneralTacticSlotConfig[] | null = null;
    return {
        preview(): AutofillPreview {
            const lead = deps.currentLead();
            if (!lead) return { changes: [], nothingOwned: true, slotsBlocked: false };
            const plan = planFor(deps, lead);
            return {
                changes: plan.changes.map((c) => ({ inName: deps.nameOf(c.tacticId), outName: c.replaces === null ? null : deps.nameOf(c.replaces) })),
                nothingOwned: plan.nothingOwned,
                slotsBlocked: plan.slotsBlocked,
            };
        },
        apply(): LobbyScout {
            const lead = deps.currentLead();
            if (lead) {
                const plan = planFor(deps, lead);
                if (plan.changes.length > 0) {
                    snapshot = (lead.tacticSlots ?? []).map((slot) => ({ ...slot }));
                    const old = new Map(effectiveTacticSlots(lead).map((slot) => [slot.slotId, slot]));
                    const common = (lead.tacticSlots ?? []).filter((slot) => slot.tacticId === COMMON_TACTIC_ID);
                    const next = plan.nextSlots.map((slot) => {
                        const before = old.get(slot.slotId);
                        return before && before.tacticId === slot.tacticId ? before : { slotId: slot.slotId, tacticId: slot.tacticId, source: 'learned' as GeneralTacticSlotConfig['source'] };
                    });
                    deps.writeSlots(lead.id, [...next, ...common]);
                }
            }
            return deps.rebuild();
        },
        undo(): LobbyScout {
            const lead = deps.currentLead();
            if (lead && snapshot) deps.writeSlots(lead.id, snapshot);
            snapshot = null;
            return deps.rebuild();
        },
    };
}
