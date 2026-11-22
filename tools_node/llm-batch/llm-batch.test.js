'use strict';
const test = require('node:test');
const assert = require('node:assert');
const lb = require('./llm-batch');
const ar = require('./agent-run');
const hc = require('./hall-chat');

const schema = {
  type: 'object',
  required: ['lines'],
  properties: { lines: { type: 'array', minItems: 2, items: { type: 'string', maxLength: 10 } } },
};

function fakeClient(texts, usage = { input_tokens: 1000, output_tokens: 500 }) {
  return {
    messages: {
      batches: {
        create: async ({ requests }) => ({ id: 'b1', processing_status: 'in_progress', n: requests.length }),
        retrieve: async () => ({ id: 'b1', processing_status: 'ended', request_counts: { processing: 0 } }),
        results: async () => (async function* () {
          for (const [id, text] of Object.entries(texts)) {
            yield { custom_id: id, result: { type: 'succeeded', message: { content: [{ type: 'text', text }], usage, stop_reason: 'end_turn' } } };
          }
        })(),
      },
    },
  };
}

const task = (extra = {}) => ({ name: 't', model: 'claude-sonnet-5-5', maxTokens: 500, promptTemplate: '寫 {{name}}', schema, rows: [{ id: 'a', name: '甲' }, { id: 'b', name: '乙' }], ...extra });

test('usageCost 套批次折扣', () => {
  // Sonnet 5.5：1M 入 $2 + 1M 出 $10，批次五折 = $6
  assert.strictEqual(lb.usageCost('claude-sonnet-5-5', { input_tokens: 1e6, output_tokens: 1e6 }), 6);
});

test('buildRequests 套模板並檢查重複 id', () => {
  const reqs = lb.buildRequests(task());
  assert.strictEqual(reqs[0].params.messages[0].content, '寫 甲');
  assert.deepStrictEqual(reqs[0].params.output_config.format.schema, lb.stripUnsupported(schema));
  assert.strictEqual(reqs[0].params.output_config.format.schema.properties.lines.minItems, undefined);
  assert.throws(() => lb.buildRequests(task({ rows: [{ id: 'a', name: 'x' }, { id: 'a', name: 'y' }] })), /重複/);
  assert.throws(() => lb.buildRequests(task({ rows: [{ id: 'a' }] })), /缺欄位/);
});

test('validateSchema 抓出長度與項數錯誤', () => {
  assert.deepStrictEqual(lb.validateSchema({ lines: ['一', '二'] }, schema), []);
  assert.ok(lb.validateSchema({ lines: ['一'] }, schema).length > 0);
  assert.ok(lb.validateSchema({ lines: ['一二三四五六七八九十十一', '二'] }, schema).length > 0);
  assert.ok(lb.validateSchema({}, schema).length > 0);
});

test('runBatch：成功、驗證失敗、費用統計', async () => {
  const client = fakeClient({ a: JSON.stringify({ lines: ['好', '棒'] }), b: JSON.stringify({ lines: ['只有一句'] }) });
  const r = await lb.runBatch(task(), client, { pollMs: 0 });
  assert.strictEqual(r.okCount, 1);
  assert.strictEqual(r.rows[1].ok, false);
  assert.match(r.rows[1].error, /結構驗證失敗/);
  // 每筆 1000 入 + 500 出 = (2000+5000)/1e6 * 0.5 = 0.0035；兩筆 0.007
  assert.ok(Math.abs(r.costUsd - 0.007) < 1e-9);
});

test('單批上限：預估超過就不送出', async () => {
  let created = false;
  const client = fakeClient({});
  client.messages.batches.create = async () => { created = true; };
  await assert.rejects(lb.runBatch(task({ maxTokens: 60000 }), client, { capUsd: 0.0001, pollMs: 0 }), /超過單批上限/);
  assert.strictEqual(created, false);
});

test('agent-run：環境只注入金鑰且移除訂閱憑證，log 遮蔽金鑰', () => {
  const env = ar.buildChildEnv({ SANGUO_ANTHROPIC_API_KEY: 'sk-test-123', CLAUDE_CODE_OAUTH_TOKEN: 'x', PATH: 'p' });
  assert.strictEqual(env.ANTHROPIC_API_KEY, 'sk-test-123');
  assert.strictEqual(env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
  assert.throws(() => ar.buildChildEnv({}), /未設定/);
  assert.strictEqual(ar.makeRedactor('sk-test-123')('a sk-test-123 b'), 'a [REDACTED] b');
  assert.strictEqual(ar.parseArgs(['--prompt-file', 'a.md', '--cwd', '.']).maxUsd, 3);
});

test('hall-chat pendingIds：只挑還沒有台詞的武將（空陣列也算沒有）', () => {
  const gens = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const book = { generals: { a: [{ id: 'l1', text: 'x' }], c: [] } };
  assert.deepStrictEqual(hc.pendingIds(gens, book), ['b', 'c', 'd']);
  assert.deepStrictEqual(hc.pendingIds(gens, { generals: {} }), ['a', 'b', 'c', 'd']);
  assert.deepStrictEqual(hc.pendingIds(gens, null), ['a', 'b', 'c', 'd']);
});
