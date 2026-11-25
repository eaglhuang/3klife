// @spec-source → 見 docs/cross-reference-index.md
import { Camera, Color, Font, Label, Node, Tween, tween, UIOpacity, UITransform, Vec3 } from "cc";
import {
    FLOAT_MISS_TEXT, FLOAT_TEXT_STYLES, FloatStaggerTracker, floatAvoidShift, floatEffectiveHeight, floatHalfWidth,
    type FloatAvoidRect, type FloatTextStyle, type FloatTextType,
} from "./FloatTextStyle";

export type { FloatTextType } from './FloatTextStyle';

interface PoolEntry {
    node: Node;
    label: Label;
    opacity: UIOpacity;
}

/**
 * 動態飄字系統 — 統一管理所有浮動文字
 *
 * 設計特性：
 *   1. 型別驅動：外觀設定（顏色/大小/動畫）集中在 FLOAT_TEXT_STYLES（FloatTextStyle.ts），一目了然
 *   2. 物件池：每種類型維護獨立閒置池，避免 GC 卡頓
 *   3. maxConcurrent 硬上限：連擊時同類型超量則強制回收最舊節點，不讓飄字爆炸
 *   4. BMFont 支援：registerFont() 可替換系統字型（Phase 3 使用）
 *   5. 語系相容：registerFont() 可傳入 I18nSystem.getFont()，讓飄字跟隨語系字型切換
 *
 * Unity 對照：
 *   - 相當於 ObjectPool<TextMeshProUGUI> + AnimationCurve 驅動的浮動傷害數字系統
 *   - maxConcurrent ≈ 物件池的 maxSize + 強制回收最舊物件的 LRU 策略
 *   - registerFont  ≈ TMP_FontAsset 動態替換
 *
 * 使用方式：
 *   // 在 UnitRenderer.initialize() 後 setup
 *   services().floatText.setup(uiRoot, worldCamera, canvasNode);
 *
 *   // 顯示受傷飄字
 *   services().floatText.show('dmg_player', '-50', worldPos);
 *   services().floatText.showDamage(50, worldPos, isCrit);
 *
 *   // 顯示狀態效果
 *   services().floatText.showStatus('中毒', worldPos);
 *   services().floatText.showStatus(services().i18n.t('status.poison'), worldPos);
 */
export class FloatTextSystem {
    private uiRoot: Node | null = null;
    private worldCamera: Camera | null = null;
    private canvasNode: Node | null = null;

    /** 類型 → 閒置節點池 */
    private idlePool = new Map<FloatTextType, PoolEntry[]>();
    /** 類型 → 活躍中節點列表（用於 maxConcurrent 強制回收） */
    private activeList = new Map<FloatTextType, PoolEntry[]>();
    /** 類型 → 自訂字型（BMFont 或語系字型），未設定則使用系統字型 */
    private customFonts = new Map<FloatTextType, Font>();
    /** 同一單位連續跳字的錯開序號記錄 */
    private readonly stagger = new FloatStaggerTracker();
    /** 設定 Label 顏色時共用的暫存色，避免每次跳字 new Color */
    private readonly tmpColor = new Color();
    /** 跳字要避開的標記（例如棋盤 buff 格圖示）；由戰場註冊，離開戰場時清掉（PROG-2-9415） */
    private avoidProvider: (() => readonly FloatAvoidRect[]) | null = null;

    // ─────────────────────────────────────────
    //  初始化
    // ─────────────────────────────────────────

    /**
     * 由 UnitRenderer.initialize() 呼叫，提供 3D→UI 座標轉換所需的節點參照。
     * Unity 對照：相當於在 Canvas 上掛 FloatTextManager component 並拖拉 Camera 參照
     */
    setup(uiRoot: Node, worldCamera: Camera, canvasNode: Node): void {
        this.uiRoot = uiRoot;
        this.worldCamera = worldCamera;
        this.canvasNode = canvasNode;
    }

    /**
     * 為指定類型設定自訂字型（選配）。
     * 未呼叫則使用系統預設字型。
     *
     * 典型使用場景：
     *   Phase 3 - BMFont：services().floatText.registerFont('dmg_crit', critBmFont);
     *   語系字型：services().floatText.registerFont('status', services().i18n.getFont('body'));
     */
    registerFont(type: FloatTextType, font: Font): void {
        this.customFonts.set(type, font);
    }

    /**
     * 註冊跳字要避開的標記（UI 座標，與 setup 的 uiRoot 同一層）。傳 null 取消。
     * 每次跳字只呼叫一次 provider；provider 應回傳重用的陣列，不要每次配置。
     */
    setAvoidProvider(provider: (() => readonly FloatAvoidRect[]) | null): void {
        this.avoidProvider = provider;
    }

    // ─────────────────────────────────────────
    //  主要入口
    // ─────────────────────────────────────────

    /**
     * 顯示飄字（統一入口）
     *
     * @param type     文字類型，決定顏色/大小/動畫
     * @param text     顯示內容（傷害數字、狀態名稱、提示文字…）
     * @param worldPos 3D 世界座標，自動轉換為 Canvas UI 座標
     * @param anchorKey 錨點（通常是單位 id）；同一錨點短時間連續跳字會依序錯開位置，不傳則只有隨機水平偏移
     */
    show(type: FloatTextType, text: string, worldPos: Vec3, anchorKey?: string, offset?: { x: number; y: number }): void {
        if (!this.uiRoot || !this.worldCamera || !this.canvasNode) return;

        const config = FLOAT_TEXT_STYLES[type];
        const uiPos = this.toUiPosition(worldPos);
        const entry = this.acquireEntry(type, config);

        // ── 設定外觀（重用 tmpColor，避免每次跳字配置 Color） ──
        const font = this.customFonts.get(type) ?? null;
        if (font) entry.label.font = font;
        entry.label.fontSize = config.fontSize;
        entry.label.isBold = config.isBold;
        entry.label.string = text;
        // alpha = 255 固定在 label.color，整體淡出由 UIOpacity 控制（避免相互干擾）
        this.tmpColor.set(config.color.r, config.color.g, config.color.b, 255);
        entry.label.color = this.tmpColor;
        // 描邊：讓數字在亂糟糟的戰場上看得清楚（BMFont 的描邊已烘進貼圖，這段只對系統字型生效）
        entry.label.enableOutline = config.outlineWidth > 0;
        if (config.outlineWidth > 0) {
            this.tmpColor.set(config.outlineColor.r, config.outlineColor.g, config.outlineColor.b, config.outlineColor.a);
            entry.label.outlineColor = this.tmpColor;
            entry.label.outlineWidth = config.outlineWidth;
        }
        entry.opacity.opacity = 255;

        // ── 加入場景，設定初始位置與縮放 ──
        entry.node.parent = this.uiRoot;
        // PROG-2-9701：物件池重用（含超過上限回收最舊的）時節點留在舊的層級，會被之後才建立的部隊框蓋住；每次跳字都移到最上層
        entry.node.setSiblingIndex(this.uiRoot.children.length - 1);
        entry.node.layer = this.canvasNode.layer;

        // 錯開：同一錨點連續跳字依序往旁邊、往上排開；再加一點隨機，避免不同單位的字完全重疊
        // PROG-2-9402：依前一個字的存活時間與大小錯開，爆擊大字還在畫面上時後面的字不會疊上去
        const stagger = anchorKey
            ? this.stagger.place(anchorKey, Date.now(), config.durationMs, floatEffectiveHeight(config))
            : { x: 0, y: 0 };
        const offsetX = (Math.random() - 0.5) * 2 * config.randomOffsetX + stagger.x + (offset?.x ?? 0);
        let startX = uiPos.x + offsetX;
        const startY = uiPos.y + stagger.y + (offset?.y ?? 0);
        // PROG-2-9415：往上飄的路徑會蓋到棋盤 buff 格的圖示與倍數時，水平挪到旁邊，兩邊都看得清楚
        const avoid = this.avoidProvider?.();
        if (avoid && avoid.length > 0) {
            startX += floatAvoidShift(startX, startY, floatHalfWidth(text, config), floatEffectiveHeight(config) / 2, config.risePixels, avoid);
        }
        entry.node.setPosition(startX, startY, 0);
        entry.node.setScale(config.startScale, config.startScale, 1);

        const duration = config.durationMs / 1000;

        // ── Tween 1：向上飄動（只動 position，結束時回收節點） ──
        tween(entry.node)
            .to(duration, { position: new Vec3(startX, startY + config.risePixels, 0) }, { easing: 'quadOut' })
            .call(() => this.releaseEntry(type, entry))
            .start();

        // ── Tween 2（獨立）：彈出 → 回彈（只動 scale）。爆擊放大到峰值後用 backOut 回彈到 1 ──
        const scaleTween = tween(entry.node);
        if (config.popInSec > 0) {
            scaleTween.to(config.popInSec, { scale: new Vec3(config.peakScale, config.peakScale, 1) }, { easing: 'quadOut' });
        }
        scaleTween.to(config.settleSec, { scale: new Vec3(1, 1, 1) }, { easing: config.popInSec > 0 ? 'backOut' : 'linear' }).start();

        // ── Tween 3（獨立）：前半段不透明，後半段淡出 ──
        tween(entry.opacity)
            .delay(duration * 0.5)
            .to(duration * 0.5, { opacity: 0 })
            .start();
    }

    // ─────────────────────────────────────────
    //  便捷方法
    // ─────────────────────────────────────────

    /** 顯示傷害數字（isCrit 為 true 時使用暴擊外觀） */
    showDamage(value: number, worldPos: Vec3, isCrit = false, anchorKey?: string): void {
        this.show(isCrit ? 'dmg_crit' : 'dmg_player', `${value}`, worldPos, anchorKey);
    }

    /** 顯示閃避（灰字「閃避」） */
    showMiss(worldPos: Vec3, anchorKey?: string): void {
        this.show('dmg_miss', FLOAT_MISS_TEXT, worldPos, anchorKey);
    }

    /**
     * 顯示狀態效果文字（中毒、暈眩、詛咒…）
     * 建議搭配 I18nSystem：showStatus(services().i18n.t('status.poison'), worldPos)
     */
    showStatus(text: string, worldPos: Vec3): void {
        this.show('status', text, worldPos);
    }

    /** 顯示場景提示文字（Debug 用，半透明） */
    showHint(text: string, worldPos: Vec3): void {
        this.show('hint', text, worldPos);
    }

    // ─────────────────────────────────────────
    //  私有：物件池管理
    // ─────────────────────────────────────────

    private acquireEntry(type: FloatTextType, config: FloatTextStyle): PoolEntry {
        // 優先取閒置節點（動畫已結束的）
        const idle = this.getIdle(type);
        if (idle.length > 0) {
            const entry = idle.pop()!;
            Tween.stopAllByTarget(entry.node);
            Tween.stopAllByTarget(entry.opacity);
            this.getActive(type).push(entry);
            return entry;
        }

        const active = this.getActive(type);

        // 未達上限：建立新節點
        if (active.length < config.maxConcurrent) {
            const entry = this.createEntry();
            active.push(entry);
            return entry;
        }

        // 超過上限：強制回收最舊的活躍節點（LRU 策略）
        // 避免大量連擊時讓節點數量無限增長
        const oldest = active.shift()!;
        Tween.stopAllByTarget(oldest.node);
        Tween.stopAllByTarget(oldest.opacity);
        active.push(oldest);
        return oldest;
    }

    private releaseEntry(type: FloatTextType, entry: PoolEntry): void {
        const active = this.activeList.get(type);
        if (active) {
            const idx = active.indexOf(entry);
            if (idx >= 0) active.splice(idx, 1);
        }
        // 脫離場景、重置狀態、歸還閒置池
        entry.node.parent = null;
        entry.node.setScale(1, 1, 1);
        entry.label.string = '';
        this.getIdle(type).push(entry);
    }

    private createEntry(): PoolEntry {
        const node = new Node('FloatText');
        const tf = node.addComponent(UITransform);
        tf.setContentSize(220, 60);
        const opacity = node.addComponent(UIOpacity);
        const label = node.addComponent(Label);
        label.string = '';   // 明確清空預設字串 "label"，避免設定 BMFont 時觸發 atlas 找不到 ASCII 字元的警告
        label.lineHeight = 60;
        label.overflow = Label.Overflow.NONE;
        return { node, label, opacity };
    }

    private getActive(type: FloatTextType): PoolEntry[] {
        if (!this.activeList.has(type)) this.activeList.set(type, []);
        return this.activeList.get(type)!;
    }

    private getIdle(type: FloatTextType): PoolEntry[] {
        if (!this.idlePool.has(type)) this.idlePool.set(type, []);
        return this.idlePool.get(type)!;
    }

    // ─────────────────────────────────────────
    //  私有：3D 世界座標 → Canvas UI 座標
    // ─────────────────────────────────────────

    /**
     * 將 3D 世界座標轉換為 Canvas 本地座標。
     * 邏輯與 UnitRenderer.toUiPosition() 完全一致，集中在此，不再分散。
     */
    private toUiPosition(worldPos: Vec3): Vec3 {
        const uiPos = new Vec3();
        const screenPos = new Vec3();
        this.worldCamera!.worldToScreen(worldPos, screenPos);
        const uiCamera = this.canvasNode!.getComponentInChildren(Camera);
        if (uiCamera) {
            const uiWorldPos = new Vec3();
            uiCamera.screenToWorld(screenPos, uiWorldPos);
            const uiTrans = this.uiRoot!.getComponent(UITransform);
            if (uiTrans) {
                uiTrans.convertToNodeSpaceAR(uiWorldPos, uiPos);
            }
        } else {
            this.worldCamera!.convertToUINode(worldPos, this.uiRoot!, uiPos);
        }
        return uiPos;
    }
}
