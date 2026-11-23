// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（點武將聊天）、NPC人性化規格書；PROG-2-9885
/**
 * AvatarTalk — 「遊戲中只要出現武將頭像，點擊就一定會說話」的選句邏輯，純 TS，不依賴 cc。
 *
 * 台詞來源順序（任何一層沒有才往下）：
 *   1. 玩家本機 AI 台詞快取（NpcDialogueCache，非降級句、同語系）— 用了要觸發「有感而發」。
 *   2. 大廳台詞接口（LobbyDialogueProvider：內建 HallChatLines 底稿＋本機快取，已依友誼值、時段過濾）。
 *   3. 保底通用句（i18n 四語系），最後一道：絕不回傳空。
 * 連點：同一位武將避開上一句（有第二句可選時）；極短間隔內的重複點擊只回 cooldown（不換句、不重複觸發成就）。
 *
 * Unity 對照：像一個 ISpeaker.Speak(general) 的選句策略，View 層只負責顯示。
 */
import type { NpcDialogueRecord } from '../dialogue/NpcDialogueCache';
import { dialogueFingerprint } from '../dialogue/NpcDialogueCache';
import type { LobbyDialogueContext, LobbyDialogueProvider } from './LobbyDialogueProvider';
import { periodOfHour, pickDialogueLine } from './LobbyDialogueProvider';

/** 保底通用句的條數（i18n key：ui.avatarTalk.generic.1 ~ N，四語系各一份） */
export const AVATAR_TALK_GENERIC_COUNT = 6;
export const AVATAR_TALK_GENERIC_KEY_PREFIX = 'ui.avatarTalk.generic.';
/** 同一位武將兩次點擊小於這個間隔視為連點抖動，不換句（毫秒） */
export const AVATAR_TALK_COOLDOWN_MS = 350;
/** 泡泡停留秒數（點一下泡泡可立刻關掉） */
export const AVATAR_TALK_HOLD_SEC = 3.2;
/** 連一句保底都沒有（i18n 尚未載入）時才用的符號句，確保「有聲」 */
export const AVATAR_TALK_LAST_RESORT = '……';

export type AvatarTalkSource = 'cache' | 'book' | 'generic';

export interface AvatarTalkLine {
    kind: 'line';
    text: string;
    source: AvatarTalkSource;
    /** 台詞編號（換句比對用）：快取句用文字指紋、底稿句用 ChatLine.id、保底句用 key */
    lineId: string;
}

export interface AvatarTalkCooldown {
    kind: 'cooldown';
}

export type AvatarTalkResult = AvatarTalkLine | AvatarTalkCooldown;

export interface AvatarTalkDeps {
    /** 大廳台詞接口；尚未建立時回 null，直接走保底 */
    provider: () => LobbyDialogueProvider | null;
    /** 本機 AI 台詞快取查詢；沒有回 null */
    cacheLine: (generalId: string) => NpcDialogueRecord | null;
    friendship: (generalId: string) => number;
    /** i18n 查詢（key → 目前語系字串；查不到可回 key 本身） */
    translate: (key: string) => string;
    random: () => number;
    nowMs: () => number;
    hour: () => number;
}

export class AvatarTalkPicker {
    private readonly _last = new Map<string, { lineId: string; atMs: number }>();

    constructor(private readonly _deps: AvatarTalkDeps) {}

    /** 點一次頭像：回一句台詞；極短間隔的重複點擊回 cooldown。永遠不會回空文字。 */
    public speak(generalId: string): AvatarTalkResult {
        const now = this._deps.nowMs();
        const last = this._last.get(generalId);
        if (last && now - last.atMs >= 0 && now - last.atMs < AVATAR_TALK_COOLDOWN_MS) return { kind: 'cooldown' };
        const lastId = last?.lineId ?? null;
        const line = this._fromCache(generalId, lastId) ?? this._fromBook(generalId, lastId) ?? this._fromGeneric(lastId);
        this._last.set(generalId, { lineId: line.lineId, atMs: now });
        return line;
    }

    /** 清掉連點記憶（離開畫面或測試用） */
    public reset(): void {
        this._last.clear();
    }

    private _fromCache(generalId: string, lastId: string | null): AvatarTalkLine | null {
        const record = this._deps.cacheLine(generalId);
        const text = record?.text?.trim();
        if (!record || !text) return null;
        const lineId = `ai:${dialogueFingerprint(text)}`;
        // 上一句剛說過這句 AI 台詞：這次換底稿句，輪流說才不會連點一直同一句
        if (lineId === lastId) return null;
        return { kind: 'line', text, source: 'cache', lineId };
    }

    private _fromBook(generalId: string, lastId: string | null): AvatarTalkLine | null {
        const provider = this._deps.provider();
        if (!provider) return null;
        const context: LobbyDialogueContext = {
            friendship: this._deps.friendship(generalId),
            period: periodOfHour(this._deps.hour()),
            event: 'tap',
        };
        // 底稿句可能含 {task} 等佔位（只給自薦用）：頭像點擊不帶變數，含佔位的句子先濾掉
        const lines = provider.getLines(generalId, context).filter((line) => !/\{\w+\}/.test(line.text));
        const pick = pickDialogueLine(lines, lastId, this._deps.random);
        if (!pick) return null;
        return { kind: 'line', text: pick.text, source: 'book', lineId: pick.id };
    }

    private _fromGeneric(lastId: string | null): AvatarTalkLine {
        const options: AvatarTalkLine[] = [];
        for (let i = 1; i <= AVATAR_TALK_GENERIC_COUNT; i++) {
            const key = `${AVATAR_TALK_GENERIC_KEY_PREFIX}${i}`;
            const text = this._deps.translate(key);
            // i18n 查不到會回 key 本身：視為沒有這句
            if (text && text !== key) options.push({ kind: 'line', text, source: 'generic', lineId: key });
        }
        if (options.length === 0) return { kind: 'line', text: AVATAR_TALK_LAST_RESORT, source: 'generic', lineId: 'generic:last-resort' };
        const pool = options.length > 1 && lastId ? options.filter((o) => o.lineId !== lastId) : options;
        return pool[Math.min(pool.length - 1, Math.floor(this._deps.random() * pool.length))];
    }
}

export interface BubbleRect {
    x: number;
    y: number;
    width: number;
    height: number;
    /** true＝泡泡放在頭像下方（上方放不下時） */
    below: boolean;
}

/**
 * 泡泡擺位（Canvas 本地座標，原點在畫面中心）：優先放頭像正上方，放不下改放下方，左右夾在畫面內。
 * 只算位置與大小，不碰節點；高度依字數估算（CJK 約一字一個字寬）。
 */
export function layoutAvatarBubble(input: {
    anchorX: number;
    anchorY: number;
    anchorHalfHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    textLength: number;
    fontSize: number;
    maxWidth: number;
    padding: number;
    margin: number;
}): BubbleRect {
    const { fontSize, padding, margin } = input;
    const innerMax = Math.max(fontSize, input.maxWidth - padding * 2);
    const charsPerLine = Math.max(1, Math.floor(innerMax / fontSize));
    const lines = Math.max(1, Math.ceil(input.textLength / charsPerLine));
    const textWidth = Math.min(innerMax, input.textLength * fontSize);
    const width = Math.min(input.canvasWidth - margin * 2, Math.max(fontSize * 4, textWidth) + padding * 2);
    const height = lines * Math.round(fontSize * 1.3) + padding * 2;
    const halfW = input.canvasWidth / 2;
    const halfH = input.canvasHeight / 2;
    const gap = 10;
    const aboveCenter = input.anchorY + input.anchorHalfHeight + gap + height / 2;
    const below = aboveCenter + height / 2 > halfH - margin;
    const rawY = below ? input.anchorY - input.anchorHalfHeight - gap - height / 2 : aboveCenter;
    const y = Math.max(-halfH + margin + height / 2, Math.min(halfH - margin - height / 2, rawY));
    const x = Math.max(-halfW + margin + width / 2, Math.min(halfW - margin - width / 2, input.anchorX));
    return { x, y, width, height, below };
}
