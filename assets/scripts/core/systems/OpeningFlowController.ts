// @spec-source → PROG-2-0109 OPEN-01；新手開場程式規格書
import type { OpeningFlowConfig, OpeningFlowEvent, OpeningPhase } from '../config/OpeningFlowConfig';

export interface OpeningTransition {
    readonly from: string | null;
    readonly to: string | null;
    readonly event: OpeningFlowEvent;
}

/** 順序狀態機；只回傳目前幕與紀錄，不依賴 cc、不存檔、不發事件。 */
export class OpeningFlowController {
    private readonly phases: OpeningPhase[];
    private index = -1;
    private records: OpeningTransition[] = [];

    constructor(config: OpeningFlowConfig) {
        if (!config || !Array.isArray(config.phases) || config.phases.length === 0) {
            throw new Error('OPENING_PHASES_REQUIRED');
        }
        const ids = new Set<string>();
        for (const phase of config.phases) {
            if (!phase || typeof phase.id !== 'string' || !phase.id.trim() || ids.has(phase.id)
                || typeof phase.enterWhen !== 'function' || typeof phase.leaveWhen !== 'function') {
                throw new Error('OPENING_PHASE_INVALID');
            }
            ids.add(phase.id);
        }
        this.phases = config.phases.map(phase => ({ ...phase }));
    }

    /** 重新開始清空歷史；首幕進入條件接收 type=start，不符則保持未開始。 */
    start(): { id: string } | null {
        this.index = -1;
        this.records = [];
        const event = Object.freeze({ type: 'start' });
        if (this.phases[0].enterWhen(event)) {
            this.index = 0;
            this.records.push({ from: null, to: this.phases[0].id, event });
        }
        return this.current();
    }

    /** 一次事件最多前進一幕；最後一幕離開後 current=null，重複事件不新增紀錄。 */
    advance(event: OpeningFlowEvent): { id: string } | null {
        if (this.index < 0 || this.index >= this.phases.length) return this.current();
        if (!event || typeof event.type !== 'string' || !event.type.trim()) throw new Error('OPENING_EVENT_INVALID');
        const snapshot = Object.freeze({ type: event.type });
        const phase = this.phases[this.index], next = this.phases[this.index + 1];
        if (!phase.leaveWhen(snapshot) || (next && !next.enterWhen(snapshot))) return this.current();
        this.index++;
        this.records.push({ from: phase.id, to: next?.id ?? null, event: snapshot });
        return this.current();
    }

    current(): { id: string } | null {
        const phase = this.phases[this.index];
        return phase ? { id: phase.id } : null;
    }

    history(): OpeningTransition[] {
        return this.records.map(record => ({ ...record, event: { ...record.event } }));
    }
}
