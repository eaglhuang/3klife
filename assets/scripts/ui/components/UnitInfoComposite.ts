import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2)
/**
 * UnitInfoComposite — 從左側滑入的兵種詳細資訊面板（CompositePanel 版）
 *
 * UCUF Wave 2 — 將 UnitInfoPanel（UIPreviewBuilder）遷移至 CompositePanel 架構。
 *
 * 職責：
 *   1. 點擊虎符卡片後顯示（fadeIn/fadeOut 進場退場）
 *   2. 填入兵種數值、特性標籤、特殊能力、兵種描述
 *   3. BtnClose 或外部呼叫 hide() 關閉面板
 *
 * 遷移重點：
 *   - buildScreen() → mount('unit-info-panel-screen')
 *   - onReady(binder) → _onAfterBuildReady(binder)
 *   - 保留 show(data) / hide() / isVisible 公開 API 相同
 *   - 數值、特性、能力、說明合成一段會換行的內文（PROG-2-9390）
 *
 * Unity 對照：CharacterInfoPanel，帶 SlideIn 動畫的 UGUI Panel
 */
import { _decorator, Button, Color, Label, Node, Sprite, SpriteFrame, ScrollView, UITransform } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { TroopTypeBadge } from '../shared/TroopTypeBadge';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { TallyCardData } from './TigerTallyComposite';

const { ccclass } = _decorator;
const WHITE = new Color(255, 255, 255, 255);
/** 兵種單字的顏色：與面板標題同一系的淡金色 */

/** 面板內文四周留白（與版面檔一致） */
const UNITINFO_BODY_PADDING = 12;

/** 同一張卡的判斷鍵：再按同一張卡要關面板 */
function unitInfoKey(data: TallyCardData): string {
    return `${data.unitType}|${data.unitName}`;
}

/**
 * 兵種資訊面板的內文：數值兩行、特性、特殊能力、說明，全部放在同一段會自動換行的文字裡。
 * 以前每個數值各佔一列小字，面板要很高才放得下，會蓋到棋盤（PROG-2-9390）。
 */
export function buildUnitInfoBody(data: TallyCardData): string {
    const lines: string[] = [
        `攻擊 ${data.atk}　防禦 ${data.def}　生命 ${data.hp}`,
        `速度 ${data.spd}　糧草 ${data.cost}`,
    ];
    const traits = data.traitDetails?.map(detail => detail.label) ?? data.traits ?? [];
    if (traits.length > 0) lines.push(`特性：${traits.join('、')}`);
    const abilities = data.abilityDetails?.map(detail => detail.detail ? `${detail.name}：${detail.detail}` : detail.name)
        ?? data.abilities ?? [];
    for (const ability of abilities) lines.push(`・${ability}`);
    if (data.desc) lines.push(data.desc);
    const sourceLine = [data.source?.origin, data.source?.sourceType].filter(Boolean).join(' / ');
    if (sourceLine) lines.push(`出處：${sourceLine}`);
    if (data.source?.obtainHint) lines.push(`取得：${data.source.obtainHint}`);
    const loreParts = [data.lore?.title, data.lore?.summary].filter(Boolean);
    if (loreParts.length > 0) lines.push(`典故：${loreParts.join('｜')}`);
    return lines.join('\n');
}

@ccclass('UnitInfoComposite')
export class UnitInfoComposite extends CompositePanel {

    // ── 內容節點引用（由 _onAfterBuildReady 填入） ────────────────
    private _unitName:  Label | null = null;
    private _unitSub:   Label | null = null;
    private _typeIcon:  Sprite | null = null;
    private _bodyText:  Label | null = null;
    private _scrollView: ScrollView | null = null;
    private _contentNode: Node | null = null;
    private _shownKey: string | null = null;

    private _isMounted = false;
    private _visible = false;

    // ── 生命週期 ─────────────────────────────────────────────

    protected onDestroy(): void {
        this.unmount();
        this._isMounted = false;
    }

    // ── 公開 API ──────────────────────────────────────────────

    /**
     * 掛載並顯示面板。
     * 初次呼叫時掛載 screen；後續呼叫僅更新資料。
     */
    public async show(data: TallyCardData): Promise<void> {
        if (!this._isMounted) {
            await this.mount('unit-info-panel-screen');
            this._isMounted = true;
        }

        this.node.active = true;
        this._populate(data);
        this._shownKey = unitInfoKey(data);
        this._visible = true;
        this.playEnterTransition(this.node, { enter: 'fadeIn', duration: 0.2 });
    }

    /**
     * 關閉面板（退場動畫後 active = false）。
     */
    public hide(): void {
        if (!this._visible) return;
        this._visible = false;
        this._shownKey = null;
        this.playExitTransition(this.node, { exit: 'fadeOut', duration: 0.18 }, () => {
            this.node.active = false;
        });
    }

    /** 面板是否目前可見 */
    public get isVisible(): boolean { return this._visible; }

    /** 面板目前是否正在顯示這張卡 */
    public isShowing(data: TallyCardData): boolean {
        return this._visible && this._shownKey === unitInfoKey(data);
    }

    // ── CompositePanel 鉤子 ───────────────────────────────────

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._unitName    = binder.getLabel('UnitName');
        this._unitSub     = binder.getLabel('UnitSub');
        this._typeIcon    = binder.getSprite('TypeIcon');
        this._bodyText    = binder.getLabel('BodyText');
        this._scrollView  = binder.getScrollView('ScrollView');
        this._contentNode = binder.getNode('ContentNode');
        // 內文從頂端往下排、寬度固定、高度跟著字數長：換行不會溢出面板，太長就捲動
        const contentTf = this._contentNode?.getComponent(UITransform);
        const bodyTf = this._bodyText?.node.getComponent(UITransform);
        if (this._bodyText && contentTf && bodyTf) {
            bodyTf.setAnchorPoint(0.5, 1);
            bodyTf.setContentSize(Math.max(1, contentTf.width - UNITINFO_BODY_PADDING * 2), bodyTf.height);
            this._bodyText.node.setPosition(0, -UNITINFO_BODY_PADDING, 0);
            this._bodyText.overflow = Label.Overflow.RESIZE_HEIGHT;
            this._bodyText.enableWrapText = true;
        }

        binder.getNode('BtnClose')?.on(Button.EventType.CLICK, this.hide, this);

        UCUFLogger.info(LogCategory.UI, `[UnitInfoComposite] 綁定完成 — name:${!!this._unitName} body:${!!this._bodyText}`);
    }

    // ── 私有：資料填充 ────────────────────────────────────────

    private _populate(data: TallyCardData): void {
        if (this._unitName)  this._unitName.string  = data.unitName;
        if (this._unitSub)   this._unitSub.string   = data.unitSub;
        this._applyTypeIcon(data);
        if (!this._bodyText) return;
        this._bodyText.string = buildUnitInfoBody(data);
        this._bodyText.updateRenderData(true);
        const contentTf = this._contentNode?.getComponent(UITransform);
        if (contentTf) {
            const bodyHeight = this._bodyText.node.getComponent(UITransform)?.height ?? 0;
            const viewportHeight = this._scrollView?.node.getComponent(UITransform)?.height ?? 0;
            contentTf.setContentSize(contentTf.width, Math.max(viewportHeight, bodyHeight + UNITINFO_BODY_PADDING * 2));
        }
        // 換卡後回到內文開頭。直接把內文頂端對回可視區頂端，不靠捲動元件算（它在同一格改完高度後會算錯）
        this._scrollView?.stopAutoScroll();
        const viewTf = this._scrollView?.node.getComponent(UITransform);
        if (viewTf && this._contentNode) {
            const pos = this._contentNode.position;
            this._contentNode.setPosition(pos.x, viewTf.height * (1 - viewTf.anchorY), pos.z);
        }
    }

    private _applyTypeIcon(data: TallyCardData): void {
        if (!this._typeIcon) return;
        TroopTypeBadge.mount(this._typeIcon.node).setType(data.unitType);
    }

    /** 圓底上的兵種單字；空字串就藏起來 */
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
}
