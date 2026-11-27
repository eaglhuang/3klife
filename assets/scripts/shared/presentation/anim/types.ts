/**
 * types.ts — Q 動畫管理器共用型別（QACT-01，PROG-2-10209）
 *
 * 引擎中立：本目錄核心（QAnimManager／QClipRunner／QActorPool／curves／types）不 import Cocos，
 * 輸出只是一包「通道數值」，由套用端（例如 cocos/QAnimCocosView）寫到節點上。
 * Unity 對照：相當於 AnimationClip 取樣結果（Transform 位移／旋轉／縮放），套用端才是 Animator。
 *
 * 單位：長度＝頭高 H（頭大頭小不必改參數）；角度＝度；時間＝秒。
 */

/** 演員把手：低 16 位＝槽位、高位＝世代，過期把手一律被忽略（註銷後再用不會誤操作別人） */
export type ActorHandle = number;
export const INVALID_HANDLE: ActorHandle = -1;

/** 細節等級：0 全速、1 隔幀（只做位移與呼吸）、2 凍結（不跑視覺通道） */
export type QLod = 0 | 1 | 2;

/** 通道遮罩位元（LOD1 只開 y 與 scale） */
export const CH_Y = 1;
export const CH_ROT = 2;
export const CH_SCALE = 4;
export const CH_SHADOW = 8;
export const CH_FLIP = 16;
export const CH_ALL = CH_Y | CH_ROT | CH_SCALE | CH_SHADOW | CH_FLIP;

/** 一個演員每幀輸出的通道值（單一物件重複使用，不逐幀配置） */
export interface QChannels {
    /** 垂直位移（頭高 H，向上為正） */
    y: number;
    /** 旋轉（度） */
    rot: number;
    scaleX: number;
    scaleY: number;
    /** 影子縮放與透明度（乘數） */
    shadowScale: number;
    shadowAlpha: number;
    /** 水平翻轉乘數（1 或 -1，轉身過程會經過 0；已含面向與 noFlip 處理） */
    flipX: number;
}

/** 通道規格：`type` 對應 curves.ts 的曲線，其餘為該曲線的參數 */
export interface QChannelSpec {
    type: string;
    [param: string]: unknown;
}

export interface QClipEventSpec {
    /** 片段內時間（秒，未乘速度） */
    t: number;
    name: string;
}

export interface QClipDef {
    loop: boolean;
    /** 循環片段的週期（秒） */
    period?: number;
    /** 單次片段的長度（秒） */
    duration?: number;
    /** 切入此片段的預設淡入秒數；沒寫就用預算表 defaultFadeSec */
    fadeInSec?: number;
    channels: {
        y?: QChannelSpec;
        rot?: QChannelSpec;
        scale?: QChannelSpec;
        shadow?: QChannelSpec;
        flipX?: QChannelSpec;
    };
    events?: QClipEventSpec[];
}

export interface QClipLibrary {
    schema: string;
    clips: Record<string, QClipDef>;
}

export interface QTierBudget {
    /** 同畫面 Q 頭上限 */
    maxActors: number;
    /** 全速（LOD0）頭數 */
    lod0Actors: number;
    maxDuels: number;
    frameBudgetMs: number;
    targetFps: number;
}

export type QTierName = 'low' | 'mid' | 'high';

export interface QAnimBudget {
    schema: string;
    defaultTier: QTierName;
    /** LOD 重算間隔（秒），不是每幀 */
    lodRecomputeSec: number;
    /** 單幀 dt 上限（切回前景時避免一次跳很大） */
    maxDtSec: number;
    defaultFadeSec: number;
    /** 物件池上限 = maxActors + poolSpare */
    poolSpare: number;
    lod1: { everyNFrames: number; channels: string[] };
    tiers: Record<QTierName, QTierBudget>;
}

export interface PlayOpts {
    /** 覆寫片段的 loop（例如把 jump 變循環） */
    loop?: boolean;
    speed?: number;
    /** 錯開相位與隨機的種子；沒給就用演員的 seed */
    seed?: number;
    fadeInSec?: number;
}

/** 演員：套用端實作。管理器只認這個介面，不認武將、場景、符號 */
export interface IQActor {
    /** 預設種子（呼吸、轉頭的相位錯開用） */
    seed: number;
    /** 頭圖有左右不對稱特徵（如眼罩）時為 true：不做負 scale 翻轉 */
    noFlip?: boolean;
    /** 離焦點距離（呼叫端維護；越小越優先全速） */
    focusDistance?: number;
    /** 畫面外或被彈窗蓋住（呼叫端維護） */
    culled?: boolean;
    /** 每次更新後把通道值套到畫面上 */
    apply(ch: Readonly<QChannels>): void;
    /** 可選：收到此演員的事件（也可用 manager.on 全域訂閱） */
    onEvent?(name: string, clipId: string): void;
}

export type QAnimEventCb = (handle: ActorHandle, name: string, clipId: string) => void;

export function createChannels(): QChannels {
    return { y: 0, rot: 0, scaleX: 1, scaleY: 1, shadowScale: 1, shadowAlpha: 1, flipX: 1 };
}

export function resetChannels(c: QChannels): void {
    c.y = 0;
    c.rot = 0;
    c.scaleX = 1;
    c.scaleY = 1;
    c.shadowScale = 1;
    c.shadowAlpha = 1;
    c.flipX = 1;
}
