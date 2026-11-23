// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Color, Component, Label, Node, UITransform, Widget } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { SceneName } from '../../core/config/Constants';
import { ensureGlobalDevOverlay } from '../dev/GachaDevOverlay';
import { showSettingsAbout } from '../dev/SettingsAboutModal';
import { installAdaptiveResolution } from '../core/AdaptiveResolution';
import { UIScreenPreviewHost } from '../components/UIScreenPreviewHost';
import { TitleScreenBinder } from '../core/TitleScreenBinder';
import { currentSearch, runQaBattleEntry } from './QaBattleEntryRunner';
import { installQaTime } from '../../battle/views/QaTimeController';
import { formatQaBattleErrors, isQaBattleRequested } from '../../core/systems/QaBattleEntry';

const { ccclass } = _decorator;

/** 場景裡的舊版標題節點；標題畫面掛上後隱藏，掛載失敗時留著當備援 */
const LEGACY_TITLE_NODES: readonly string[] = ['Button', 'TitleLabel', 'SubtitleLabel', 'BtnStart'];

@ccclass('LoginScene')
export class LoginScene extends Component {

    private _title: TitleScreenBinder | null = null;

    onLoad(): void {
        // 舊版標題一開始就藏起來（PROG-2-2240）：標題載入期間只看到啟動底圖，不露出灰底舊標題；載入失敗才拿出來備援。
        this._setLegacyTitleActive(this.node, false);
    }

    start(): void {
        installAdaptiveResolution();
        ensureGlobalDevOverlay();
        // QA 慢動作／定格（PROG-2-9405）：沒有 qa* 參數時直接回傳，不改任何全域
        installQaTime(currentSearch());
        // 沒帶 ?qaBattle 參數時維持原流程，完全不經過直進入口（PROG-2-9127）
        if (!isQaBattleRequested(currentSearch())) {
            void this._mountTitleScreen();
            return;
        }
        void this._bootWithQaBattle();
    }

    /** 網頁 QA 直進戰場（PROG-2-9127）：驗證通過直接切往戰場、不掛標題畫面；失敗則照常掛標題並在畫面顯示錯誤 */
    private async _bootWithQaBattle(): Promise<void> {
        const outcome = await runQaBattleEntry();
        if (outcome.entered) {
            this._finishWebBoot(); // 移除 HTML 啟動底圖，否則會一路蓋住戰場
            return;
        }
        await this._mountTitleScreen();
        if (outcome.errors && this.node?.isValid) this._showQaError(formatQaBattleErrors(outcome.errors));
    }

    /** 直進參數錯誤：紅字蓋在登入畫面上，並同步寫進 console，讓驗證人員一眼看到原因 */
    private _showQaError(text: string): void {
        console.error(`[LoginScene] ${text}`);
        const node = new Node('QaBattleError');
        node.layer = this.node.layer;
        node.parent = this.node;
        const transform = node.addComponent(UITransform);
        transform.setContentSize(1600, 360);
        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.top = 40;
        widget.isAlignHorizontalCenter = true;
        widget.horizontalCenter = 0;
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = 28;
        label.lineHeight = 38;
        label.color = new Color(255, 80, 80, 255);
        label.overflow = Label.Overflow.RESIZE_HEIGHT;
        label.enableWrapText = true;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.TOP;
        node.setSiblingIndex(this.node.children.length - 1);
    }

    /** 掛上 title-screen（UI-2-0158）：開始遊戲或點畫面任意處進入；左下公告／設定／帳號尚無功能，先隱藏 */
    private async _mountTitleScreen(): Promise<void> {
        const hostNode = new Node('TitleScreenHost');
        hostNode.active = false; // 先隱藏，避免 showScreen 期間閃屏
        hostNode.layer = this.node.layer;
        hostNode.parent = this.node;
        hostNode.addComponent(UITransform).setContentSize(1920, 1080);
        const widget = hostNode.addComponent(Widget);
        widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
        widget.top = widget.bottom = widget.left = widget.right = 0;
        const host = hostNode.addComponent(UIScreenPreviewHost);
        try {
            await host.showScreen('title-screen');
        } catch (error) {
            // 載入途中玩家已進大廳：場景已銷毀，不再動任何節點（PROG-2-9102）
            if (!this.node?.isValid) { this._finishWebBoot(); return; }
            console.warn('[LoginScene] title-screen 載入失敗，改用場景內舊標題', error);
            // 備援：拿出舊標題，但預設 Button 沒有遊戲用途，只留 BtnStart 等節點
            this._setLegacyTitleActive(this.node, true);
            this._hideNamed(this.node, 'Button');
            hostNode.destroy();
            this._finishWebBoot();
            return;
        }
        // 標題載入是非同步的；回來時場景可能已被切走，對已銷毀節點綁事件會丟例外（PROG-2-9102）
        if (!this.node?.isValid || !hostNode.isValid) { this._finishWebBoot(); return; }
        this._title = new TitleScreenBinder(hostNode, Node.EventType.TOUCH_END, { onStart: () => this.onClickStart(), onSide: { settings: () => { showSettingsAbout(this.node); } } });
        hostNode.active = true;
        this._finishWebBoot();
    }

    /** HTML 提示只跨越引擎與標題載入，不遮住已可操作的標題／備援按鈕。 */
    private _finishWebBoot(): void {
        if (typeof document === 'undefined') return;
        document.getElementById('web-boot-progress')?.remove();
        // 標題已畫好才淡出啟動底圖，避免中間閃一格空白畫布
        const backdrop = document.getElementById('web-boot-backdrop');
        if (backdrop) {
            // 這段也被測試以純 JS 執行，不寫型別註記；沒有 rAF 的環境退回 setTimeout
            const nextFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout;
            nextFrame(() => nextFrame(() => {
                if (backdrop.style) backdrop.style.opacity = '0';
                setTimeout(() => backdrop.remove(), 400);
            }));
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('3klife-boot-ready'));
    }

    private _setLegacyTitleActive(root: Node, active: boolean): void {
        for (const child of root.children) {
            if (child.name === 'TitleScreenHost') continue;
            if (LEGACY_TITLE_NODES.includes(child.name)) child.active = active;
            else this._setLegacyTitleActive(child, active);
        }
    }

    private _hideNamed(root: Node, name: string): void {
        for (const child of root.children) {
            if (child.name === name) child.active = false;
            else this._hideNamed(child, name);
        }
    }

    /** 點擊「開始遊戲」按鈕 → SceneManager 攔截，導向 LoadingScene，再由 Loading 切入 LobbyScene */
    public onClickStart() {
        // ✅ 正確流程：Login → LoadingScene（中繼清理） → LobbyScene（大廳）
        services().scene.switchScene(SceneName.Lobby);

        // ---- 若要跳過大廳直接進戰鬥測試，改這行：----
        // services().scene.switchScene(SceneName.Battle);
    }
}
