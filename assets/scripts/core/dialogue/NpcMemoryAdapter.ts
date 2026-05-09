import { EventSystem } from '../systems/EventSystem';
import { SyncManager } from '../systems/SyncManager';
import { NpcDialogueService } from '../services/NpcDialogueService';
import { UCUFLogger, LogCategory } from '../utils/UCUFLogger';

export const EVENT_NPC_INTERACTION_COMPLETED = 'npc.interaction.completed';

export interface NpcInteractionCompletedPayload {
    saveId?: string;
    generalId: string;
    eventType: string;
    summary: string;
    keywords?: string[];
    playerAction?: string | null;
    generalReaction?: string | null;
    isMilestone?: boolean;
    fallbackUsed?: boolean;
}

export class NpcMemoryAdapter {
    private _unsubscribe: (() => void) | null = null;

    public setup(event: EventSystem, npcDialogue: NpcDialogueService, sync: SyncManager): void {
        if (this._unsubscribe) {
            return;
        }
        this._unsubscribe = event.on<NpcInteractionCompletedPayload>(
            EVENT_NPC_INTERACTION_COMPLETED,
            (payload) => {
                if (!payload || payload.fallbackUsed) {
                    return;
                }
                const saveId = payload.saveId?.trim() || sync.getMemorySaveId();
                void npcDialogue.recordInteractionEvent({
                    saveId,
                    generalId: payload.generalId,
                    eventType: payload.eventType,
                    summary: payload.summary.slice(0, 180),
                    keywords: payload.keywords ?? [],
                    playerAction: payload.playerAction ?? null,
                    generalReaction: payload.generalReaction ?? null,
                    isMilestone: payload.isMilestone ?? false,
                }).catch((error) => {
                    UCUFLogger.warn(LogCategory.DATA, '[NpcMemoryAdapter] npc interaction writeback failed', {
                        saveId,
                        generalId: payload.generalId,
                        error,
                    });
                });
            },
        );
    }

    public dispose(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
    }
}
