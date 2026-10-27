// @spec-source → 血統樹14人UI規格書 §2.3 底部主角與詳細屬性區（MainTargetPanel）（PROG-2-1301，BUI-05 cc 綁定）
/**
 * UIMainTargetPanel — 血統樹底部主角區的 Label 綁定（cc 元件，資料整理在 MainTargetPanelView）
 *
 * 職責：
 *   1. 接收 MainTargetPanelView，把稀有度與兩組詞條寫進對應的 Label。
 *   2. 立繪不在這裡載入：view.portraitPath 由上層決定如何取得 SpriteFrame（資源載入另卡）。
 *
 * 未綁定的 Label 會被略過，不拋例外，方便先排版後接線。
 *
 * Unity 對照：像一個 Prefab 的 View 腳本，[SerializeField] 掛好欄位，Presenter 每次 Set 一份資料。
 */
import { _decorator, Component, Label } from 'cc';
import type { MainTargetPanelView } from '../../core/systems/MainTargetPanelView';
import { formatTraitList } from '../../core/systems/MainTargetPanelText';

const { ccclass, property } = _decorator;

@ccclass('UIMainTargetPanel')
export class UIMainTargetPanel extends Component {

    /** TargetRarity：稀有度文字 */
    @property(Label)
    rarityLabel: Label | null = null;

    /** SkillDetails：已覺醒因子詞條 */
    @property(Label)
    awakenLabel: Label | null = null;

    /** SkillDetails：未解鎖因子詞條 */
    @property(Label)
    lockedLabel: Label | null = null;

    applyView(view: MainTargetPanelView): void {
        if (this.rarityLabel) this.rarityLabel.string = view.rarityTier;
        if (this.awakenLabel) this.awakenLabel.string = formatTraitList(view.awakenTraits);
        if (this.lockedLabel) this.lockedLabel.string = formatTraitList(view.lockedTraits);
    }
}
