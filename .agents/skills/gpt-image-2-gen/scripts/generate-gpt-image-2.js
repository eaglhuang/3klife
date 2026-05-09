#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const repoRoot = path.resolve(__dirname, '../../../../');
const serverDir = path.join(repoRoot, 'tools_mcp', 'gpt-image-2-mcp');
const serverEntry = path.join(serverDir, 'index.js');

const { Client } = require(path.join(serverDir, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'client', 'index.js'));
const { StdioClientTransport } = require(path.join(serverDir, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'client', 'stdio.js'));

const TOOL_NAME = 'generate_image_gpt_image_2';
const VALID_SIZES = new Set(['1024x1024', '1024x1536', '1536x1024', 'auto']);
const VALID_QUALITIES = new Set(['low', 'medium', 'high', 'auto']);
const VALID_BACKGROUNDS = new Set(['transparent', 'opaque', 'auto']);
const VALID_OUTPUT_FORMATS = new Set(['png', 'jpeg', 'webp']);

function printUsage() {
  console.log([
    'Usage:',
    '  node .github/skills/gpt-image-2-gen/scripts/generate-gpt-image-2.js --prompt "..." [--size 1024x1024] [--quality auto] [--background auto] [--output-format png] [--output path] [--json]',
    '  node .github/skills/gpt-image-2-gen/scripts/generate-gpt-image-2.js --prompt-file path/to/prompt.txt [--output path]',
    '',
    'Options:',
    '  --prompt <text>              直接提供 prompt',
    '  --prompt-file <path>         從文字檔讀 prompt',
    '  --size <value>               1024x1024 | 1024x1536 | 1536x1024 | auto',
    '  --quality <value>            low | medium | high | auto',
    '  --background <value>         transparent | opaque | auto',
    '  --output-format <value>      png | jpeg | webp',
    '  --output <path>              下載或解碼生成圖到本地路徑',
    '  --self-test                  只驗證 MCP 連線與 tool 存在，不生圖',
    '  --json                       輸出 JSON',
    '  --help                       顯示說明'
  ].join('\n'));
}

function parseArgs(argv) {
  const options = {
    size: '1024x1024',
    quality: 'auto',
    background: 'auto',
    outputFormat: 'png',
    json: false,
    prompt: '',
    promptFile: '',
    output: '',
    help: false,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--self-test') {
      options.selfTest = true;
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue) {
      throw new Error(`缺少參數值: ${token}`);
    }

    if (token === '--prompt') {
      options.prompt = nextValue;
      index += 1;
      continue;
    }
    if (token === '--prompt-file') {
      options.promptFile = nextValue;
      index += 1;
      continue;
    }
    if (token === '--size') {
      options.size = nextValue;
      index += 1;
      continue;
    }
    if (token === '--quality') {
      options.quality = nextValue;
      index += 1;
      continue;
    }
    if (token === '--background') {
      options.background = nextValue;
      index += 1;
      continue;
    }
    if (token === '--output-format') {
      options.outputFormat = nextValue;
      index += 1;
      continue;
    }
    if (token === '--output') {
      options.output = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`不支援的參數: ${token}`);
  }

  return options;
}

function validateOptions(options) {
  if (!VALID_SIZES.has(options.size)) {
    throw new Error(`不支援的 size: ${options.size}`);
  }
  if (!VALID_QUALITIES.has(options.quality)) {
    throw new Error(`不支援的 quality: ${options.quality}`);
  }
  if (!VALID_BACKGROUNDS.has(options.background)) {
    throw new Error(`不支援的 background: ${options.background}`);
  }
  if (!VALID_OUTPUT_FORMATS.has(options.outputFormat)) {
    throw new Error(`不支援的 output-format: ${options.outputFormat}`);
  }
}

function resolvePrompt(options) {
  if (options.prompt && options.promptFile) {
    throw new Error('`--prompt` 與 `--prompt-file` 只能擇一使用');
  }

  if (options.promptFile) {
    const promptFilePath = path.resolve(repoRoot, options.promptFile);
    if (!fs.existsSync(promptFilePath)) {
      throw new Error(`找不到 prompt file: ${promptFilePath}`);
    }
    return fs.readFileSync(promptFilePath, 'utf8').trim();
  }

  return options.prompt.trim();
}

function collectTextContent(result) {
  if (!Array.isArray(result.content)) {
    return '';
  }

  return result.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
}

function parsePayload(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (_error) {
    const urlMatch = rawText.match(/URL:\s*(\S+)/i);
    const revisedPromptMatch = rawText.match(/(?:Revised Prompt|revised_prompt):\s*([\s\S]*)$/i);
    return {
      ok: Boolean(urlMatch),
      url: urlMatch ? urlMatch[1].trim() : '',
      b64Json: '',
      revisedPrompt: revisedPromptMatch ? revisedPromptMatch[1].trim() : '',
      rawText,
    };
  }
}

function extensionForFormat(outputFormat) {
  if (outputFormat === 'jpeg') {
    return 'jpg';
  }
  return outputFormat;
}

async function saveImage(payload, outputPath, outputFormat) {
  const targetPath = path.resolve(repoRoot, outputPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (payload.b64Json) {
    fs.writeFileSync(targetPath, Buffer.from(payload.b64Json, 'base64'));
    return targetPath;
  }

  if (payload.url) {
    const response = await fetch(payload.url);
    if (!response.ok) {
      throw new Error(`下載失敗: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return targetPath;
  }

  throw new Error(`回傳內容缺少 URL 或 base64，無法輸出 .${extensionForFormat(outputFormat)} 檔案`);
}

function printResult(payload, asJson) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!payload.ok) {
    console.error(`Error: ${payload.error}`);
    if (payload.stderr) {
      console.error(payload.stderr);
    }
    return;
  }

  if (payload.url) {
    console.log(`URL: ${payload.url}`);
  }
  if (payload.savedTo) {
    console.log(`Saved To: ${payload.savedTo}`);
  }
  if (payload.revisedPrompt) {
    console.log(`Revised Prompt:\n${payload.revisedPrompt}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  validateOptions(options);

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`找不到 GPT Image 2 MCP server: ${serverEntry}`);
  }

  const prompt = resolvePrompt(options);
  if (!options.selfTest && !prompt) {
    throw new Error('請提供 `--prompt` 或 `--prompt-file`');
  }

  const client = new Client({
    name: 'gpt-image-2-gen-wrapper',
    version: '1.0.0',
  });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: serverDir,
    stderr: 'pipe',
  });

  const stderrChunks = [];
  if (transport.stderr) {
    transport.stderr.on('data', (chunk) => {
      stderrChunks.push(String(chunk));
    });
  }

  try {
    await client.connect(transport);

    const toolsResult = await client.listTools({});
    const hasTool = toolsResult.tools.some((tool) => tool.name === TOOL_NAME);
    if (!hasTool) {
      throw new Error(`MCP server 未提供 ${TOOL_NAME}`);
    }

    if (options.selfTest) {
      printResult({
        ok: true,
        selfTest: true,
        serverDir,
        toolFound: true,
        availableTools: toolsResult.tools.map((tool) => tool.name),
      }, options.json);
      return;
    }

    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: {
        prompt,
        size: options.size,
        quality: options.quality,
        background: options.background,
        output_format: options.outputFormat,
      },
    });

    const rawText = collectTextContent(result);
    if (result.isError) {
      throw new Error(rawText || 'GPT Image 2 MCP server 回傳錯誤');
    }

    const parsed = parsePayload(rawText);
    let savedTo = '';
    if (options.output) {
      savedTo = await saveImage(parsed, options.output, options.outputFormat);
    }

    printResult({
      ok: true,
      prompt,
      size: options.size,
      quality: options.quality,
      background: options.background,
      outputFormat: options.outputFormat,
      model: parsed.model || 'gpt-image-2',
      url: parsed.url || '',
      hasBase64: Boolean(parsed.b64Json),
      revisedPrompt: parsed.revisedPrompt || '',
      savedTo,
      rawText,
    }, options.json);
  } catch (error) {
    const payload = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stderr: stderrChunks.join('').trim(),
    };
    printResult(payload, options.json);
    process.exitCode = 1;
  } finally {
    await transport.close().catch(() => undefined);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
