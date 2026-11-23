/**
 * playtest-avatar-talk.js — 頭像點擊說話的實跑驗收輔助（PROG-2-9885）
 *
 * 流程：先在頁面內量出「被點頭像」的世界座標範圍，用真滑鼠點下去，再讀共用泡泡（節點 AvatarTalkBubble）：
 *   - 有沒有出現、說了什麼；
 *   - 泡泡中心離頭像中心多遠（應貼在頭像旁，不是跑到角落）；
 *   - 有沒有壓到畫面上可按的按鈕（泡泡矩形與按鈕矩形相交；包含頭像的整列按鈕、面積過大的容器不算）。
 * 座標一律用世界座標比較，不需換算頁面座標。
 */
'use strict';

/** 頁面內：找名稱符合 nameRe 的作用中節點（可限定在 underRe 第一個符合節點底下），回傳世界矩形 */
function measureAnchor(nameRe, underRe) {
    const cc = window.cc;
    const walk = (root, visit) => {
        const stack = [root];
        while (stack.length) {
            const node = stack.pop();
            if (visit(node) === false) return;
            for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
        }
    };
    let root = cc.director.getScene();
    if (underRe) {
        let under = null;
        walk(root, (n) => { if (!under && n.activeInHierarchy && new RegExp(underRe).test(n.name)) { under = n; return false; } return true; });
        if (!under) return null;
        root = under;
    }
    let hit = null;
    walk(root, (n) => { if (!hit && n.activeInHierarchy && new RegExp(nameRe).test(n.name) && n.getComponent('cc.UITransform')) { hit = n; return false; } return true; });
    if (!hit) return null;
    const b = hit.getComponent('cc.UITransform').getBoundingBoxToWorld();
    return { name: hit.name, x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
}

/** 頁面內：讀泡泡狀態與壓到的按鈕 */
function readBubble(anchor) {
    const cc = window.cc;
    const all = [];
    const stack = [cc.director.getScene()];
    while (stack.length) {
        const n = stack.pop();
        all.push(n);
        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
    }
    const bubble = all.find((n) => n.name === 'AvatarTalkBubble' && n.activeInHierarchy);
    if (!bubble) {
        const path = (n) => { const a = []; for (let c = n; c; c = c.parent) a.unshift(`${c.name}${c.active ? '' : '(off)'}`); return a.join('>'); };
        return { active: false, all: all.filter((n) => n.name === 'AvatarTalkBubble').map((n) => ({ self: n.active, inHierarchy: n.activeInHierarchy, path: path(n) })) };
    }
    const box = bubble.getComponent('cc.UITransform').getBoundingBoxToWorld();
    const label = bubble.getChildByName('Text') && bubble.getChildByName('Text').getComponent('cc.Label');
    const vs = cc.view.getVisibleSize();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const overlapping = [];
    for (const n of all) {
        if (!n.activeInHierarchy || n === bubble || bubble.getChildByName(n.name) === n) continue;
        const button = n.getComponent('cc.Button');
        if (!button || !button.interactable) continue;
        const ui = n.getComponent('cc.UITransform');
        if (!ui) continue;
        const b = ui.getBoundingBoxToWorld();
        if (b.width > vs.width * 0.45 || b.height > vs.height * 0.45 || b.width <= 0 || b.height <= 0) continue;
        // 包含頭像的整列／整面板按鈕不算「被壓住的關鍵按鈕」
        if (anchor && anchor.x >= b.x && anchor.x <= b.x + b.width && anchor.y >= b.y && anchor.y <= b.y + b.height) continue;
        const w = Math.min(box.x + box.width, b.x + b.width) - Math.max(box.x, b.x);
        const h = Math.min(box.y + box.height, b.y + b.height) - Math.max(box.y, b.y);
        if (w > 2 && h > 2) overlapping.push(`${n.name}(${Math.round(w)}x${Math.round(h)})`);
    }
    return {
        active: true,
        parent: bubble.parent ? bubble.parent.name : null,
        siblingIsLast: bubble.parent ? bubble.getSiblingIndex() === bubble.parent.children.length - 1 : null,
        text: label ? String(label.string) : null,
        center: { x: Math.round(cx), y: Math.round(cy) },
        size: { w: Math.round(box.width), h: Math.round(box.height) },
        anchorDistance: anchor ? Math.round(Math.hypot(cx - anchor.x, cy - anchor.y)) : null,
        overlapping,
        visible: { w: Math.round(vs.width), h: Math.round(vs.height) },
        insideScreen: box.x >= -2 && box.y >= -2 && box.x + box.width <= vs.width + 2 && box.y + box.height <= vs.height + 2,
    };
}

/**
 * 點頭像並驗收。spec＝真滑鼠 locate 規格（{ name, under }）。
 * 回傳 { clicked, anchor, bubble, note }；clicked 為 null 代表找不到或被擋住（note 說明）。
 */
async function tapAvatarAndProbe({ page, rm, spec, waitMs = 500, shotTo }) {
    await page.evaluate(() => {
        if (window.__avtHooked) return;
        window.__avtHooked = true;
        window.__avtLog = [];
        for (const k of ['log', 'info', 'warn', 'debug']) {
            const orig = console[k];
            console[k] = (...a) => { const t = a.map(String).join(' '); if (t.includes('AvatarTalk')) window.__avtLog.push(`${Date.now() % 100000} ${t.slice(0, 160)}`); return orig.apply(console, a); };
        }
    });
    const anchor = await page.evaluate(measureAnchor, spec.name, spec.under || null);
    const clicked = await rm.tryClick(spec);
    if (!clicked) {
        const blocked = rm.takeBlocked();
        return { clicked: null, anchor, bubble: null, note: blocked.length ? blocked.join('；') : '找不到可點的頭像節點' };
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const bubble = await page.evaluate(readBubble, anchor);
    bubble.log = await page.evaluate(() => (window.__avtLog || []).slice(-3));
    if (shotTo) await shotTo(`${spec.name}-${waitMs}ms`);
    return { clicked, anchor, bubble, note: '' };
}

module.exports = { tapAvatarAndProbe, measureAnchor, readBubble };
