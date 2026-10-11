'use strict';

// 驗證公開場景入口與 button event 接線，不代表滑鼠命中／畫面排版驗收。
function validateOracleState(state) {
    if (state.scene !== 'LobbyScene') throw new Error('Expected LobbyScene');
    const label = (name) => state.labels.find((item) => item.name === name);
    if (!label('OracleTitle') || !label('OracleTitle').text.includes('占卜')) {
        throw new Error('Oracle title missing');
    }
    const tokens = label('TokenLabel');
    if (!tokens || !/求籤令\s*×\s*\d+/.test(tokens.text)) {
        throw new Error('Oracle token counter missing');
    }
    return {
        scene: state.scene,
        tokenLabel: tokens.text,
        emptyRoster: Boolean(label('OracleEmptyHint')),
        labels: state.labels,
    };
}

async function runLifecycleFlow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    // 初始場景可能是 BattleScene，等其初始化後才切換，避免中斷非同步資源載入。
    await new Promise((resolve) => setTimeout(resolve, options.initialSettleMs || 8000));
    await page.evaluate(() => new Promise((resolve, reject) => {
        window.cc.director.loadScene('LoginScene', (error) => error ? reject(String(error)) : resolve());
    }));
    await page.waitForFunction(() => {
        function find(node) {
            return Boolean(node.getComponent('LoginScene')) || node.children.some(find);
        }
        const scene = window.cc.director.getScene();
        return scene && scene.name === 'LoginScene' && find(scene);
    }, { timeout });
    await page.evaluate(() => {
        function start(node) {
            const component = node.getComponent('LoginScene');
            if (component) { component.onClickStart(); return true; }
            return node.children.some(start);
        }
        if (!start(window.cc.director.getScene())) throw new Error('Login entry missing');
    });
    const steps = ['LoginScene.onClickStart'];
    if (options.onStep) await options.onStep('login');
    for (const name of ['OpenBondingButton', 'BtnOpenOracle']) {
        await page.waitForFunction((target) => {
            function find(node) {
                const button = node.getComponent('cc.Button');
                return (node.name === target && node.activeInHierarchy && button && button.interactable)
                    || node.children.some(find);
            }
            const scene = window.cc.director.getScene();
            return scene && scene.name === 'LobbyScene' && find(scene);
        }, { timeout }, name);
        await page.evaluate((target) => {
            function click(node) {
                const button = node.getComponent('cc.Button');
                if (node.name === target && node.activeInHierarchy && button && button.interactable) {
                    node.emit('click', button);
                    return true;
                }
                return node.children.some(click);
            }
            if (!click(window.cc.director.getScene())) throw new Error(`Button unavailable: ${target}`);
        }, name);
        steps.push(name);
        if (options.onStep) await options.onStep(name);
    }
    await page.waitForFunction(() => {
        function find(node) {
            return (node.activeInHierarchy && node.name === 'TokenLabel' && node.getComponent('cc.Label'))
                || node.children.some(find);
        }
        return find(window.cc.director.getScene());
    }, { timeout });
    const state = await page.evaluate(() => {
        const scene = window.cc.director.getScene();
        const labels = [];
        function walk(node) {
            if (!node.activeInHierarchy) return;
            const label = node.getComponent('cc.Label');
            if (label) labels.push({ name: node.name, text: label.string });
            node.children.forEach(walk);
        }
        walk(scene);
        return { scene: scene.name, labels };
    });
    return {
        name: 'lifecycle',
        completed: true,
        interaction: 'public-login-method-and-cocos-button-events',
        steps,
        ...validateOracleState(state),
        limitations: ['No pointer hit-testing', 'No divination or token consumption performed'],
    };
}

// ── 擴充：結緣確認 → 推進一季 → 出戰（PROG-2-0054）。建立在上面的 lifecycle 之上，不另造一套 ──

/** 頁面內：找名稱為 target 的節點狀態（顯示中 / 可按） */
function readNode(target) {
    function find(node) {
        if (node.name === target && node.activeInHierarchy) return node;
        for (const child of node.children) {
            const hit = find(child);
            if (hit) return hit;
        }
        return null;
    }
    const node = find(window.cc.director.getScene());
    if (!node) return null;
    const button = node.getComponent('cc.Button');
    const label = node.getComponent('cc.Label');
    return { interactable: button ? button.interactable : null, text: label ? label.string : null };
}

async function clickNamed(page, target, timeout) {
    await page.waitForFunction((name) => {
        function find(node) {
            const button = node.getComponent('cc.Button');
            return (node.name === name && node.activeInHierarchy && button && button.interactable) || node.children.some(find);
        }
        return find(window.cc.director.getScene());
    }, { timeout }, target);
    await page.evaluate((name) => {
        function click(node) {
            const button = node.getComponent('cc.Button');
            if (node.name === name && node.activeInHierarchy && button && button.interactable) {
                node.emit('click', button);
                return true;
            }
            return node.children.some(click);
        }
        if (!click(window.cc.director.getScene())) throw new Error(`Button unavailable: ${name}`);
    }, target);
}

async function waitGone(page, target, timeout) {
    await page.waitForFunction((name) => {
        function find(node) {
            return (node.name === name && node.activeInHierarchy) || node.children.some(find);
        }
        return !find(window.cc.director.getScene());
    }, { timeout }, target);
}

/**
 * 登入 → 大廳 → 結緣 → 占卜（既有 lifecycle）→ 關占卜 → 結緣確認 → 關結緣 → 推進一季 → 出戰。
 * 空名冊時結緣確認鈕不可按，記為 skipped 並寫明原因，不當成失敗也不假裝通過。
 * options.onStep(name) 每步完成後呼叫（run-web-smoke 用來截圖）。
 */
async function runFullFlow(page, options = {}) {
    const timeout = options.timeoutMs || 45000;
    const base = await runLifecycleFlow(page, options);
    const steps = [...base.steps];
    const skipped = [];
    const mark = async (name) => {
        steps.push(name);
        if (options.onStep) await options.onStep(name);
    };

    await clickNamed(page, 'BtnCloseOracle', timeout);
    await waitGone(page, 'OracleTitle', timeout);
    await mark('BtnCloseOracle');

    const confirm = await page.evaluate(readNode, 'BtnConfirmBond');
    if (confirm && confirm.interactable) {
        await clickNamed(page, 'BtnConfirmBond', timeout);
        await new Promise((resolve) => setTimeout(resolve, options.actionSettleMs || 800));
        await mark('BtnConfirmBond');
    } else {
        skipped.push({ step: 'BtnConfirmBond', reason: confirm ? '按鈕不可按（名冊內沒有符合資格的一男一女）' : '找不到結緣確認鈕' });
    }

    await clickNamed(page, 'BtnCloseBond', timeout);
    await mark('BtnCloseBond');

    const before = await page.evaluate(readNode, 'SeasonLabel');
    if (!before || !before.text) throw new Error('Season label missing');
    await clickNamed(page, 'AdvanceSeasonButton', timeout);
    await page.waitForFunction((text) => {
        function find(node) {
            const label = node.getComponent('cc.Label');
            return (node.name === 'SeasonLabel' && node.activeInHierarchy && label && label.string !== text) || node.children.some(find);
        }
        return find(window.cc.director.getScene());
    }, { timeout }, before.text);
    const after = await page.evaluate(readNode, 'SeasonLabel');
    await mark('AdvanceSeasonButton');

    await clickNamed(page, 'BtnBattle', timeout);
    await page.waitForFunction(() => {
        const scene = window.cc.director.getScene();
        return scene && scene.name === 'BattleScene';
    }, { timeout });
    // 戰場初始化的非同步錯誤要有機會冒出來
    await new Promise((resolve) => setTimeout(resolve, options.battleSettleMs || 3000));
    await mark('BtnBattle');

    return {
        ...base,
        name: 'lifecycle-full',
        scene: 'BattleScene',
        steps,
        skipped,
        season: { before: before.text, after: after && after.text },
        limitations: [...base.limitations, 'Battle only entered, not played'],
    };
}

module.exports = { runLifecycleFlow, runFullFlow, validateOracleState };
