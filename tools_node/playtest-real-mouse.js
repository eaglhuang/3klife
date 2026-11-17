/**
 * playtest-real-mouse.js — 試玩腳本的「真滑鼠」點擊輔助（PROG-2-9125）
 *
 * 為什麼：用 node.emit('click') 或直接呼叫 handler 會繞過全螢幕遮罩（__ui-backdrop）與輸入攔截，
 * 玩家實際點不動的缺陷腳本抓不到。本模組改成：
 *   1. 在頁面內依條件找節點（語意 id／節點名稱／畫面文字），取世界座標換算成頁面座標；
 *   2. 命中檢查：該座標最上層「會接收輸入」的節點（Button、BlockInputEvents、有觸控監聽）
 *      必須是目標、目標的子孫或目標的祖先，否則回報「被哪個節點擋住」；
 *   3. 通過才用 page.mouse.click(x, y) 真點。
 *
 * 座標換算（正式建置裡 UITransform 類別可能拿不到，改用節點世界座標＋畫面可視尺寸）：
 *   頁面 x = canvas.left + 世界 x × canvas.width ÷ 可視寬
 *   頁面 y = canvas.top + (可視高 − 世界 y) × canvas.height ÷ 可視高
 * UITransform 以 getComponent('cc.UITransform') 字串取得，失敗再退到 node._uiProps.uiTransformComp。
 *
 * 規格（spec）欄位：
 *   ucuf     節點的 UCUF 語意 id（_ucufId），例如 lobby-hall-screen.back
 *   name     節點名稱正規式
 *   text     畫面文字正規式（有 name 時＝該節點底下所有 Label 串起來；沒有 name 時＝直接找 Label 節點本身）
 *   button   true＝只找有 cc.Button 且可按的節點
 *   under    只在名稱符合此正規式的第一個節點底下找
 *   childIndex  搭配 ucuf：改取該節點的第幾個子節點（例如任務牆第幾張卡）
 *   nth      同條件的第幾個（由上往下層級排序，預設 0＝最上層）
 */
'use strict';

/** 頁面內安裝：window.__rm */
function installRealMouse() {
    const cc = window.cc;
    const scene = () => (cc && cc.director ? cc.director.getScene() : null);

    /** 前序走訪（父先於子、先兄後弟＝繪製由下到上）；不進入未啟用的節點 */
    const walkActive = (root, visit) => {
        if (!root) return;
        const stack = [root];
        while (stack.length) {
            const node = stack.pop();
            if (!node.active) continue;
            visit(node);
            for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
        }
    };

    const uiSize = (node) => {
        const t = node.getComponent('cc.UITransform') || (node._uiProps && node._uiProps.uiTransformComp) || null;
        if (!t) return null;
        const size = t.contentSize || { width: t.width, height: t.height };
        const anchor = t.anchorPoint || { x: t.anchorX, y: t.anchorY };
        return { w: size.width, h: size.height, ax: anchor.x, ay: anchor.y };
    };

    /**
     * 世界座標 → 畫面座標（y 朝上、原點左下）的平移量。
     * 大廳的 Canvas 世界座標在可視區中心＝(vw/2, vh/2)，原點就在左下；戰場 Canvas 在 (0,0)，原點在畫面中心。
     * 統一用節點所屬 Canvas 的世界座標換算：偏移 = 可視中心 − Canvas 世界座標。找不到 Canvas 時視為左下原點（偏移 0）。
     */
    const canvasOffset = (node) => {
        const vs = cc.view.getVisibleSize();
        for (let c = node; c; c = c.parent) {
            if (c.getComponent('cc.Canvas')) {
                const cp = c.worldPosition;
                return { x: vs.width / 2 - cp.x, y: vs.height / 2 - cp.y };
            }
        }
        return { x: 0, y: 0 };
    };

    /** 世界座標矩形（忽略旋轉，已換成畫面座標）：{l, r, b, t} */
    const worldRect = (node) => {
        const s = uiSize(node);
        if (!s || !(s.w > 0) || !(s.h > 0)) return null;
        const p = node.worldPosition;
        const sc = node.worldScale;
        const w = s.w * Math.abs(sc.x);
        const h = s.h * Math.abs(sc.y);
        const o = canvasOffset(node);
        const l = p.x + o.x - s.ax * w;
        const b = p.y + o.y - s.ay * h;
        return { l, r: l + w, b, t: b + h };
    };

    const frame = () => {
        const vs = cc.view.getVisibleSize();
        const cv = cc.game.canvas.getBoundingClientRect();
        return { vw: vs.width, vh: vs.height, left: cv.left, top: cv.top, cw: cv.width, ch: cv.height };
    };
    const toPage = (wx, wy, f) => ({
        x: f.left + (wx * f.cw) / f.vw,
        y: f.top + ((f.vh - wy) * f.ch) / f.vh,
    });
    const toWorld = (px, py, f) => ({
        x: ((px - f.left) * f.vw) / f.cw,
        y: f.vh - ((py - f.top) * f.vh) / f.ch,
    });

    const button = (node) => node.getComponent('cc.Button');
    const T = () => cc.Node.EventType;
    /** 會接收（並吃掉）輸入的節點：可按的 Button、BlockInputEvents、有觸控／滑鼠監聽 */
    const isReceiver = (node) => {
        const b = button(node);
        if (b && b.enabledInHierarchy !== false && b.interactable) return 'Button';
        if (node.getComponent('cc.BlockInputEvents')) return 'BlockInputEvents';
        if (node.getComponent('cc.ScrollView')) return 'ScrollView';
        const types = T();
        if (node.hasEventListener(types.TOUCH_START) || node.hasEventListener(types.TOUCH_END)
            || node.hasEventListener(types.MOUSE_DOWN) || node.hasEventListener(types.MOUSE_UP)) return 'TouchListener';
        return null;
    };

    const chainOf = (node) => {
        const names = [];
        for (let c = node; c && c.parent; c = c.parent) names.unshift(c.name);
        return names.slice(-4).join('>');
    };
    const isInside = (node, ancestor) => {
        for (let c = node; c; c = c.parent) if (c === ancestor) return true;
        return false;
    };
    const textUnder = (node) => {
        let text = '';
        walkActive(node, (n) => {
            const l = n.getComponent('cc.Label');
            if (l && l.string) text += l.string;
        });
        return text;
    };
    const ownText = (node) => {
        const l = node.getComponent('cc.Label');
        return l && l.string ? String(l.string) : '';
    };

    /** 最上層會接收輸入的節點（世界座標） */
    const topReceiverAt = (wx, wy) => {
        let top = null;
        walkActive(scene(), (node) => {
            const kind = isReceiver(node);
            if (!kind) return;
            const r = worldRect(node);
            if (r && wx >= r.l && wx <= r.r && wy >= r.b && wy <= r.t) top = { node, kind };
        });
        return top;
    };

    const matchNodes = (spec) => {
        const out = [];
        let root = scene();
        if (spec.under) {
            let hit = null;
            walkActive(root, (n) => { if (!hit && new RegExp(spec.under, 'i').test(n.name)) hit = n; });
            root = hit;
        }
        const nameRe = spec.name ? new RegExp(spec.name, 'i') : null;
        const textRe = spec.text ? new RegExp(spec.text) : null;
        walkActive(root, (node) => {
            if (spec.button && !spec.ucuf) {
                const b0 = button(node);
                if (!b0 || !b0.interactable) return;
            }
            if (spec.ucuf) {
                if (node._ucufId !== spec.ucuf) return;
                if (spec.childIndex !== undefined) {
                    const child = node.children[spec.childIndex];
                    if (!child || !child.active) return;
                    out.push(child);
                    return;
                }
            } else if (nameRe) {
                if (!nameRe.test(node.name)) return;
                if (textRe && !textRe.test(textUnder(node))) return;
            } else if (textRe) {
                if (!textRe.test(ownText(node))) return;
            } else {
                return;
            }
            if (spec.button) {
                const b = button(node);
                if (!b || !b.interactable) return;
            }
            out.push(node);
        });
        return out; // 前序：越後面越上層
    };

    const describeBlocker = (top, f) => {
        if (!top) return null;
        const r = worldRect(top.node);
        const op = top.node.getComponent('cc.UIOpacity');
        return {
            name: top.node.name,
            kind: top.kind,
            path: chainOf(top.node),
            siblingIndex: top.node.getSiblingIndex(),
            size: r ? `${Math.round(r.r - r.l)}x${Math.round(r.t - r.b)}` : null,
            opacity: op ? op.opacity : null,
        };
    };

    /** 找節點並做命中檢查；不點擊 */
    const locate = (spec) => {
        const f = frame();
        const nodes = matchNodes(spec);
        if (!nodes.length) return { found: false };
        const nth = spec.nth || 0;
        // 由最上層（最後）往下挑第一個命中檢查通過的；都不通過就回報最上層那個的阻擋者
        const ordered = nodes.slice().reverse();
        let firstFail = null;
        const tries = nth ? [ordered[nth]].filter(Boolean) : ordered;
        for (const node of tries) {
            const r = worldRect(node);
            if (!r) { firstFail = firstFail || { node, reason: '節點沒有尺寸（UITransform 取不到或寬高為 0）' }; continue; }
            const cx = (r.l + r.r) / 2;
            const cy = (r.b + r.t) / 2;
            if (cx < 0 || cx > f.vw || cy < 0 || cy > f.vh) {
                firstFail = firstFail || { node, reason: `節點中心在視窗外（世界 ${Math.round(cx)},${Math.round(cy)}；可視 ${Math.round(f.vw)}x${Math.round(f.vh)}）`, rect: r };
                continue;
            }
            const top = topReceiverAt(cx, cy);
            const page = toPage(cx, cy, f);
            const ok = Boolean(top && (isInside(top.node, node) || isInside(node, top.node)));
            if (ok) return { found: true, ok: true, name: node.name, page, receiver: describeBlocker(top, f), matches: nodes.length };
            firstFail = firstFail || {
                node,
                reason: top ? '該座標最上層接收輸入的是其他節點' : '該座標沒有任何會接收輸入的節點',
                blocker: describeBlocker(top, f),
                page,
            };
        }
        return {
            found: true,
            ok: false,
            name: firstFail.node.name,
            path: chainOf(firstFail.node),
            reason: firstFail.reason,
            blocker: firstFail.blocker || null,
            page: firstFail.page || null,
            matches: nodes.length,
        };
    };

    /** 頁面座標 → 該點最上層接收輸入的節點（診斷／驗證用） */
    const topAtPage = (px, py) => {
        const f = frame();
        const w = toWorld(px, py, f);
        return describeBlocker(topReceiverAt(w.x, w.y), f);
    };

    /** 場景裡名稱為 __ui-backdrop 的作用中節點：回報是否壓在指定節點（下方）之上 */
    const backdropsOver = (anchorUcuf) => {
        const anchor = (() => { let hit = null; walkActive(scene(), (n) => { if (!hit && n._ucufId === anchorUcuf) hit = n; }); return hit; })();
        const order = [];
        walkActive(scene(), (n) => order.push(n));
        const anchorIdx = anchor ? order.indexOf(anchor) : -1;
        const out = [];
        order.forEach((n, idx) => {
            if (n.name !== '__ui-backdrop') return;
            const op = n.getComponent('cc.UIOpacity');
            const r = worldRect(n);
            out.push({
                path: chainOf(n),
                opacity: op ? op.opacity : null,
                size: r ? `${Math.round(r.r - r.l)}x${Math.round(r.t - r.b)}` : null,
                aboveAnchor: anchorIdx >= 0 ? idx > anchorIdx : null,
                receiver: Boolean(isReceiver(n)),
            });
        });
        return { anchorFound: Boolean(anchor), backdrops: out };
    };

    /** 任務牆的卡片列（作用中的列，不含牆頭與頁尾）：[{childIndex, title, meta}]；列的字取子節點第 1、2 個 Label */
    const wallCards = (ucuf) => {
        let wall = null;
        walkActive(scene(), (n) => { if (!wall && n._ucufId === ucuf) wall = n; });
        if (!wall) return null;
        const kids = wall.children;
        const out = [];
        for (let i = 1; i < kids.length - 1; i++) {
            if (!kids[i].active) continue;
            out.push({ childIndex: i, title: kids[i].children[0] ? textUnder(kids[i].children[0]) : '', meta: kids[i].children[1] ? textUnder(kids[i].children[1]) : '' });
        }
        return out;
    };

    /** 符合 spec 的節點數（作用中） */
    const present = (spec) => matchNodes(spec).length;

    /** 名稱符合 re 的第一個作用中節點底下的所有 Label 文字（找不到回傳 null） */
    const textsUnder = (re) => {
        let hit = null;
        walkActive(scene(), (n) => { if (!hit && new RegExp(re, 'i').test(n.name)) hit = n; });
        if (!hit) return null;
        const out = [];
        walkActive(hit, (n) => { const l = n.getComponent('cc.Label'); if (l && l.string && String(l.string).trim()) out.push(String(l.string).trim()); });
        return out;
    };

    /** 提示（Toast）是否正在顯示：ToastContainer 作用中 */
    const toastVisible = () => {
        let hit = false;
        walkActive(scene(), (n) => { if (n.name === 'ToastContainer') hit = true; });
        return hit;
    };

    /** 語意 id 節點底下所有 Label 文字串起來（找不到回傳 null） */
    const textOfUcuf = (ucuf) => {
        let hit = null;
        walkActive(scene(), (n) => { if (!hit && n._ucufId === ucuf) hit = n; });
        return hit ? textUnder(hit) : null;
    };

    /** 畫面上所有符合 re 的 Label 文字（作用中） */
    const texts = (re) => {
        const out = [];
        const rx = new RegExp(re);
        walkActive(scene(), (n) => {
            const l = n.getComponent('cc.Label');
            if (l && l.string && rx.test(l.string)) out.push(String(l.string));
        });
        return out;
    };

    /** 畫面上所有作用中 Label 文字（去頭尾空白、去重），供「有新提示文字」比對 */
    const allTexts = () => {
        const out = new Set();
        walkActive(scene(), (n) => {
            const l = n.getComponent('cc.Label');
            if (l && l.string && String(l.string).trim()) out.add(String(l.string).trim());
        });
        return Array.from(out);
    };

    /** 名稱完全等於 name 的第一個作用中節點底下所有 Label 文字串起來（找不到回傳 null） */
    const textOfNodeName = (name) => {
        let hit = null;
        walkActive(scene(), (n) => { if (!hit && n.name === name) hit = n; });
        return hit ? textUnder(hit) : null;
    };

    window.__rm = { textOfNodeName, locate, topAtPage, backdropsOver, texts, allTexts, frame, wallCards, textOfUcuf, present, textsUnder, toastVisible };
}

/**
 * 建立 Node 端的真滑鼠操作器。
 * @param {import('puppeteer-core').Page | (() => import('puppeteer-core').Page)} pageOrGetter 頁面，或回傳頁面的函式（頁面較晚才建立時用）
 */
function createRealMouse(pageOrGetter, { settleMs = 120 } = {}) {
    const pg = () => (typeof pageOrGetter === 'function' ? pageOrGetter() : pageOrGetter);
    /** 找到但被擋住的紀錄（供輪詢型步驟逾時時一併報告），key 去重 */
    const blocked = new Map();

    const describe = (spec) => JSON.stringify(spec);
    const blockText = (spec, r) => {
        const b = r.blocker;
        const who = b ? `被 ${b.path}（${b.kind}，尺寸 ${b.size}，透明度 ${b.opacity === null ? '無' : b.opacity}，同層序 ${b.siblingIndex}）擋住` : '';
        const where = r.page ? `（頁面座標 ${Math.round(r.page.x)},${Math.round(r.page.y)}）` : '';
        return `真滑鼠點不到 ${r.path || r.name}${where}：${r.reason}${who ? '，' + who : ''}（條件 ${describe(spec)}）`;
    };

    const api = {
        blocked,
        locate: (spec) => pg().evaluate((s) => window.__rm.locate(s), spec),
        /** 點一下；找不到回傳 null；找到但被擋住會記錄並回傳 null（輪詢用）。成功回傳節點名稱 */
        async tryClick(spec) {
            const r = await api.locate(spec);
            if (!r.found) return null;
            if (!r.ok) {
                blocked.set(r.path + '|' + (r.blocker ? r.blocker.path : r.reason), blockText(spec, r));
                return null;
            }
            await pg().mouse.click(Math.round(r.page.x), Math.round(r.page.y));
            await new Promise((resolve) => setTimeout(resolve, settleMs));
            return r.name;
        },
        /** 點一下；找不到或被擋住都丟出說明清楚的錯誤 */
        async click(spec, label) {
            const r = await api.locate(spec);
            if (!r.found) throw new Error(`找不到可點的節點${label ? '「' + label + '」' : ''}（條件 ${describe(spec)}）`);
            if (!r.ok) throw new Error(blockText(spec, r));
            await pg().mouse.click(Math.round(r.page.x), Math.round(r.page.y));
            await new Promise((resolve) => setTimeout(resolve, settleMs));
            return r;
        },
        /** 取出並清空被擋住紀錄（步驟逾時時附在原因後面） */
        takeBlocked() {
            const list = Array.from(blocked.values());
            blocked.clear();
            return list;
        },
        topAtPage: (x, y) => pg().evaluate((px, py) => window.__rm.topAtPage(px, py), x, y),
        backdropsOver: (anchorUcuf) => pg().evaluate((id) => window.__rm.backdropsOver(id), anchorUcuf),
        wallCards: (ucuf) => pg().evaluate((id) => window.__rm.wallCards(id), ucuf),
        textOfNodeName: (name) => pg().evaluate((n) => window.__rm.textOfNodeName(n), name),
        textOfUcuf: (ucuf) => pg().evaluate((id) => window.__rm.textOfUcuf(id), ucuf),
        present: (spec) => pg().evaluate((x) => window.__rm.present(x), spec),
        textsUnder: (re) => pg().evaluate((r) => window.__rm.textsUnder(r), re),
        toastVisible: () => pg().evaluate(() => window.__rm.toastVisible()),
        texts: (re) => pg().evaluate((r) => window.__rm.texts(r), re),
        allTexts: () => pg().evaluate(() => window.__rm.allTexts()),
        install: () => pg().evaluate(installRealMouse),
    };
    return api;
}

module.exports = { installRealMouse, createRealMouse };
