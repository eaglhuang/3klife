# 血脈頁語系譯文與寬度風險摘要（PROG-2-0742）

範圍：`ui.general.bloodline.*` 與 `ui.general.extended.hidden_flags*`。
風險以英文字數判斷（英文通常最先爆版）：40 字以上高、20 字以上中、其餘低。日文與簡中以同位置的字數參考。

| 鍵值 | zh-TW | zh-CN | en | ja | 英文風險 |
|---|---|---|---|---|---|
| `ui.general.bloodline_hint` | 預設顯示血統摘要與因子槽；完整 14 人矩陣後續可接展開視圖。 | 默认显示血统摘要与因子槽；完整 14 人矩阵后续可接展开视图。 | The bloodline summary and factor slots show by default. The full 14-ancestor matrix can be added later as an expandable view. | 既定では血統の概要と因子スロットを表示します。14人分の完全な系譜マトリクスは、今後展開ビューとして追加予定です。 | 高 |
| `ui.general.bloodline.id` | 血統 ID： | 血统 ID： | Bloodline ID:  | 血統ID： | 低 |
| `ui.general.bloodline.parents` | 父母摘要： | 父母摘要： | Parent summary:  | 両親の概要： | 低 |
| `ui.general.bloodline.parents_collapsed` | 🔒 尚未展開父母資料 | 🔒 尚未展开父母资料 | 🔒 Parent data not expanded | 🔒 両親のデータは未展開 | 中 |
| `ui.general.bloodline.ancestors` | 14 人矩陣： | 14 人矩阵： | 14-ancestor matrix:  | 14人マトリクス： | 中 |
| `ui.general.bloodline.ancestors_hint` | 🔒 點擊展開後顯示完整血統矩陣 | 🔒 点击展开后显示完整血统矩阵 | 🔒 Tap to expand the full bloodline matrix | 🔒 タップで完全な血統マトリクスを表示 | 高 |
| `ui.general.bloodline.ep_rating` | 爆發力評級： | 爆发力评级： | Burst rating:  | 爆発力評価： | 低 |
| `ui.general.bloodline.ep_locked` | 🔒 未公開 | 🔒 未公开 | 🔒 Undisclosed | 🔒 非公開 | 低 |
| `ui.general.bloodline.awakening` | 覺醒名號： | 觉醒名号： | Awakened title:  | 覚醒称号： | 低 |
| `ui.general.bloodline.awakening_locked` | 🔒 待覺醒 | 🔒 待觉醒 | 🔒 Not yet awakened | 🔒 未覚醒 | 低 |
| `ui.general.bloodline.hidden_factor` | 隱藏因子： | 隐藏因子： | Hidden factor:  | 隠し因子： | 低 |
| `ui.general.bloodline.hidden_factor_none` | 尚未覺醒 | 尚未觉醒 | Not awakened | 未覚醒 | 低 |
| `ui.general.bloodline.hidden_factor.undefeated` | 不敗 | [ZH-CN] 不败 | [EN] Undefeated | [JA] 不敗 | 低 |
| `ui.general.bloodline.hidden_factor.iron_wall` | 鐵壁 | [ZH-CN] 铁壁 | [EN] Iron Wall | [JA] 鉄壁 | 低 |
| `ui.general.bloodline.hidden_factor.killing_intent` | 殺意 | [ZH-CN] 杀意 | [EN] Killing Intent | [JA] 殺意 | 低 |
| `ui.general.extended.hidden_flags` | 隱藏欄位： | 隐藏栏位： | Hidden fields:  | 非表示項目： | 低 |
| `ui.general.extended.hidden_flags_list` | 🔒 天命值 / 完整祖譜 / 隱藏戰法 | 🔒 天命值 / 完整祖谱 / 隐藏战法 | 🔒 Destiny value / Full genealogy / Hidden tactics | 🔒 天命値 / 完全家系図 / 隠し戦法 | 高 |

## 備註

- `ui.general.bloodline_hint` 是最長的一句（英文約 130 字），建議縮成短句，或改為可摺疊說明，否則在窄欄位會換很多行。
- `ui.general.bloodline.parents_collapsed`、`ui.general.bloodline.ancestors_hint`、`ui.general.extended.hidden_flags_list` 都帶鎖頭符號，英文與日文會再加長，需在實機截圖確認。
- 英文的標籤後面留有結尾空格（如 `Hidden factor: `），和 zh-TW 的全形冒號位置不同，若版面用值接在標籤後面，要實機確認。
- 日文 `ui.general.bloodline_hint` 也偏長（約 60 字），風險中。
- 本摘要沒有做實機截圖驗證。實機確認需要 Web 建置，由 Codex 驗收。
- 譯文由本卡撰寫，未經母語審校。
