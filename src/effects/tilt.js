import { defaultTo, fixed } from '../utilities';

const DEFAULTS = {
    perspectiveZ: 600,
    elevation: 10,
    transitionDuration: 200,
    transitionActive: false,
    transitionEasing: 'ease-out',
    perspectiveActive: false,
    perspectiveInvertX: false,
    perspectiveInvertY: false,
    perspectiveMaxX: 0,
    perspectiveMaxY: 0,
    translationActive: true,
    translationInvertX: false,
    translationInvertY: false,
    translationMaxX: 50,
    translationMaxY: 50,
    rotateActive: false,
    rotateInvert: false,
    rotateMax: 45,
    tiltActive: false,
    tiltInvertX: false,
    tiltInvertY: false,
    tiltMaxX: 25,
    tiltMaxY: 25,
    skewActive: false,
    skewInvertX: false,
    skewInvertY: false,
    skewMaxX: 25,
    skewMaxY: 25,
    scaleActive: false,
    scaleInvertX: false,
    scaleInvertY: false,
    scaleMaxX: 0.5,
    scaleMaxY: 0.5
};

function formatTransition ({property, duration, easing}) {
    return `${property} ${duration}ms ${easing}`;
}

export function getEffect (_config) {
    const config = defaultTo(_config, DEFAULTS);
    const container = config.container;
    const perspectiveZ = config.perspectiveZ;

    config.layers = config.layers.map(layer => defaultTo(layer, config));

    /*
     * Init effect
     * also set transition if required.
     */
    if (container) {
        const containerStyle = {
            perspective: `${perspectiveZ}px`
        };

        if (config.transitionActive && config.perspectiveActive) {
            containerStyle.transition = formatTransition({
                property: 'perspective-origin',
                duration: config.transitionDuration,
                easing: config.transitionEasing
            });
        }

        Object.assign(container.style, containerStyle);
    }

    /*
     * Setup layers styling
     */
    config.layers.forEach(layer => {
        const layerStyle = {};

        if (!layer.allowPointer) {
            layerStyle['pointer-events'] = 'none';
        }

        if (layer.transitionActive) {
            layerStyle.transition = formatTransition({
                property: 'transform',
                duration: layer.transitionDuration,
                easing: layer.transitionEasing
            });
        }
        else {
            delete layerStyle.transition;
        }

        return Object.assign(layer.el.style, layerStyle);
    });

    return function tilt ({x, y}) {
        const len = config.layers.length;

        config.layers.forEach((layer, index) => {
            const depth = layer.hasOwnProperty('depth') ? layer.depth : (index + 1) / len;

            const translateZVal =  layer.hasOwnProperty('elevation') ? layer.elevation : config.elevation * (index + 1);

            let translatePart = '';
            if (layer.translationActive) {
                const translateXVal = layer.translationActive === 'y'
                    ? 0
                    : fixed((layer.translationInvertX ? -1 : 1) * layer.translationMaxX * (2 * x - 1) * depth);
                const translateYVal = layer.translationActive === 'x'
                    ? 0
                    : fixed((layer.translationInvertY ? -1 : 1) * layer.translationMaxY * (2 * y - 1) * depth);

                translatePart = `translate3d(${translateXVal}px, ${translateYVal}px, ${translateZVal}px)`;
            }
            else {
                translatePart = `translateZ(${translateZVal}px)`;
            }

            let rotatePart = '';
            let rotateXVal = 0,
                rotateYVal = 0,
                rotateZVal = 0;

            if (layer.tiltActive) {
                rotateXVal = layer.tiltActive === 'x'
                    ? 0
                    : fixed((layer.tiltInvertY ? -1 : 1) * layer.tiltMaxY * (1 - y * 2) * depth);
                rotateYVal = layer.tiltActive === 'y'
                    ? 0
                    : fixed((layer.tiltInvertX ? -1 : 1) * layer.tiltMaxX * (x * 2 - 1) * depth);

                rotatePart += ` rotateX(${rotateXVal}deg) rotateY(${rotateYVal}deg)`;
            }

            if (layer.rotateActive) {
                const rotateInput = layer.rotateActive === 'x' ? x : y;

                rotateZVal = fixed((layer.rotateInvert ? -1 : 1) * layer.rotateMax * (rotateInput * 2 - 1) * depth);

                rotatePart += ` rotateZ(${rotateZVal}deg)`;
            }

            let skewPart = '';
            if (layer.skewActive) {
                const skewXVal = layer.skewActive === 'y'
                    ? 0
                    : fixed((layer.skewInvertX ? -1 : 1) * layer.skewMaxX * (1 - x * 2) * depth);
                const skewYVal = layer.skewActive === 'x'
                    ? 0
                    : fixed((layer.skewInvertY ? -1 : 1) * layer.skewMaxY * (1 - y * 2) * depth);

                skewPart = ` skew(${skewXVal}deg, ${skewYVal}deg)`;
            }

            let scalePart = '';
            if (layer.scaleActive) {
                const scaleXVal = layer.scaleActive === 'y'
                    ? 1
                    : 1 + fixed((layer.scaleInvertX ? -1 : 1) * layer.scaleMaxX * (Math.abs(0.5 - x) * 2) * depth);
                const scaleYVal = layer.scaleActive === 'x'
                    ? 1
                    : 1 + fixed((layer.scaleInvertY ? -1 : 1) * layer.scaleMaxY * (Math.abs(0.5 - y) * 2) * depth);

                scalePart = ` scale(${scaleXVal}, ${scaleYVal})`;
            }

            let layerPerspectiveZ = '';

            if (layer.hasOwnProperty('perspectiveZ')) {
                layerPerspectiveZ = `perspective(${layer.perspectiveZ}px) `;
            }
            else if (!container) {
                layerPerspectiveZ = `perspective(${config.perspectiveZ}px) `;
            }

            layer.el.style.transform = `${layerPerspectiveZ}${translatePart}${scalePart}${skewPart}${rotatePart}`;
        });

        if (config.perspectiveActive) {
            let aX = 1, bX = 0, aY = 1, bY = 0;

            if (config.perspectiveMaxX) {
                aX = 1 + 2 * config.perspectiveMaxX;
                bX = config.perspectiveMaxX;
            }

            if (config.perspectiveMaxY) {
                aY = 1 + 2 * config.perspectiveMaxY;
                bY = config.perspectiveMaxY;
            }

            const perspX = config.perspectiveActive === 'y'
                ? 0.5
                : (config.perspectiveInvertX ? (1 - x) : x) * aX - bX;
            const perspY = config.perspectiveActive === 'x'
                ? 0.5
                : (config.perspectiveInvertY ? (1 - y) : y) * aY - bY;

            container.style.perspectiveOrigin = `${fixed(perspX, 3) * 100}% ${fixed(perspY, 3) * 100}%`;
        }
        else if (container) {
            container.style.perspectiveOrigin = '50% 50%';
        }
    }
}
