'use strict';
const { spawnSync } = require('child_process');
const { createHash } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), '3klife-0134-probe-'));
const bodyPath = path.join(root, 'response.txt');
const url = 'https://zh.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent('曹操');
try {
    const result = spawnSync('curl.exe', ['--silent', '--show-error', '--max-time', '20',
        '--output', bodyPath, '--write-out', '%{http_code}', url], { encoding: 'utf8', windowsHide: true });
    const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
    const report = { checkedAt: new Date().toISOString(), url, httpStatus: Number(result.stdout?.trim() || 0),
        exitCode: result.status, bodySha256: createHash('sha256').update(body).digest('hex'),
        bodyBytes: body.length, proxyEnvironmentChanged: false, proxyBypass: false,
        responseBodyPersisted: false, error: result.error?.code || null };
    fs.writeFileSync(path.join(__dirname, 'wiki-probe.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify(report) + '\n');
} finally {
    if (fs.existsSync(bodyPath)) fs.unlinkSync(bodyPath);
    fs.rmdirSync(root);
}
