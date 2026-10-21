'use strict';

function createPageDiagnostics(page) {
    const diagnostics = {
        console: [],
        pageErrors: [],
        requestFailures: [],
    };

    page.on('console', (message) => {
        const type = message.type();
        if (type !== 'warning' && type !== 'warn' && type !== 'error') {
            return;
        }

        diagnostics.console.push({
            type,
            text: message.text(),
        });
    });

    page.on('pageerror', (error) => {
        diagnostics.pageErrors.push(String(error));
    });

    page.on('requestfailed', (request) => {
        diagnostics.requestFailures.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure()?.errorText ?? 'unknown',
        });
    });

    return diagnostics;
}

async function collectBrowserViewportDiagnostics(page) {
    return page.evaluate(() => {
        const rectOf = (element) => {
            if (!element || !element.getBoundingClientRect) return null;
            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(rect.x * 1000) / 1000,
                y: Math.round(rect.y * 1000) / 1000,
                width: Math.round(rect.width * 1000) / 1000,
                height: Math.round(rect.height * 1000) / 1000,
                top: Math.round(rect.top * 1000) / 1000,
                left: Math.round(rect.left * 1000) / 1000,
                right: Math.round(rect.right * 1000) / 1000,
                bottom: Math.round(rect.bottom * 1000) / 1000,
            };
        };
        const canvasEl = document.querySelector('canvas');
        const gameDiv = document.querySelector('#GameDiv');
        const cocosContainer = document.querySelector('#Cocos3dGameContainer');
        const styleOf = (element) => {
            if (!element) return null;
            const style = window.getComputedStyle(element);
            return {
                width: style.width,
                height: style.height,
                transform: style.transform,
                transformOrigin: style.transformOrigin,
                position: style.position,
            };
        };
        const canvasRect = rectOf(canvasEl || gameDiv);
        return {
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
            },
            canvasRect,
            gameDivRect: rectOf(gameDiv),
            cocosContainerRect: rectOf(cocosContainer),
            gameDivStyle: styleOf(gameDiv),
            canvasStyle: styleOf(canvasEl),
            toolbarHeight: canvasRect ? Math.max(0, Math.round(canvasRect.top)) : 30,
        };
    });
}

function summarizeDiagnostics(diagnostics) {
    const consoleEntries = Array.isArray(diagnostics?.console) ? diagnostics.console : [];
    const pageErrors = Array.isArray(diagnostics?.pageErrors) ? diagnostics.pageErrors : [];
    const requestFailures = Array.isArray(diagnostics?.requestFailures) ? diagnostics.requestFailures : [];
    const consoleErrorCount = consoleEntries.filter((entry) => entry.type === 'error').length;
    const consoleWarningCount = consoleEntries.filter((entry) => entry.type === 'warning' || entry.type === 'warn').length;

    return {
        consoleErrorCount,
        consoleWarningCount,
        pageErrorCount: pageErrors.length,
        requestFailureCount: requestFailures.length,
    };
}

function collectDiagnosticSamples(diagnostics) {
    const consoleEntries = Array.isArray(diagnostics?.console) ? diagnostics.console : [];
    const counts = new Map();

    for (const entry of consoleEntries) {
        if (!entry || (entry.type !== 'warning' && entry.type !== 'warn' && entry.type !== 'error')) {
            continue;
        }
        const text = String(entry.text || '').replace(/\s+/g, ' ').trim();
        const key = `${entry.type}:${text}`;
        counts.set(key, {
            type: entry.type,
            text,
            count: (counts.get(key)?.count || 0) + 1,
        });
    }

    return Array.from(counts.values())
        .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text))
        .slice(0, 20);
}

function buildRuntimeResiduals(summary, extraResiduals = []) {
    const residuals = [];
    if (summary.consoleErrorCount > 0) {
        residuals.push(`console errors: ${summary.consoleErrorCount}`);
    }
    if (summary.consoleWarningCount > 0) {
        residuals.push(`console warnings: ${summary.consoleWarningCount}`);
    }
    if (summary.pageErrorCount > 0) {
        residuals.push(`page errors: ${summary.pageErrorCount}`);
    }
    if (summary.requestFailureCount > 0) {
        residuals.push(`request failures: ${summary.requestFailureCount}`);
    }
    return residuals.concat(extraResiduals.filter(Boolean));
}

function buildRuntimeStatus(summary, failed) {
    if (failed || summary.pageErrorCount > 0 || summary.requestFailureCount > 0) {
        return 'fail';
    }
    if (summary.consoleErrorCount > 0 || summary.consoleWarningCount > 0) {
        return 'pass-with-minor-residuals';
    }
    return 'pass';
}

async function collectTargetRuntimeGuard(page, target) {
    if (typeof target.runtimeGuard === 'function') return target.runtimeGuard(page, target);
    if (target.id !== 'GeneralDetailOverview'
        && target.id !== 'GeneralDetailOverviewProd'
        && target.id !== 'GeneralDetailOverviewZhenJi'
        && target.id !== 'GeneralDetailOverviewDs3') {
        return null;
    }

    return page.evaluate(() => {
        const cc = window.cc;
        const scene = cc?.director?.getScene?.();
        if (!scene) {
            return {
                guardId: 'general-detail-overview-runtime-visibility',
                passed: false,
                failures: ['scene unavailable'],
                nodes: {},
            };
        }

        const find = (name, node = scene) => {
            if (!node) return null;
            if (node.name === name) return node;
            for (const child of node.children || []) {
                const found = find(name, child);
                if (found) return found;
            }
            return null;
        };

        const readActive = (name) => {
            const node = find(name);
            if (!node) {
                return { exists: false, active: false };
            }
            return {
                exists: true,
                active: Boolean(node.activeInHierarchy ?? node.active),
            };
        };

        const expectedVisible = ['OverviewSlot', 'RightContentArea'];
        const expectedRemoved = ['RightContentAreaFill', 'OverviewStateChrome', 'TopLeftInfo', 'BottomLeftInfo', 'FooterPanel'];
        const failures = [];
        const nodes = {};

        for (const name of expectedVisible) {
            const state = readActive(name);
            nodes[name] = state;
            if (!state.exists) {
                failures.push(`${name} missing`);
            } else if (!state.active) {
                failures.push(`${name} hidden`);
            }
        }

        for (const name of expectedRemoved) {
            const state = readActive(name);
            nodes[name] = state;
            if (state.exists) {
                failures.push(`${name} should be removed`);
            }
        }

        const contentSlot = readActive('ContentSlot');
        nodes.ContentSlot = contentSlot;
        if (contentSlot.exists && contentSlot.active) {
            failures.push('ContentSlot should be hidden during Overview mode');
        }

        return {
            guardId: 'general-detail-overview-runtime-visibility',
            passed: failures.length === 0,
            failures,
            nodes,
        };
    });
}

module.exports = { createPageDiagnostics, collectBrowserViewportDiagnostics, summarizeDiagnostics, collectDiagnosticSamples, buildRuntimeResiduals, buildRuntimeStatus, collectTargetRuntimeGuard };
