(function () {
    'use strict';

    function getFrameSize(width, height) {
        return { width: Math.min(width, height * 16 / 9), height: Math.min(height, width * 9 / 16) };
    }

    function installResponsiveFrame(engine, browserWindow) {
        function resize() {
            const size = getFrameSize(browserWindow.innerWidth, browserWindow.innerHeight);
            if (size.width <= 0 || size.height <= 0) return;
            // SubFrame caches inline dimensions; CSS-only changes do not update the render buffer.
            engine.view.setFrameSize(size.width, size.height);
        }
        browserWindow.addEventListener('resize', resize);
        resize();
        return function dispose() { browserWindow.removeEventListener('resize', resize); };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getFrameSize, installResponsiveFrame };
    } else {
        // Import the shared engine module; window.cc is absent in release builds.
        System.import('cc').then(function (engine) {
            engine.game.on(engine.Game.EVENT_GAME_INITED, function () {
                installResponsiveFrame(engine, window);
            });
        }).catch(function (error) {
            console.error('[web-shell] Unable to install responsive frame', error);
        });
    }
}());
