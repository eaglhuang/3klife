import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 3)
/**
 * TigerTallyComposite — 虎符卡片區（Composite 版）
 * Wave 3 migration from TigerTallyPanel - manage complex 4-card battle unit roster
 * 
 * 職責：
 *   1. 顯示最多 4 張虎符卡（比例 287:142，PROG-2-10131 乙版精簡）
 *   2. 卡面只放重點：兵種章、名稱、品階、持有武將、星級、糧耗、共鳴、灌注小章、出戰中；
 *      攻／防／命、投入兵力、限調改由短按面板顯示（UnitInfoPanel）
 *   3. 品階 4 級 R／SR／SSR／UR 與四種收集狀態的色板、素材路徑全讀 ui-spec/tiger-tally-card-theme.json
 *   4. 點擊卡片 → emit CardSelected 事件；派不出去的卡（軍勢、糧草、條件不足）灰態，點擊仍可查看資訊
 */
import { _decorator, Button, Color, EventTouch, Label, Node, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { UI_EVENTS } from '../core/UIEvents';
import { emitDeployDragDebug, isCardTap } from './DeployDragDebug';
import { logBattleUIPosition } from './BattleUIDiag';
import { TroopTypeBadge } from '../shared/TroopTypeBadge';
import {
    buildTallyCardFaceB,
    TallyCardFaceB,
    TallyCardTheme,
    TallyTierTheme,
    validateTallyCardTheme,
    withTallyCardTextFallback,
    Rgba,
} from '../../core/systems/TallyCardStyle';

const { ccclass } = _decorator;

const UNIT_TYPE_BADGES: Record<string, { icon: string; color: Color }> = {
    cavalry:  { icon: 'CV', color: new Color(212, 175, 55, 255) },
    infantry: { icon: 'IN', color: new Color(58, 143, 217, 255) },
    archer:   { icon: 'AR', color: new Color(155, 109, 255, 255) },
    shield:   { icon: 'SH', color: new Color(136, 136, 136, 255) },
    pikeman:  { icon: 'PK', color: new Color(46, 204, 113, 255) },
    engineer: { icon: 'EN', color: new Color(224, 140, 60, 255) },
    medic:    { icon: 'MD', color: new Color(86, 204, 242, 255) },
    navy:     { icon: 'NV', color: new Color(52, 152, 219, 255) },
};

const DEFAULT_BADGE_DEF = { icon: '？', color: new Color(220, 220, 220, 255) };
const TALLY_CARD_ART_FALLBACK_PATH = 'ui/tiger-tally/card-art/troops/spriteFrame';

/**
 * 卡上文字改點陣快取（PROG-2-9714）：畫好的字打包進動態圖集，與同在圖集內的底板圖合成同一批繪製。
 * 原本每個文字各自一張貼圖、又夾在底板圖之間，每張卡要 12 次繪製、整個面板 48 次。
 * 不用 CHAR：字元圖集是全專案共用的稀缺預算，中文會撐爆（見 LabelCjkCache）。
 * 必須在字串與 SHRINK 設好之後才切：切換快取模式會立刻重排，空字串時節點會被縮成極窄（同 UnitRenderer 徽章）。
 * Unity 對照：把 TMP 文字烘成 Sprite Atlas 裡的圖，讓 UI Batcher 能跟底圖合批。
 */
function useBitmapCacheForCardLabels(cardNode: Node): void {
    for (const label of cardNode.getComponentsInChildren(Label)) {
        if (label.cacheMode === Label.CacheMode.NONE) label.cacheMode = Label.CacheMode.BITMAP;
    }
}
const TALLY_THEME_PATH = 'ui-spec/tiger-tally-card-theme';
/** 卡圖當背景層的基礎暗化（乘色），讓前景文字讀得清楚 */
const ART_BASE_SHADE = 150;
/** 星階共鳴卡的描邊色（淺金） */
const ENHANCED_RING_COLOR: Rgba = [255, 230, 140, 200];
/** 外光暈比框圖大一圈的倍率 */
const GLOW_SCALE = 1.06;

let themePromise: Promise<TallyCardTheme | null> | null = null;
/** 主題資料只載一次；載入失敗或欄位不全就回 null（呼叫端改用內建預設色，不讓卡面空白），且不快取失敗結果 */
function loadTallyCardTheme(): Promise<TallyCardTheme | null> {
    if (!themePromise) {
        themePromise = services().resource.loadJson<TallyCardTheme>(TALLY_THEME_PATH).then((raw) => {
            const problems = validateTallyCardTheme(raw);
            if (problems.length > 0) {
                UCUFLogger.warn(LogCategory.UI, `[TigerTallyComposite] 主題資料不合格：${problems.join('；')}`);
                themePromise = null;
                return null;
            }
            return raw;
        }).catch(() => { themePromise = null; return null; });
    }
    return themePromise;
}

function toColor(c: Rgba, brightness = 1, alphaScale = 1): Color {
    return new Color(
        Math.round(c[0] * brightness),
        Math.round(c[1] * brightness),
        Math.round(c[2] * brightness),
        Math.round(c[3] * alphaScale),
    );
}

import { TallyCardData } from '../../shared/TallyCardContract';
import { guardTicketApplies, withDefenseGuideFallback } from '../../core/systems/DefenseGuide';
export type { TallyCardData } from '../../shared/TallyCardContract';

@ccclass('TigerTallyComposite')
export class TigerTallyComposite extends CompositePanel {
    private _templateBinder: UITemplateBinder | null = null;
    private _cards: TallyCardData[] = [];
    private _guardTicketType: string | null = null;
    private _cardNodes: Node[] = [];
    private _isMounted = false;
    private readonly _cardLoadSeq = [0, 0, 0, 0];
    /** 各卡的短按判定監聽，重畫卡片時要先拔掉舊的（PROG-2-9390） */
    private readonly _cardTapHandlers: Array<((ev: EventTouch) => void) | null> = [null, null, null, null];
    private readonly _warnedFallbacks = new Set<string>();

    async onLoad(): Promise<void> {
        services().initialize(this.node);
        await this.mount();
    }

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
    }

    public async mount(): Promise<void> {
        if (this._isMounted) return;
        try {
            UCUFLogger.info(LogCategory.UI, '[TigerTallyComposite] mount() start — node:', this.node.name, 'parent:', this.node.parent?.name);
            await super.mount('tiger-tally-screen');
            this._isMounted = true;
            // 診斷：mount 完成後記錄位置資訊
            const root = this.node.children[0];
            if (root) {
                logBattleUIPosition('TigerTallyComposite', root);
            }
        } catch (e) {
            UCUFLogger.warn(LogCategory.UI, '[TigerTallyComposite] mount failed', e);
            this._isMounted = true;
        }
    }

    public setCards(cards: TallyCardData[]): void {
        this._cards = cards;
        this._populateCards();
    }

    /** 守城保底券（PROG-2-10041）：持券兵種（null＝沒券）；符合的卡面顯示「保」小標，文字走 i18n */
    public setGuardTicket(unitType: string | null): void {
        this._guardTicketType = unitType;
        this._populateCards();
    }

    /** 卡面「保」小標：模板有 GuardTicketBadge{slot} 就用，否則在卡右上角以錨點（相對比例）建一個，不寫死座標 */
    private _applyGuardTicketBadge(cardNode: Node, slot: number, data: TallyCardData): void {
        const name = `GuardTicketBadge${slot}`;
        let badge = this._templateBinder?.getNode(name) ?? cardNode.getChildByName(name);
        const show = guardTicketApplies(this._guardTicketType, data.unitType);
        if (!badge && !show) return;
        if (!badge) {
            badge = new Node(name);
            badge.layer = cardNode.layer;
            badge.addComponent(UITransform).setContentSize(40, 28);
            const label = badge.addComponent(Label);
            label.fontSize = 22;
            label.lineHeight = 26;
            label.isBold = true;
            label.overflow = Label.Overflow.SHRINK;
            label.color = new Color(255, 214, 90, 255);
            const widget = badge.addComponent(Widget);
            widget.isAlignTop = true;
            widget.isAlignRight = true;
            widget.isAbsoluteTop = false;
            widget.isAbsoluteRight = false;
            widget.top = 0.5;
            widget.right = 0.24;
            cardNode.addChild(badge);
        }
        const label = badge.getComponent(Label);
        if (label) label.string = withDefenseGuideFallback((k, ...a) => services().i18n.t(k, ...a))('ui.battle.defense.guard_badge');
        badge.setSiblingIndex(cardNode.children.length - 1);
        badge.active = show;
    }

    public getCards(): TallyCardData[] {
        return [...this._cards];
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._templateBinder = binder;
        this._cardNodes = [];
        for (let i = 1; i <= 4; i++) {
            const card = binder.getNode(`TallyCard${i}`);
            if (card) this._cardNodes.push(card);
        }
        UCUFLogger.info(LogCategory.UI, `[TigerTallyComposite] ready - ${this._cardNodes.length} card slots`);

        // 診斷：_onAfterBuildReady 時記錄詳細位置
        const root = this.node.children[0];
        if (root) {
            logBattleUIPosition('TigerTallyComposite._onAfterBuildReady', root);
        }

        // 若 setCards() 在 buildScreen 完成前被呼叫（競態），此處重播
        if (this._cards.length > 0) {
            this._populateCards();
        }
    }

    private _populateCards(): void {
        if (!this._templateBinder) return;

        for (let i = 0; i < this._cardNodes.length; i++) {
            const cardNode = this._cardNodes[i];
            if (!cardNode) continue;
            const slot = i + 1;
            const data = this._cards[i] ?? null;

            if (!data) {
                cardNode.active = false;
                continue;
            }
            cardNode.active = true;

            const face = buildTallyCardFaceB(data, withTallyCardTextFallback((k, ...a) => services().i18n.t(k, ...a)));
            this._applyFaceTexts(slot, face);
            useBitmapCacheForCardLabels(cardNode);
            this._applyGuardTicketBadge(cardNode, slot, data);

            const loadSeq = ++this._cardLoadSeq[slot - 1];
            void this._applyTheme(cardNode, slot, face, loadSeq);
            void this._applyCardArt(slot, data, face, loadSeq);
            this._applyUnitTypeBadge(slot, data, loadSeq);

            // 派不出去（軍勢、糧草、條件不足）的灰態：遮罩蓋全卡，框圖與卡圖另外染暗（見 _applyTheme）
            const disabledMask = this._templateBinder.getNode(`DisabledMask${slot}`);
            if (disabledMask) { disabledMask.active = face.grayed; }

            // 短按（按下到放開幾乎沒移動）→ 開兵種資訊面板。
            // 不能靠按鈕的點擊事件：下面為了重綁拖曳會把這張卡的按下監聽整批拔掉，按鈕就收不到點擊了（PROG-2-9390）。
            cardNode.off(Button.EventType.CLICK);
            const prevTap = this._cardTapHandlers[i];
            if (prevTap) cardNode.off(Node.EventType.TOUCH_END, prevTap, this);
            const onTapEnd = (ev: EventTouch) => {
                const start = ev.getUIStartLocation();
                const end = ev.getUILocation();
                if (!isCardTap(start.x, start.y, end.x, end.y)) return;
                emitDeployDragDebug('TigerTallyComposite', 'emit-card-selected', {
                    index: i,
                    unitType: data.unitType,
                });
                services().event.emit(UI_EVENTS.CardSelected, { index: i, data });
            };
            this._cardTapHandlers[i] = onTapEnd;
            cardNode.on(Node.EventType.TOUCH_END, onTapEnd, this);

            // 長按拖曳 → emit CardDragStart，由 DeployComposite 接收啟動 ghost drag
            cardNode.off(Node.EventType.TOUCH_START);
            cardNode.on(Node.EventType.TOUCH_START, (ev: EventTouch) => {
                emitDeployDragDebug('TigerTallyComposite', 'emit-card-drag-start', {
                    index: i,
                    unitType: data.unitType,
                });
                services().event.emit(UI_EVENTS.CardDragStart, { ev, data });
            }, this);
        }

        // Hide unused slots
        for (let i = this._cards.length; i < this._cardNodes.length; i++) {
            this._cardNodes[i].active = false;
        }
    }

    private _applyUnitTypeBadge(slot: number, data: TallyCardData, loadSeq: number): void {
        const badgeNode = this._templateBinder?.getNode(`UnitTypeBadge${slot}`);
        if (!badgeNode) return;

        const sprite = badgeNode.getComponent(Sprite);
        const textNode = badgeNode.getChildByName(`BadgeText${slot}`);
        if (!textNode) return;

        textNode.setSiblingIndex(badgeNode.children.length - 1);
        textNode.active = true;

        const badgeDef = UNIT_TYPE_BADGES[data.unitType] ?? DEFAULT_BADGE_DEF;
        const label = textNode.getComponent(Label);
        if (label) {
            label.string = badgeDef.icon;
            label.color = badgeDef.color;
            label.fontSize = 16;
            label.lineHeight = 18;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.overflow = Label.Overflow.NONE;
            label.isBold = true;
        }
        textNode.setPosition(0, 0, 0);
        textNode.active = false;

        if (sprite) {
            TroopTypeBadge.mount(sprite.node).setType(data.unitType);
        }
    }

    /** 乙版卡面文字：只放重點欄位，其餘改在短按面板（UnitInfoPanel）；文字全走 i18n */
    private _applyFaceTexts(slot: number, face: TallyCardFaceB): void {
        const binder = this._templateBinder;
        if (!binder) return;
        const setText = (name: string, text: string, show = true): void => {
            const node = binder.getNode(`${name}${slot}`);
            if (!node) return;
            const label = node.getComponent(Label);
            if (label) label.string = text;
            node.active = show;
        };
        setText('UnitName', face.name);
        setText('UnitSub', face.ownerLine, face.ownerLine !== '');
        setText('StarsLabel', face.starsText);
        setText('CostBadge', face.grainText);
        setText('ResonanceLabel', face.resonanceText);
        setText('RarityLabel', face.tier);
        setText('InfuseBadge', face.infuseText, face.infuseBadge !== null);
        setText('DeployedFlag', face.deployedText, face.deployedText !== '');
    }

    /** 框圖、拉絲層、外光暈與文字色：全部依主題資料（品階色板與素材路徑）；缺正式框圖就用共用佔位框乘品階色 */
    private async _applyTheme(cardNode: Node, slot: number, face: TallyCardFaceB, loadSeq: number): Promise<void> {
        const theme = await loadTallyCardTheme();
        if (!theme || !this._isLoadSeqCurrent(slot, loadSeq)) return;
        const binder = this._templateBinder;
        if (!binder) return;
        const tt = theme.tiers[face.tier];
        const bright = face.brightness;

        const own = await this._loadThemeFrame(tt.frame);
        const frame = own ?? await this._loadThemeFrame(theme.placeholderFrame);
        if (!this._isLoadSeqCurrent(slot, loadSeq)) return;
        const frameSprite = binder.getSprite(`FrameShell${slot}`);
        if (frame && frameSprite) {
            this._applySliced(frameSprite, frame, theme);
            // 正式框圖自帶色，不再染；佔位框是白底，乘品階色
            frameSprite.color = own ? toColor([255, 255, 255, 255], bright) : toColor(tt.frameTint, bright);
            this._fitToCard(cardNode, frameSprite.node, theme, true);
        }
        this._applyGlow(cardNode, slot, frame, theme, tt, face);

        const brushed = await this._loadThemeFrame(theme.brushed);
        if (!this._isLoadSeqCurrent(slot, loadSeq)) return;
        const brushedSprite = binder.getSprite(`FrameBrushed${slot}`);
        if (brushed && brushedSprite) {
            brushedSprite.spriteFrame = brushed;
            brushedSprite.type = Sprite.Type.TILED;
            brushedSprite.color = new Color(255, 255, 255, Math.round(theme.brushedOpacity * bright));
            this._fitToCard(cardNode, brushedSprite.node, theme, false);
            brushedSprite.node.active = true;
        } else if (brushedSprite) {
            brushedSprite.node.active = false;
        }

        const setColor = (name: string, color: Color): void => {
            const label = binder.getNode(`${name}${slot}`)?.getComponent(Label);
            if (label) label.color = color;
        };
        setColor('UnitName', toColor(tt.accent, bright));
        setColor('StarsLabel', toColor(tt.accent, bright));
        const rarityLabel = binder.getNode(`RarityLabel${slot}`)?.getComponent(Label);
        if (rarityLabel) {
            rarityLabel.color = toColor(tt.chipText, bright);
            rarityLabel.outlineColor = toColor([tt.chipBg[0], tt.chipBg[1], tt.chipBg[2], 255]);
        }
        if (face.infuseBadge) setColor('InfuseBadge', toColor(face.infuseBadge === 'lv8' ? theme.infuse.lv8Color : theme.infuse.lv5Color));
    }

    /** 外光暈：框圖放大一圈墊在後面。SSR／UR 依主題有常駐光暈；R／SR 只有星階共鳴時畫淺金描邊；節點只在需要時才建 */
    private _applyGlow(cardNode: Node, slot: number, frame: SpriteFrame | null, theme: TallyCardTheme, tt: TallyTierTheme, face: TallyCardFaceB): void {
        const name = `FrameGlow${slot}`;
        const color = tt.glow ?? (face.enhancedGlow ? ENHANCED_RING_COLOR : null);
        let glow = cardNode.getChildByName(name);
        if (!color || !frame) {
            if (glow) glow.active = false;
            return;
        }
        if (!glow) {
            glow = new Node(name);
            glow.layer = cardNode.layer;
            glow.addComponent(UITransform);
            glow.addComponent(Sprite);
            cardNode.addChild(glow);
            glow.setSiblingIndex(0);
        }
        const sprite = glow.getComponent(Sprite)!;
        this._applySliced(sprite, frame, theme);
        sprite.color = toColor(color, face.brightness);
        this._fitToCard(cardNode, glow, theme, true, GLOW_SCALE);
        glow.active = true;
    }

    private async _loadThemeFrame(path: string): Promise<SpriteFrame | null> {
        return services().resource.loadSpriteFrame(path, { preferTextureFallback: true }).catch(() => null);
    }

    private _applySliced(sprite: Sprite, frame: SpriteFrame, theme: TallyCardTheme): void {
        sprite.spriteFrame = frame;
        sprite.type = Sprite.Type.SLICED;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const [left, top, right, bottom] = theme.sliceBorder;
        frame.insetLeft = left;
        frame.insetTop = top;
        frame.insetRight = right;
        frame.insetBottom = bottom;
        sprite.node.active = true;
    }

    /**
     * 把框圖類節點鋪滿整張卡。scaled=true：節點等比縮放（卡寬 / 設計寬），尺寸補回設計座標，
     * 使九宮格切邊在 224 寬下維持 287 設計稿的比例；scaled=false：不縮放，直接用卡片尺寸（拉絲層用，平鋪格不跟著縮）。
     */
    private _fitToCard(cardNode: Node, node: Node, theme: TallyCardTheme, scaled: boolean, extra = 1): void {
        const cardUi = cardNode.getComponent(UITransform);
        const ui = node.getComponent(UITransform);
        if (!cardUi || !ui) return;
        const w = cardUi.width > 0 ? cardUi.width : theme.cardWidth;
        const h = cardUi.height > 0 ? cardUi.height : theme.cardHeight;
        node.setPosition(0, 0, 0);
        if (!scaled) {
            node.setScale(1, 1, 1);
            ui.setContentSize(w, h);
            return;
        }
        const base = w / theme.cardWidth;
        node.setScale(base * extra, base * extra, 1);
        ui.setContentSize(w / base, h / base);
    }

    private async _applyCardArt(slot: number, data: TallyCardData, face: TallyCardFaceB, loadSeq: number): Promise<void> {
        const artSprite = this._templateBinder?.getSprite(`ArtBg${slot}`) ?? this._templateBinder?.getSprite(`artBg${slot}`);
        if (!artSprite) return;

        const spriteFrame = await this._loadSpriteFrameWithFallback(
            `tally.card.art[${slot}]`,
            this._buildArtCandidates(data),
            TALLY_CARD_ART_FALLBACK_PATH,
            { preferTextureFallback: true },
        );
        if (!spriteFrame || !this._isLoadSeqCurrent(slot, loadSeq)) return;

        artSprite.spriteFrame = spriteFrame;
        // 卡圖當背景層：先暗化讓前景文字清楚；LOCKED 全黑剪影、DISCOVERED 更暗
        const shade = face.artMode === 'silhouette' ? 0 : face.artMode === 'dim' ? ART_BASE_SHADE * 0.6 : ART_BASE_SHADE;
        const v = Math.round(shade * face.brightness);
        artSprite.color = new Color(v, v, v, 255);
        artSprite.node.active = true;
    }

    private _buildArtCandidates(data: TallyCardData): string[] {
        return this._uniquePaths([data.artResource]);
    }

    private async _loadSpriteFrameWithFallback(
        slotKey: string,
        preferredPaths: string[],
        fallbackPath: string,
        preferredLoadOptions?: { preferTextureFallback?: boolean },
    ): Promise<SpriteFrame | null> {
        for (const path of preferredPaths) {
            const spriteFrame = await services().resource.loadSpriteFrame(path, preferredLoadOptions).catch(() => null);
            if (spriteFrame) {
                return spriteFrame;
            }
        }

        const fallbackFrame = await services().resource.loadSpriteFrame(fallbackPath).catch(() => null);
        if (fallbackFrame) {
            if (preferredPaths.length > 0) {
                this._warnFallback(slotKey, preferredPaths, fallbackPath);
            }
            return fallbackFrame;
        }

        this._warnMissing(slotKey, preferredPaths, fallbackPath);
        return null;
    }

    private _warnFallback(slotKey: string, preferredPaths: string[], fallbackPath: string): void {
        const key = `${slotKey}|${preferredPaths.join(',')}|${fallbackPath}`;
        if (this._warnedFallbacks.has(key)) return;
        this._warnedFallbacks.add(key);
        UCUFLogger.info(LogCategory.UI, 
            `[TigerTallyComposite] ${slotKey} 缺少正式資源，改用 fallback: ${fallbackPath} | tried=${preferredPaths.join(', ')}`,
        );
    }

    private _warnMissing(slotKey: string, preferredPaths: string[], fallbackPath: string): void {
        const key = `${slotKey}|missing|${preferredPaths.join(',')}|${fallbackPath}`;
        if (this._warnedFallbacks.has(key)) return;
        this._warnedFallbacks.add(key);
        UCUFLogger.warn(LogCategory.UI, 
            `[TigerTallyComposite] ${slotKey} 載入失敗，正式資源與 fallback 皆不存在 | tried=${preferredPaths.join(', ')} | fallback=${fallbackPath}`,
        );
    }

    private _uniquePaths(paths: Array<string | null | undefined>): string[] {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const path of paths) {
            const normalized = path?.trim();
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            result.push(normalized);
        }
        return result;
    }

    private _normalizeKey(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    private _isLoadSeqCurrent(slot: number, loadSeq: number): boolean {
        return this._cardLoadSeq[slot - 1] === loadSeq;
    }
}
