/**
 * browser-capture-core.js
 *
 * Unified puppeteer initialization and screenshot capture logic.
 * Extracted common patterns from:
 *   - compare-html-to-cocos-editor.js
 *   - capture-ui-screens.js
 *
 * Exports:
 *   - launchBrowser(opts) - Initialize puppeteer browser
 *   - captureSelector(page, selector, screenshotOpts) - Screenshot by selector
 *   - closeBrowser(browser) - Clean up browser
 */

let puppeteer;
try {
    // eslint-disable-next-line global-require
    puppeteer = require('puppeteer-core');
} catch (error) {
    // Deferred error; will throw when first method is called
}

/**
 * Launch browser with unified configuration.
 *
 * @param {Object} opts - Configuration options
 * @param {string|null} opts.executablePath - Browser executable path
 * @param {Object} opts.viewport - Viewport configuration { width, height, deviceScaleFactor }
 * @param {boolean} [opts.headless=true] - Run headless
 * @param {Array<string>} [opts.args] - Chrome args override (defaults provided if omitted)
 * @returns {Promise<Object>} Puppeteer browser instance
 */
async function launchBrowser(opts = {}) {
    if (!puppeteer) {
        throw new Error('[browser-capture-core] puppeteer-core not installed');
    }

    const { executablePath, viewport, headless = true, args } = opts;

    // Default Chrome args: combine common patterns from both CLI callers
    const defaultArgs = [
        '--disable-gpu',
        '--disable-http-cache',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--allow-file-access-from-files',
    ];

    const launchOpts = {
        executablePath: executablePath || null,
        headless,
        args: args || defaultArgs,
    };

    // If viewport provided, set via defaultViewport in launch options
    // (avoids per-page setViewport call)
    if (viewport && viewport.width && viewport.height) {
        const dpr = viewport.deviceScaleFactor || 1;
        launchOpts.defaultViewport = {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: dpr,
        };
    }

    return puppeteer.launch(launchOpts);
}

/**
 * Capture screenshot of a page or specific selector.
 *
 * @param {Object} page - Puppeteer page instance
 * @param {Object} opts - Screenshot options
 * @param {string} [opts.selector] - CSS selector to screenshot (if omitted, full page)
 * @param {string} opts.path - Output PNG file path
 * @param {Object} [opts.clip] - Clip area { x, y, width, height }
 * @param {number} [opts.waitMs=0] - Wait before screenshot (ms)
 * @returns {Promise<void>}
 */
async function captureSelector(page, opts = {}) {
    if (!page) {
        throw new Error('[browser-capture-core] page instance required');
    }

    const { selector, path, clip, waitMs = 0 } = opts;

    if (!path) {
        throw new Error('[browser-capture-core] output path required');
    }

    // Wait if requested
    if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    // Build screenshot options
    const screenshotOpts = { path };

    if (clip) {
        screenshotOpts.clip = clip;
    } else if (selector) {
        try {
            const element = await page.$(selector);
            if (element) {
                const box = await element.boundingBox();
                if (box) {
                    screenshotOpts.clip = {
                        x: Math.round(box.x),
                        y: Math.round(box.y),
                        width: Math.round(box.width),
                        height: Math.round(box.height),
                    };
                }
            }
        } catch (error) {
            console.warn(`[browser-capture-core] Failed to get bounding box for selector "${selector}":`, error);
        }
    }

    return page.screenshot(screenshotOpts);
}

/**
 * Close browser and clean up resources.
 *
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Promise<void>}
 */
async function closeBrowser(browser) {
    if (browser) {
        try {
            await browser.close();
        } catch (error) {
            console.warn('[browser-capture-core] Error closing browser:', error);
        }
    }
}

/**
 * Set viewport on an existing page.
 * (Utility for cases where browser launched without defaultViewport)
 *
 * @param {Object} page - Puppeteer page instance
 * @param {Object} viewport - Viewport config { width, height, deviceScaleFactor }
 * @returns {Promise<void>}
 */
async function setPageViewport(page, viewport) {
    if (!page || !viewport) return;

    const dpr = viewport.deviceScaleFactor || 1;
    return page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: dpr,
    });
}

/**
 * Navigate page to URL with retry logic.
 *
 * @param {Object} page - Puppeteer page instance
 * @param {string} url - Target URL
 * @param {Object} [opts] - Navigation options
 * @param {string} [opts.waitUntil='networkidle0'] - Wait condition
 * @param {number} [opts.timeout=30000] - Navigation timeout (ms)
 * @returns {Promise<Object>} Navigation result
 */
async function navigatePage(page, url, opts = {}) {
    if (!page || !url) {
        throw new Error('[browser-capture-core] page and url required');
    }

    const { waitUntil = 'networkidle0', timeout = 30000 } = opts;

    return page.goto(url, { waitUntil, timeout });
}

/**
 * Wait for fonts to load (for HTML renders).
 * Suppresses errors if fonts API unavailable.
 *
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<void>}
 */
async function waitForFonts(page) {
    if (!page) return;

    try {
        await page.evaluate(() => {
            if (document.fonts && document.fonts.ready) {
                return document.fonts.ready;
            }
            return Promise.resolve();
        });
    } catch (error) {
        // Fonts API not available; non-fatal
    }
}

module.exports = {
    launchBrowser,
    captureSelector,
    closeBrowser,
    setPageViewport,
    navigatePage,
    waitForFonts,
};
