---
doc_id: doc_agentskill_0044
name: gpt-image-2-gen
description: 'GPT Image 2 image generation workflow for this repo MCP server. Use for gpt-image-2, OpenAI image generation, concept art, UCUF reference exploration, UI icon, badge, card art, prompt drafting, transparent-background asset drafts, and saving generated images to local files under artifacts/ui-source or other workspace paths.'
argument-hint: 'Describe the image goal, prompt, output path, size, quality, background, output format, and whether you need raw concept art, UCUF reference exploration, or partial UI asset exploration.'
---

# GPT Image 2 Image Generation

用這個 skill 走專案內建的 GPT Image 2 MCP server，而不是臨時手打 OpenAI API。

Unity 對照：這比較像把「外部美術生成服務」包成固定 Editor utility；不同 Agent 只要呼叫同一支 wrapper，就不會各自散落 API key 或臨時腳本。

## When to Use

- 需要用 GPT Image 2 生概念圖、圖示草稿、badge、卡面母稿或 UI 視覺探索。
- 需要透明背景、較高品質或不同輸出格式的 OpenAI image model 生成流程。
- 需要把生成結果直接落地到 `artifacts/` 或其他工作資料夾。

## Do Not Use

- 不要用這個 skill 直接覆蓋正式量產資產或 `.meta`。
- 不要把 OpenAI API Key 寫進 prompt、文件、腳本或對話輸出。
- 不要把它當成最終 UI 成品產線；它是概念生成與候選稿工具。

## Procedure

1. 先整理 prompt。
2. 長 prompt 優先寫成文字檔，再用 `--prompt-file` 傳入，避免終端 quoting 問題。
3. 執行 [generate-gpt-image-2.js](./scripts/generate-gpt-image-2.js)。
4. 若要落地檔案，提供 `--output`；wrapper 會自動下載 URL 或解碼 base64。
5. 之後再由對應任務流程做 compare board、縮圖、去背、切圖或 QA。

## Commands

先驗 MCP server 與 tool 是否正常，不生圖：

```powershell
node .github/skills/gpt-image-2-gen/scripts/generate-gpt-image-2.js --self-test --json
```

短 prompt 直接跑：

```powershell
node .github/skills/gpt-image-2-gen/scripts/generate-gpt-image-2.js --prompt "single centered antique tiger tally icon, worn bronze, transparent background, readable at 32x32, no modern flat vector style" --size 1024x1024 --quality high --background transparent --output-format png --output artifacts/ui-source/icons/reference/generated/gpt-image-2-tiger-tally-v1.png --json
```

長 prompt 建議走文字檔：

```powershell
node .github/skills/gpt-image-2-gen/scripts/generate-gpt-image-2.js --prompt-file artifacts/ui-source/prompts/tiger-tally-v1.txt --size 1024x1024 --quality high --background transparent --output-format png --output artifacts/ui-source/icons/reference/generated/gpt-image-2-tiger-tally-v1.png --json
```

只要模型回傳資訊，不下載：

```powershell
node .github/skills/gpt-image-2-gen/scripts/generate-gpt-image-2.js --prompt-file artifacts/ui-source/prompts/card-bg-v1.txt --size 1536x1024 --quality medium --background opaque --output-format jpeg --json
```

## Options

- `--size`: `1024x1024`、`1024x1536`、`1536x1024`、`auto`
- `--quality`: `low`、`medium`、`high`、`auto`
- `--background`: `transparent`、`opaque`、`auto`
- `--output-format`: `png`、`jpeg`、`webp`
- `--output`: 本地輸出路徑；若模型回傳 base64 會解碼，若回傳 URL 會下載

## Prompt Guidance

- UI icon / badge 類：明確要求 `single centered subject`、`transparent background`、`readable at 32x32`。
- 若要避免現代 app icon 感，明確寫 `no modern flat ui, no clean vector icon, no plastic gloss`。
- 卡面 / 背景類：若要進一步升格 runtime 大背景，先放 `artifacts/ui-library/` 或 `artifacts/ui-source/`，正式 runtime 大背景依 keep 規則轉 JPG。
- 探索多方向時，拆成 `v1 / v2a / v2b / v2c` prompt file，不要把多個方向塞進同一條 prompt。

## Outputs

Wrapper 會回傳：

- `model`
- `url` 或 `hasBase64`
- revised prompt（若模型提供）
- 若指定 `--output`，會把生成圖保存到本地
- 若指定 `--json`，輸出機器可讀 JSON，方便後續 Agent 串接
- 若指定 `--self-test`，只驗證 MCP 連線與 `generate_image_gpt_image_2` 是否存在，不會消耗生圖額度

## Notes

- MCP server 位置：`tools_mcp/gpt-image-2-mcp/`
- API Key 由 server 自己讀 `.env`；wrapper 不處理金鑰
- `.env` 可沿用 `tools_mcp/dalle3-mcp/.env`，但不可把 key 寫進文件或輸出
- 若 OpenAI 端調整 `gpt-image-2` 參數支援度，先更新 MCP server 的 schema 與 wrapper option，再跑 `--self-test`

## Image View Guard 提醒

生成圖片後，若需要 `view_image` 檢視，必須先跑：

```powershell
node tools_node/prepare-view-image-progressive.js --input <path> --level thumb
```

若 `125px` 不足，才依序升到 `inspect`、`detail`。
