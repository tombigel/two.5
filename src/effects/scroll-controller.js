import { defaultTo } from '../utilities';

/**
 * @type {scrollConfig}
 */
const DEFAULTS = {
    horizontal: false,
    scrollHandler (container, wrapper, x, y) {
        container.style.transform = `translate3d(${-x}px, ${-y}px, 0px)`;
    }
};

/*
 * Utilities for scroll controller
 */

/**
 * Utility for calculating the virtual scroll position, taking snap points into account.
 *
 * @param {number} p real scroll position
 * @param {[number[]]} snaps list of snap point
 * @return {number} virtual scroll position
 */
function calcPosition (p, snaps) {
    let _p = p;
    let extra = 0;
    for (const [start, end] of snaps) {
        if (p < start) break;
        if (p >= end) {
            extra += end - start;
        }
        else {
            _p = start;
            break;
        }
    }
    return _p - extra;
}

/**
 * Utility for calculating effect progress.
 *
 * @param {number} p current scroll position
 * @param {number} start start position
 * @param {number} end end position
 * @param {number} duration duration of effect in scroll pixels
 * @return {number} effect progress, between 0 and 1
 */
function calcProgress (p, start, end, duration) {
    let progress = 0;

    if (p >= start && p <= end) {
        progress = duration ? (p - start) / duration : 1;
    }
    else if (p > end) {
        progress = 1;
    }

    return progress;
}

/*
 * Scroll controller factory
 */
/**
 * Initialize and return a scroll controller.
 *
 * @param {scrollConfig} config
 * @return {function}
 */
export function getEffect (config) {
    const _config = defaultTo(config, DEFAULTS);
    const root = _config.root;
    const body = _config.root === window ? window.document.body : _config.root;
    const container = _config.container;
    const wrapper = _config.wrapper;
    const horizontal = _config.horizontal;

    /*
     * Prepare snap points data.
     */
    const snaps = (_config.snaps || [])
        // sort points by start position
        .sort((a, b) => a.start > b.start ? 1 : -1)
        // map objects to arrays of [start, end]
        .map(snap => {
            const {start, duration, end} = snap;
            return [start, (end == null ? start + duration : end)];
        });

    // calculate extra scroll if we have snaps
    const extraScroll = snaps.reduce((acc, snap) => acc + (snap[1] - snap[0]), 0);

    let lastX, lastY;

    /*
     * Prepare scenes data.
     */
    _config.scenes.forEach(scene => {
        if (scene.end == null) {
            scene.end = scene.start + scene.duration;
        }
        else if (scene.duration == null) {
            scene.duration = scene.end - scene.start;
        }
    });

    /*
     * Setup Smooth Scroll technique
     */
    if (container) {
        // calculate total scroll height/width
        const totalHeight = container.offsetHeight + (horizontal ? 0 : extraScroll);
        const totalWidth = container.offsetWidth + (horizontal ? extraScroll : 0);

        // set width/height on the body element
        if (horizontal) {
            body.style.width = `${totalWidth}px`;
        }
        else {
            body.style.height = `${totalHeight}px`;
        }

        /*
         * Setup wrapper element and reset progress.
         */
        if (wrapper) {
            if (!wrapper.contains(container)) {
                console.error('When defined, the wrapper element %o must be a parent of the container element %o', wrapper, container)
                throw "Wrapper element is not a parent of container element";
            }
            // if we got a wrapper element set its style
            Object.assign(wrapper.style, {
                position: 'fixed',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            });

            // get current scroll position (support window, element and window in IE)
            let x = root.scrollX || root.pageXOffset || root.scrollLeft || 0;
            let y = root.scrollY || root.pageYOffset || root.scrollTop || 0;

            // increment current scroll position by accumulated snap point durations
            if (horizontal) {
                x = snaps.reduce((acc, [start, end]) => start < acc ? acc + (end - start) : acc, x);
            }
            else {
                y = snaps.reduce((acc, [start, end]) => start < acc ? acc + (end - start) : acc, y);
            }

            // update scroll and progress to new calculated position
            _config.resetProgress({x, y});

            // render current position
            controller({x, y, vx: 0, vy: 0});
        }
    }

    /**
     * Scroll scenes controller.
     * Takes progress object and orchestrates scenes.
     *
     * @param {Object} progress
     * @param {number} progress.x
     * @param {number} progress.y
     * @param {number} progress.vx
     * @param {number} progress.vy
     */
    function controller ({x, y, vx, vy}) {
        x = +x.toFixed(1);
        y = +y.toFixed(1);

        const velocity = horizontal
            ? +vx.toFixed(3)
            : +vy.toFixed(3);

        // if nothing changed bail out
        if (x === lastX && y === lastY) return;

        let _x = x, _y = y;

        if (snaps.length) {
            // we have snap points so calculate virtual position
            if (horizontal) {
                _x = calcPosition(x, snaps);
                _y = 0;
            }
            else {
                _y = calcPosition(y, snaps);
                _x = 0;
            }
        }

        if (container) {
            // handle content scrolling
            _config.scrollHandler(container, wrapper, _x, _y);
        }

        /*
         * Perform scene progression.
         */
        _config.scenes.forEach(scene => {
            // if active
            if (!scene.disabled) {
                const {start, end, duration} = scene;
                // get global scroll progress
                const t = horizontal
                    ? scene.pauseDuringSnap ? _x : x
                    : scene.pauseDuringSnap ? _y : y;

                // calculate scene's progress
                const progress = calcProgress(t, start, end, duration);

                // run effect
                scene.effect(scene, progress, velocity);
            }
        });

        // cache last position
        lastX = x;
        lastY = y;
    }

    return controller;
}
