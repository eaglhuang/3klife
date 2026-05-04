// const { Color } = require('cc');
// Wait, I need a mock for 'cc' because I'm in Node.js.
// Or I can just check the logic in UISkinResolver.ts and replicate it if it's pure enough.

class MockColor {
    constructor(r=255, g=255, b=255, a=255) {
        this.r = r; this.g = g; this.b = b; this.a = a;
    }
    toString() { return `rgba(${this.r},${this.g},${this.b},${this.a})`; }
}

function resolveColor(hex, tokens = null) {
    if (!hex) return new MockColor(255, 255, 255, 255);
    if (hex.startsWith('#')) {
        // Direct hex
    } else if (tokens && tokens.colors && tokens.colors[hex]) {
        hex = tokens.colors[hex];
    }
    
    if (!hex.startsWith('#')) {
        return new MockColor(0, 0, 0, 0);
    }

    const cleanHex = hex.replace('#', '');
    if (cleanHex.length < 6) return new MockColor(255, 255, 255, 255);

    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const a = cleanHex.length >= 8 ? parseInt(cleanHex.substring(6, 8), 16) : 255;
    return new MockColor(r, g, b, a);
}

const tokens = {
    colors: {
        "primary": "#FF0000",
        "secondary": "#00FF0080"
    }
};

const cases = [
    "#FFFFFF",
    "#000000",
    "#FF0000FF",
    "primary",
    "secondary",
    "invalid",
    ""
];

const results = cases.map(c => ({
    input: c,
    output: resolveColor(c, tokens)
}));

console.log(JSON.stringify(results, null, 2));
