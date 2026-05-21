<!-- doc_id: doc_index_1001 -->

# ATM 100% 自我原子化推進區

這個目錄是 3KLife 端的中文計畫管理區，用來承接 ATM framework 自我 dogfood 的規劃、任務卡與推進紀錄。

## 邊界

- 3KLife 保存中文計畫書、任務卡、決策脈絡與人類討論紀錄。
- AI-Atomic-Framework 只保存會影響框架行為的 contract、CLI、guard、validator、atom/map spec 與 evidence。
- 本目錄不是 ATM repo 的 runtime state，也不直接修改 `.atm/`。

## 入口

- 主計畫書：./ATM框架100%自我原子化計畫書.md
- 任務卡索引：./tasks/README.md

## 任務前綴

- `TASK-ASA-*`：ATM Self Atomization，ATM 框架自我原子化推進任務。
- 狀態預設為 `planned`，實作時再依照 3KLife task lock 流程 claim / in-progress / done。

## 不放進 ATM repo 的內容

- 中文討論紀錄
- 大量任務卡與人類推進摘要
- 尚未變成正式框架 contract 的決策草稿

## 必須回到 ATM repo 的內容

- CLI / guard / validate / atomize tooling 實作
- atomic registry、atom spec、map spec、test report、provenance audit
- release gate、doctor、agent pack instruction 的正式 contract
