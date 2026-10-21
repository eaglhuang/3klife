#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

function parseArg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || index + 1 >= process.argv.length) {
    return fallback;
  }
  return process.argv[index + 1];
}

function buildRunId() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

async function collectDs3SelectedPersonJourney(page) {
    return page.evaluate(async () => {
        const scene = window.cc?.director?.getScene?.();
        const components = scene?.getComponentsInChildren(window.cc.Component) || [];
        const lobby = components.find((component) => typeof component.previewGeneralDetailEntrySmoke === 'function');
        if (!lobby) throw new Error('DS3 journey: LobbyScene unavailable');
        const observations = [];
        for (const variant of ['zhang-fei', 'zhen-ji', 'zhang-fei']) {
            // Re-enter through the real lobby button and rendered list row, never show(config) directly.
            if (lobby._detailPanel?.node.activeInHierarchy) {
                const close = lobby._detailPanel._gdBinder?.getButton('CharacterDs3Main_button_3');
                if (!close?.node.activeInHierarchy || !close.interactable) throw new Error('DS3 journey: close button unavailable');
                close.node.emit(window.cc.Button.EventType.CLICK, close);
                const deadline = Date.now() + 10000;
                while (lobby._detailPanel.node.activeInHierarchy || !lobby._listPanel?.node.activeInHierarchy) {
                    if (Date.now() > deadline) throw new Error('DS3 journey: close did not restore the list');
                    await new Promise((resolve) => setTimeout(resolve, 80));
                }
            }
            await lobby.previewGeneralDetailEntrySmoke('ucuf-nav', variant);
            await lobby.waitForCharacterDs3VisualReady(variant, 10000);
            const panel = lobby._detailPanel;
            const config = panel?._currentConfig;
            const node = panel?.node;
            const rendered = panel?.selectedPersonViewState();
            if (!config || !node || node.__generalDetailGeneralId !== config.id || node.__generalDetailReadyTab !== 'Overview'
                || !rendered?.visible || rendered.name !== config.name
                || rendered.portraitResource !== `sprites/generals/${config.id.replace(/-/g, '_')}_portrait`) {
                throw new Error(`DS3 journey: selected identity not ready (${variant})`);
            }
            const tabs = [];
            for (const [tab, buttonId] of [
                ['Stats', 'CharacterDs3Main_button_5'], ['Tactics', 'CharacterDs3Main_button_6'],
                ['Bloodline', 'CharacterDs3Main_button_7'], ['Equip', 'CharacterDs3Main_button_8'],
                ['Aptitude', 'CharacterDs3Main_button_9'], ['Overview', 'CharacterDs3Main_button_4'],
            ]) {
                const button = panel._gdBinder?.getButton(buttonId);
                if (!button?.node.activeInHierarchy || !button.interactable) throw new Error(`DS3 journey: ${tab} button unavailable`);
                button.node.emit(window.cc.Button.EventType.CLICK, button);
                await panel._operationQueue;
                const current = panel.selectedPersonViewState();
                if (node.__generalDetailReadyTab !== tab || node.__generalDetailGeneralId !== config.id
                    || panel._currentConfig?.id !== config.id || current.portraitResource !== rendered.portraitResource) {
                    throw new Error(`DS3 journey: ${tab} lost selected identity (${variant})`);
                }
                const pending = !['Overview', 'Stats'].includes(tab);
                let visibleLabels = [];
                if (pending) {
                    const slot = panel._resolveDs3ContentSlotHost();
                    const root = slot?.children[slot.children.length - 1];
                    visibleLabels = (root?.getComponentsInChildren(window.cc.Label) || [])
                        .filter((label) => label.node.activeInHierarchy).map((label) => label.string.trim()).filter(Boolean);
                    if (visibleLabels.length === 0 || visibleLabels.some((text) => text !== '—')) {
                        throw new Error(`DS3 journey: ${tab} contains stale/demo content (${variant})`);
                    }
                } else if (tab === 'Overview' && (!current.visible || current.name !== config.name)) {
                    throw new Error(`DS3 journey: Overview did not restore actual name (${variant})`);
                }
                tabs.push({ tab, generalId: config.id, pending, visibleLabels });
            }
            observations.push({ variant, generalId: config.id, tab: node.__generalDetailReadyTab, rendered, tabs });
        }
        const [first, second, reopened] = observations;
        const passed = first.generalId !== second.generalId && first.generalId === reopened.generalId;
        return { guardId: 'ds3-lobby-selected-person-journey', passed,
            failures: passed ? [] : ['A/B/A selection did not change and restore the selected identity'], observations };
    });
}

module.exports = { collectDs3SelectedPersonJourney };

if (require.main === module) {
const projectRoot = path.resolve(__dirname, '..');
const captureScriptPath = path.join(__dirname, 'capture-ui-screens.js');
const browserPath = parseArg('browser', '');
const timeout = parseArg('timeout', '70000');
const retries = parseArg('retries', '1');
const refreshBefore = parseArg('refreshBefore', 'true');
const maxWidth = parseArg('maxWidth', '125');
const outDir = parseArg(
  'outDir',
  path.join('artifacts', 'ui-qa', `general-detail-lobby-flow-smoke-${buildRunId()}`),
);

const args = [
  captureScriptPath,
  '--target', 'GeneralDetailFromLobbyGeneralsButton',
  '--outDir', outDir,
  '--timeout', timeout,
  '--retries', retries,
  '--refreshBefore', refreshBefore,
  '--maxWidth', maxWidth,
];

if (browserPath) {
  args.push('--browser', browserPath);
}

console.log('[check-general-detail-lobby-flow-smoke] 驗證路徑：Lobby 正式按鈕 -> 武將列表點選 A/B/A -> DS3 Composite 身分與關閉重開');
console.log(`[check-general-detail-lobby-flow-smoke] output: ${outDir}`);

const result = spawnSync(process.execPath, args, {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error('[check-general-detail-lobby-flow-smoke] failed to spawn capture-ui-screens:', result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

}
