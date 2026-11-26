// @spec-source → 武將台詞系統（PROG-2-9964）
/**
 * GameDialogueStateSource — 把 GameSession／FriendshipService 轉接成 DialogueStateSource。
 * 只讀取，不改任何遊戲狀態。查不到的值回 undefined（builder 會當成缺欄位，不送請求）。
 */
import type { DialogueEventLog, DialogueStateSource, DialogueTarget, WorldHolder } from './DialogueContextBuilder';
import type { FriendshipService } from '../services/FriendshipService';
import { personalityTypeOf } from '../mind/MindRules';

/** GameSession 中台詞系統用得到的唯讀面（測試可用替身） */
export interface DialogueSessionView {
    readonly roster: ReadonlyArray<{ id: string; gender?: string; age?: number }>;
    readonly rivals: { readonly nations: ReadonlyArray<{ id: string; territories: number }> };
    readonly territories: ReadonlyArray<unknown>;
    readonly gameTime: { readonly totalSeasonsElapsed: number };
    mindMoodOf(generalId: string): string | undefined;
}

export const DIALOGUE_PLAYER_HOLDER_ID = 'player';

export function createGameDialogueStateSource(session: DialogueSessionView, friendship: () => FriendshipService, log: DialogueEventLog): DialogueStateSource {
    const find = (id: string) => session.roster.find((g) => g.id === id);
    return {
        personalityOf: (id) => {
            const g = find(id);
            return g ? personalityTypeOf(g as unknown as Parameters<typeof personalityTypeOf>[0]) : undefined;
        },
        voiceOf: (id) => {
            const g = find(id);
            return g ? { gender: g.gender, age: g.age } : undefined;
        },
        mindMoodOf: (id) => session.mindMoodOf(id),
        friendshipOf: (id, target: DialogueTarget) => {
            if (!find(id)) return undefined;
            if (target.kind === 'player') return friendship().get(id);
            return find(target.id) ? friendship().getPair(id, target.id) : undefined;
        },
        worldHolders: (): WorldHolder[] => [
            ...session.rivals.nations.map((n) => ({ id: n.id, territories: n.territories })),
            { id: DIALOGUE_PLAYER_HOLDER_ID, territories: session.territories.length },
        ],
        playerHolderId: () => DIALOGUE_PLAYER_HOLDER_ID,
        recentActionOf: (id, target, within) => log.latest(id, target, session.gameTime.totalSeasonsElapsed, within),
    };
}
