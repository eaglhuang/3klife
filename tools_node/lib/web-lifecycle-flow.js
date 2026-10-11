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

module.exports = { runLifecycleFlow, validateOracleState };
