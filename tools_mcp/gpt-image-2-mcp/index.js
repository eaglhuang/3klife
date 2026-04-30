require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const OpenAI = require('openai');

const TOOL_NAME = 'generate_image_gpt_image_2';
const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const VALID_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
const VALID_QUALITIES = ['low', 'medium', 'high', 'auto'];
const VALID_BACKGROUNDS = ['transparent', 'opaque', 'auto'];
const VALID_OUTPUT_FORMATS = ['png', 'jpeg', 'webp'];

const server = new Server(
  {
    name: 'gpt-image-2-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function enumSchema(values, defaultValue, description) {
  return {
    type: 'string',
    enum: values,
    default: defaultValue,
    description,
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: TOOL_NAME,
        description: 'Generate an image using OpenAI GPT Image 2. Returns a JSON text payload with url or base64 image data.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The detailed prompt to generate the image.',
            },
            size: enumSchema(VALID_SIZES, '1024x1024', 'Image size.'),
            quality: enumSchema(VALID_QUALITIES, 'auto', 'Generation quality. Use high only when cost/time is acceptable.'),
            background: enumSchema(VALID_BACKGROUNDS, 'auto', 'Background handling. Use transparent for icons/assets when supported.'),
            output_format: enumSchema(VALID_OUTPUT_FORMATS, 'png', 'Returned image encoding format when the model supports base64 output.'),
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

function optionalImageParams(args) {
  const params = {
    model: DEFAULT_MODEL,
    prompt: args.prompt,
    n: 1,
  };

  if (args.size && args.size !== 'auto') {
    params.size = args.size;
  }
  if (args.quality && args.quality !== 'auto') {
    params.quality = args.quality;
  }
  if (args.background && args.background !== 'auto') {
    params.background = args.background;
  }
  if (args.output_format) {
    params.output_format = args.output_format;
  }

  return params;
}

function normalizeImageData(response) {
  const first = response && Array.isArray(response.data) ? response.data[0] : null;
  if (!first) {
    throw new Error('OpenAI response did not contain image data.');
  }

  return {
    model: DEFAULT_MODEL,
    url: first.url || '',
    b64Json: first.b64_json || '',
    revisedPrompt: first.revised_prompt || '',
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== TOOL_NAME) {
    throw new Error('Tool not found');
  }

  const args = request.params.arguments || {};
  const prompt = String(args.prompt || '').trim();
  if (!prompt) {
    return {
      content: [{ type: 'text', text: '生成錯誤: prompt is required' }],
      isError: true,
    };
  }

  try {
    const openai = new OpenAI();
    const response = await openai.images.generate(optionalImageParams({ ...args, prompt }));
    const payload = normalizeImageData(response);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ok: true, ...payload }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `生成錯誤: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GPT Image 2 MCP Server is running!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
