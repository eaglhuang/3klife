(function () {
    'use strict';

    function getFrameSize(width, height) {
        return { width: width, height: height };
    }

    function readWindowSize(browserWindow) {
        const viewport = browserWindow.visualViewport;
        if (viewport && viewport.width > 0 && viewport.height > 0) {
            return getFrameSize(viewport.width, viewport.height);
        }
        return getFrameSize(browserWindow.innerWidth, browserWindow.innerHeight);
    }

    function installResponsiveFrame(engine, browserWindow) {
        function resize() {
            const size = readWindowSize(browserWindow);
            if (size.width <= 0 || size.height <= 0) return;
            // SubFrame caches inline dimensions; CSS-only changes do not update the render buffer.
            engine.view.setFrameSize(size.width, size.height);
        }
        browserWindow.addEventListener('resize', resize);
        const viewport = browserWindow.visualViewport;
        if (viewport && viewport.addEventListener) viewport.addEventListener('resize', resize);
        resize();
        return function dispose() {
            browserWindow.removeEventListener('resize', resize);
            if (viewport && viewport.removeEventListener) viewport.removeEventListener('resize', resize);
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getFrameSize, readWindowSize, installResponsiveFrame };
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
