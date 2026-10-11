/**
 * SyncHash.ts
 *
 * 同步契約的雜湊算法（客戶端版本）。純 TypeScript，不 import `cc`，可在 Web / Native / Node 測試共用。
 *
 * 契約（必須與 server/src/sync.ts 的 computeTxHash 完全一致）：
 *   Tx_Hash = HMAC-SHA256(key = secret, message = Action + JSON.stringify(Payload) + secret + previousHash)
 *   輸出為 64 字元小寫十六進位；字串以 UTF-8 編碼（與 crypto-js 相同）。
 *
 * 為什麼不用 WebCrypto：pushAction 是同步 API，而 crypto.subtle 只有 Promise 版本。
 *
 * Unity 對照：類似 System.Security.Cryptography.HMACSHA256，但自帶實作，
 * 不依賴平台（WebGL / iOS / Android 行為一致）。
 */

const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** 字串 → UTF-8 位元組（不依賴 TextEncoder，Native JSB 也可用）。 */
export function utf8Encode(input: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
        let code = input.charCodeAt(i);
        // 合併 surrogate pair
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 0xdc00 && low <= 0xdfff) {
                code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
                i++;
            }
        }
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0x10000) {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f),
            );
        }
    }
    return new Uint8Array(bytes);
}

/** SHA-256，回傳 32 bytes。 */
export function sha256(message: Uint8Array): Uint8Array {
    const bitLength = message.length * 8;
    const paddedLength = (((message.length + 9) + 63) >> 6) << 6;
    const padded = new Uint8Array(paddedLength);
    padded.set(message);
    padded[message.length] = 0x80;
    // 長度寫在最後 8 bytes（big-endian）；遊戲資料不會超過 2^32 bits，高位以除法補上
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    padded[paddedLength - 8] = (high >>> 24) & 0xff;
    padded[paddedLength - 7] = (high >>> 16) & 0xff;
    padded[paddedLength - 6] = (high >>> 8) & 0xff;
    padded[paddedLength - 5] = high & 0xff;
    padded[paddedLength - 4] = (low >>> 24) & 0xff;
    padded[paddedLength - 3] = (low >>> 16) & 0xff;
    padded[paddedLength - 2] = (low >>> 8) & 0xff;
    padded[paddedLength - 1] = low & 0xff;

    const h = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const w = new Uint32Array(64);

    for (let offset = 0; offset < paddedLength; offset += 64) {
        for (let t = 0; t < 16; t++) {
            const j = offset + t * 4;
            w[t] = (padded[j] << 24) | (padded[j + 1] << 16) | (padded[j + 2] << 8) | padded[j + 3];
        }
        for (let t = 16; t < 64; t++) {
            const x = w[t - 15];
            const y = w[t - 2];
            const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
            const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
        }

        let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
        for (let t = 0; t < 64; t++) {
            const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const ch = (e & f) ^ (~e & g);
            const temp1 = (hh + S1 + ch + K[t] + w[t]) >>> 0;
            const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;
            hh = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }
        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
        h[5] = (h[5] + f) >>> 0;
        h[6] = (h[6] + g) >>> 0;
        h[7] = (h[7] + hh) >>> 0;
    }

    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
        out[i * 4] = (h[i] >>> 24) & 0xff;
        out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
        out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
        out[i * 4 + 3] = h[i] & 0xff;
    }
    return out;
}

function toHex(bytes: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

/** HMAC-SHA256（RFC 2104），回傳 64 字元小寫 hex。 */
export function hmacSha256Hex(message: string, key: string): string {
    const blockSize = 64;
    let keyBytes = utf8Encode(key);
    if (keyBytes.length > blockSize) {
        keyBytes = sha256(keyBytes);
    }
    const inner = new Uint8Array(blockSize);
    const outer = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
        const k = i < keyBytes.length ? keyBytes[i] : 0;
        inner[i] = k ^ 0x36;
        outer[i] = k ^ 0x5c;
    }

    const messageBytes = utf8Encode(message);
    const innerInput = new Uint8Array(blockSize + messageBytes.length);
    innerInput.set(inner);
    innerInput.set(messageBytes, blockSize);
    const innerHash = sha256(innerInput);

    const outerInput = new Uint8Array(blockSize + innerHash.length);
    outerInput.set(outer);
    outerInput.set(innerHash, blockSize);
    return toHex(sha256(outerInput));
}

/**
 * 計算單筆行動紀錄的鏈式雜湊（同步契約）。
 * @param action       行動代碼，例如 'BATTLE_WIN'
 * @param payload      行動資料；以 JSON.stringify 序列化（undefined 視為 'undefined' 字串，與伺服器相同）
 * @param secret       當前同步金鑰（Session_Secret）
 * @param previousHash 上一筆紀錄的 Tx_Hash，或同步錨點
 */
export function computeSyncTxHash(action: string, payload: unknown, secret: string, previousHash: string): string {
    const payloadStr = JSON.stringify(payload);
    return hmacSha256Hex(`${action}${payloadStr}${secret}${previousHash}`, secret);
}
