#!/usr/bin/env node
// validate-art-wiring.js
// GDART-10：武將人物介面美術接線清單的 icon 槽位檢核
// @spec-source → 武將人物介面美術接線清單（§3 頁籤接線表的 icon 資產欄位）
//
// 由 validate-ui-specs.js 呼叫，不單獨接閘門。
//
// 檢查項目：
//   1. 接線表中的 icon 資產路徑必須是 sprites/…/spriteFrame 形式（不允許 .. 或反斜線）
//   2. 路徑對應的圖檔是否已落地：未落地只列為缺口（規格允許 placeholder），不判失敗

'use strict';

const ICON_PATH_PATTERN = /`(sprites\/[^`]+?\/spriteFrame)`/g;
const ICON_IMAGE_EXTENSIONS = ['.png', '.jpg', '.webp'];

/** 從規格 Markdown 收集所有 icon 槽位路徑（去重，保留出現順序）。 */
function parseArtWiringIconSlots(markdown) {
    const seen = new Set();
    const slots = [];
    for (const match of String(markdown).matchAll(ICON_PATH_PATTERN)) {
        const slot = match[1];
        if (seen.has(slot)) continue;
        seen.add(slot);
        slots.push(slot);
    }
    return slots;
}

/** 路徑格式問題；空陣列代表格式正常。 */
function malformedSlotReason(slot) {
    if (slot.includes('..')) return '含 ..';
    if (slot.includes('\\')) return '含反斜線';
    if (/\s/.test(slot)) return '含空白';
    return null;
}

/**
 * 回傳 { slots, malformed, missing }。
 * - malformed：格式問題（判失敗）
 * - missing：資產未落地（只列缺口）
 * resolveImage(slot) 由呼叫端提供，回傳該 slot 是否有對應圖檔，方便測試注入假檔案系統。
 */
function checkArtWiringIcons(markdown, resolveImage) {
    const slots = parseArtWiringIconSlots(markdown);
    const malformed = [];
    const missing = [];
    for (const slot of slots) {
        const reason = malformedSlotReason(slot);
        if (reason) {
            malformed.push(`${slot}（${reason}）`);
            continue;
        }
        if (!resolveImage(slot)) missing.push(slot);
    }
    return { slots, malformed, missing };
}

/** 依 Cocos resources 慣例找圖：sprites/x/spriteFrame → <resourcesRoot>/sprites/x.{png,jpg,webp} */
function makeResourceResolver(resourcesRoot, existsSync) {
    return (slot) => {
        const base = slot.replace(/\/spriteFrame$/, '');
        return ICON_IMAGE_EXTENSIONS.some((ext) => existsSync(`${resourcesRoot}/${base}${ext}`));
    };
}

module.exports = { parseArtWiringIconSlots, checkArtWiringIcons, makeResourceResolver };
