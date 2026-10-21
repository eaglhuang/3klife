# ui.general 武將詳情 — 寬度風險摘要（第 2 批，40 鍵）

來源：PROG-2-0887。以 zh-TW 為基礎，zh-CN 沿用第 1 批的寫法（與 zh-TW 同字）。

| 鍵值 | zh-TW | en | ja | 風險 | 備註 |
|---|---|---|---|---|---|
| ui.general.title | 武將資料總覽 | General Profile Overview | 武将データ一覧 | 中 | 標題列，en 偏長 |
| ui.general.tab.basics | 基本資料 | Basics | 基本情報 | 低 | 分頁 |
| ui.general.tab.stats | 六色屬性 | Six-Color Stats | 六色属性 | 中 | 分頁，en 偏長 |
| ui.general.tab.bloodline | 血統與因子 | Bloodline & Factors | 血統と因子 | 中 | 分頁，en 偏長 |
| ui.general.tab.skills | 戰法與技能 | Tactics & Skills | 戦法・スキル | 中 | 分頁 |
| ui.general.tab.aptitude | 戰場適性 | Battle Aptitude | 戦場適性 | 中 | 分頁 |
| ui.general.tab.extended | 延伸資訊 | Extended Info | 追加情報 | 低 | 分頁 |
| ui.general.basics_hint | 角色身份、生命週期與不公開欄位狀態會集中在這裡。 | Identity, lifespan and undisclosed field status are gathered here. | 身分・寿命・非公開項目の状態をここにまとめます。 | 高 | 說明文，三語都長，建議多行框 |
| ui.general.stats_hint | 六色屬性決定武將的戰鬥定位… | Six-color stats define battle role… | 六色属性は戦闘上の役割を示します。… | 高 | 說明文，建議多行框 |
| ui.general.skills_hint | 戰法分成已習得、可啟發與未公開三層… | Tactics are split into learned, inspirable and undisclosed tiers. | 戦法は習得済・啓発可能・未公開の3段階… | 高 | 說明文，建議多行框 |
| ui.general.aptitude_hint | 兵種、地形、天氣適性採 S~D 分級… | Troop, terrain and weather aptitude are graded S to D. | 兵種・地形・天候の適性はS〜Dで評価します。 | 高 | 說明文，建議多行框 |
| ui.general.extended_hint | 保留給開發中資訊… | Reserved for in-development, debug and undisclosed info. | 開発中の情報、デバッグ情報、未公開項目用です。 | 高 | 說明文，建議多行框 |
| ui.general.footer_hint | 收藏 / 鎖定 / 比較 / 分享按鈕先保留… | Favorite, lock, compare and share buttons are placeholders… | お気に入り・ロック・比較・共有ボタンは枠のみ先行… | 高 | 說明文，最長，建議多行框或縮句 |
| ui.general.footer.favorite | 收藏 | Favorite | お気に入り | 中 | 底部按鈕，ja 偏長 |
| ui.general.footer.lock | 鎖定 | Lock | ロック | 低 | 底部按鈕 |
| ui.general.footer.compare | 比較 | Compare | 比較 | 低 | 底部按鈕 |
| ui.general.footer.share | 分享 | Share | 共有 | 低 | 底部按鈕 |
| ui.general.sixStats | 六色屬性 | Six-Color Stats | 六色属性 | 中 | 區塊標題 |
| ui.general.coreTags | 核心血統與標籤 | Core Bloodline & Tags | 核心血統とタグ | 中 | 區塊標題，en 偏長 |
| ui.general.basics.uid | UID： | UID: | UID： | 低 | 欄位標籤 |
| ui.general.basics.name | 名稱： | Name: | 名称： | 低 | 欄位標籤 |
| ui.general.basics.title | 稱號： | Title: | 称号： | 低 | 欄位標籤 |
| ui.general.basics.title_locked | 🔒 未定稱號 | 🔒 Title TBD | 🔒 称号未定 | 低 | 欄位值 |
| ui.general.basics.template | 模板 ID： | Template ID: | テンプレートID： | 中 | 欄位標籤，ja 偏長 |
| ui.general.basics.faction | 陣營： | Faction: | 陣営： | 低 | 欄位標籤 |
| ui.general.basics.gender | 性別： | Gender: | 性別： | 低 | 欄位標籤 |
| ui.general.basics.age | 年齡： | Age: | 年齢： | 低 | 欄位標籤 |
| ui.general.basics.age_unit | 歲 | yrs | 歳 | 低 | 單位 |

## 建議
- 說明文（*_hint、footer_hint）三語都偏長，正式接線時建議改多行框，或由 Codex 實機截圖決定是否縮句。
- 其餘為短標籤，風險低到中。以 Codex 實機截圖為準。
- 本批不含養成前綴（bloodline／nurture／mentor／factor／ultimate），那些由養成線處理。
