| 索引目錄 | DataCatalog | L0 快速查表服務 |
| 分頁載入器 | DataPageLoader | L1-L5 按需分頁載入服務 |

#### 血統正規化
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 人物登記冊 | PersonRegistry | 去重的中央人物主檔，每人只有一筆記錄 |
| 人物記錄 | PersonRecord | PersonRegistry 中的單筆紀錄（uid、template_id、name、gene_refs、ep_base、faction、is_virtual） |
| 血統連結 | BloodlineLink | 親子關係邊（child_uid, parent_uid, relation: F/M, generation） |
| 血統關係圖 | BloodlineGraph | 以 PersonRegistry + BloodlineLink 組成的圖結構服務 |
| 祖先 uid 鏈 | ancestor_chain | 取代 Ancestors_JSON 嵌套，改為 14 個 uid 的陣列 |
| 虛擬祖先 uid | V_PID_{ID}_{Pos} | 系統補齊的虛擬祖先識別碼格式 |

#### 壓縮與序列化
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 存檔序列化器 | SaveSerializer | 整合 MessagePack + gzip 的統一存檔壓縮服務 |
| 欄位縮寫映射表 | FieldAbbreviationMap | 壓縮/展開模式雙向轉換的 JSON 設定表 |
| 差分補丁 | DeltaPatch / JsonPatch | JSON Patch RFC 6902 格式的存檔變更差分資料 |
| 差分補丁建置器 | DeltaPatchBuilder | 生成和套用 JSON Patch 的服務 |

#### 增量同步
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 差分同步 | DeltaSync | 只上傳存檔差異（DeltaPatch）的同步模式（Phase 2+） |
| 全量同步 | FullSync | 上傳完整存檔快照的同步模式（Phase 1 / fallback） |
| CRDT-lite | CRDTLite | 多裝置離線衝突解決策略（Phase 3，以 vector clock 為核心） |
| 存檔雜湊 | SaveHash | 用於驗證差分補丁基底一致性的 base hash |

#### 增長控管
| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 資料增長監控器 | DataGrowthMonitor | 定期評估本地儲存使用量並發出 warning/error 事件的服務 |
| 季度摘要 | SeasonSummary | 超過 100 場戰鬥後舊場次壓縮成的季度摘要記錄 |
| lore LRU 快取 | LoreCache | 最多 20 位武將故事常駐記憶體的 LRU 快取 |
| 英靈快照 | Spirit_Card | 武將死亡後留存的血脈載體（uid、gene_refs、ep_snapshot、deathContext） |


---