'use strict';
// Select only the 24 rows reported by the existing audit tool. Mapping and
// sentence/disambiguation rules come unchanged from ingest-generals-wiki.js.
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const { createHash } = require('crypto');
const root = path.resolve(__dirname, '../..');
const ingestPath = path.join(root, 'tools_node/ingest-generals-wiki.js');
const ingest = require(ingestPath);
const digest = value => createHash('sha256').update(value).digest('hex');
const audit = fs.readFileSync(path.join(__dirname, 'audit-before.md'), 'utf8');
const section = audit.split('## 疑似截斷')[1]?.split('## 關鍵')[0] || '';
const ids = [...section.matchAll(/^- ([a-z0-9-]+)：historicalAnecdote$/gm)].map(match => match[1]);
if (ids.length !== 24 || new Set(ids).size !== 24) throw new Error('Expected exactly 24 audited unique rows');
const seeds = ids.map(id => ingest.SEED_GENERALS.find(seed => seed.id === id));
if (seeds.some(seed => !seed)) throw new Error('An audited id has no canonical seed');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), '3klife-0134-refresh-'));
const responsePath = path.join(temp, 'response.json');
const cachePath = path.join(root, 'temp_workspace/wiki-cache.json');
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const removed = ids.filter(id => Object.hasOwn(cache, id));
ids.forEach(id => delete cache[id]);
const rows = [], receipts = [];
let stopped = null;
async function main() {
    try {
        for (const seed of seeds) {
            const url = 'https://zh.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(seed.name);
            const result = spawnSync('curl.exe', ['--silent', '--show-error', '--max-time', '20',
                '--user-agent', '3KLife-DataPipeline/1.0 (Cocos Creator game project; research use)',
                '--output', responsePath, '--write-out', '%{http_code}', url], { encoding: 'utf8', windowsHide: true });
            const body = fs.existsSync(responsePath) ? fs.readFileSync(responsePath) : Buffer.alloc(0);
            const status = Number(result.stdout?.trim() || 0);
            receipts.push({ id: seed.id, url, httpStatus: status, exitCode: result.status, bodySha256: digest(body) });
            if (result.status !== 0 || status !== 200) { stopped = { id: seed.id, httpStatus: status, exitCode: result.status }; break; }
            let page;
            try { page = JSON.parse(body.toString('utf8')); } catch { stopped = { id: seed.id, reason: 'invalid-json' }; break; }
            const extract = page.type === 'disambiguation' || ingest.isDisambiguationText(page.extract) ? null : page.extract || null;
            if (extract) cache[seed.id] = extract;
            rows.push(ingest.mapToGeneralBase(seed, extract));
            process.stdout.write(`fetched ${rows.length}/24 ${seed.id}\n`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        const review = rows.filter(row => row.historicalAnecdote.includes('詳細資料待補')
            || row.historicalAnecdote.length > 200 || !/[。！？]$/.test(row.historicalAnecdote.trim())
            || ingest.isDisambiguationText(row.historicalAnecdote)).map(row => row.id);
        const report = { checkedAt: new Date().toISOString(), sourceHead: process.env.SOURCE_HEAD || null,
            ingestSha256: digest(fs.readFileSync(ingestPath)), requestedIds: ids, cacheEntriesRemoved: removed,
            fetchedCount: rows.length, placeholderCount: rows.filter(row => row.historicalAnecdote.includes('詳細資料待補')).length,
            reviewIds: review, stopped, proxyEnvironmentChanged: false, proxyBypass: false,
            canonicalWrites: false, complete: !stopped && rows.length === 24 && review.length === 0, receipts };
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');
        fs.writeFileSync(path.join(__dirname, 'candidates.json'), JSON.stringify(rows, null, 2) + '\n');
        fs.writeFileSync(path.join(__dirname, 'refresh-report.json'), JSON.stringify(report, null, 2) + '\n');
        process.stdout.write(JSON.stringify({ fetched: rows.length, reviewIds: review, stopped, complete: report.complete }) + '\n');
    } finally {
        if (fs.existsSync(responsePath)) fs.unlinkSync(responsePath);
        fs.rmdirSync(temp);
    }
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
