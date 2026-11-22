/**
 * HallStyleTokens — 幕府大廳套用「大廳・內政」同一套視覺風格（純 TS，不依賴 cc）。
 *
 * 來源：ui-spec/hall-style/hall-style-tokens.json（數值取自 domestic-screen.skin.json）。
 * UISpecLoader.loadSkin 在 skin 合併後呼叫 restyleHallSkinSlots，只改樣式欄位
 * （顏色、描邊、字型、透明度）；節點 id、尺寸、貼圖、文字與功能都不動。
 *
 * 分類規則（依 slot 本身的 kind 與欄位判斷，不靠節點名稱）：
 *   - label-style：字型統一為 token.font；字級 ≥ titleMinFontSize 用標題色，
 *     按鈕文字用按鈕字色，其餘用內文色。字級與行高保留，避免版面跑掉。
 *   - color-rect／gradient-rect 且 fill 命中 fillRoles：依角色換成次要淡金框或深紅主按鈕。
 *   - 其餘帶金色描邊的面板：換成深色玻璃面板；去掉漸層層（backgroundLayers）。
 *   - 沒有描邊的純色、漸層背景與 sprite-frame 一律保留。
 *
 * Unity 對照：像把同一份 USS / UIStyleSheet 套到一批 Element 上，只改 style，不動 hierarchy。
 */

/** 單一風格角色的樣式欄位（與 skin slot 欄位同名） */
export interface HallStyleRole {
    kind?: string;
    color?: string;
    alpha?: number;
    cornerRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    letterSpacing?: number;
}

export interface HallStyleTokens {
    id: string;
    version: number;
    appliesToSkins: string[];
    font: string;
    titleMinFontSize: number;
    fillRoles: Record<string, string>;
    roles: Record<string, HallStyleRole>;
}

/** 按鈕文字的原始色票：這些色在深色按鈕上是字，套按鈕字色 */
const BUTTON_LABEL_COLORS = new Set(['stdLabelButton', 'colorWhite']);
const PANEL_KINDS = new Set(['color-rect', 'gradient-rect']);
/** 面板換成純色時要一併拿掉的漸層／陰影欄位 */
const GRADIENT_KEYS = ['backgroundLayers', 'gradient', 'opacity'];

type SlotLike = { kind?: string; [key: string]: unknown };

/** 依 token 把整批 skin slot 換成大廳・內政風格；回傳新物件，不改動傳入的 slots。 */
export function restyleHallSkinSlots<T extends object>(
    slots: Record<string, T>,
    tokens: HallStyleTokens,
): Record<string, T> {
    const out: Record<string, T> = {};
    for (const key of Object.keys(slots)) {
        out[key] = restyleSlot(slots[key], tokens) as T;
    }
    return out;
}

/** 單一 slot 的套用；無法辨識或不需要換的 slot 原樣回傳。 */
export function restyleSlot<T extends object>(slot: T, tokens: HallStyleTokens): T {
    if (!slot || typeof slot !== 'object') return slot;
    const s = slot as unknown as SlotLike;
    if (s.kind === 'label-style') return restyleLabel(s, tokens) as unknown as T;
    if (typeof s.kind === 'string' && PANEL_KINDS.has(s.kind)) return restylePanel(s, tokens) as unknown as T;
    return slot;
}

function restyleLabel(slot: SlotLike, tokens: HallStyleTokens): SlotLike {
    const fontSize = typeof slot.fontSize === 'number' ? slot.fontSize : 0;
    const originalColor = typeof slot.color === 'string' ? slot.color : '';
    let roleName = 'labelBody';
    if (fontSize >= tokens.titleMinFontSize) roleName = 'labelTitle';
    else if (BUTTON_LABEL_COLORS.has(originalColor)) roleName = 'labelButton';
    const role = tokens.roles[roleName] ?? {};
    return { ...slot, font: tokens.font, color: role.color ?? slot.color };
}

function restylePanel(slot: SlotLike, tokens: HallStyleTokens): SlotLike {
    const fill = typeof slot.color === 'string' ? slot.color : '';
    const hasBorder = typeof slot.borderColor === 'string' && slot.borderColor.length > 0;
    const roleName = tokens.fillRoles[fill] ?? (hasBorder ? 'glassPanel' : null);
    if (!roleName) return slot;
    const role = tokens.roles[roleName];
    if (!role) return slot;

    const next: Record<string, unknown> = { ...slot };
    for (const key of GRADIENT_KEYS) delete next[key];
    return { ...next, ...role, kind: 'color-rect' } as SlotLike;
}
