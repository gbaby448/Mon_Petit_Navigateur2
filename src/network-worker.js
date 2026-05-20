const { parentPort } = require('worker_threads');
const geoip = require('geoip-lite');

/**
 * DOMUS ECO-SHIELD WORKER
 * Traite les requêtes réseau et la géolocalisation en dehors du thread principal.
 */

const blockList = [
    'analytics', 'doubleclick', 'adsense', 'google-analytics', 'facebook.com/tr', 'amazon-adsystem', 'hotjar',
    'telemetry', 'safebrowsing.googleapis.com', 'client-analytics.google.com', 'pagead2.googlesyndication.com',
    'googleadservices.com', 'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
    'adnxs.com', 'criteo.com', 'rubiconproject.com', 'pubmatic.com', 'casalemedia.com', 'outbrain.com', 'taboola.com'
];

parentPort.on('message', (task) => {
    if (task.type === 'check-url') {
        const shouldBlock = blockList.some(b => task.url.includes(b));
        parentPort.postMessage({ type: 'url-result', id: task.id, block: shouldBlock });
    }
    
    if (task.type === 'lookup-ip') {
        const geo = geoip.lookup(task.ip);
        if (geo) {
            parentPort.postMessage({ type: 'geo-result', url: task.url, country: geo.country, city: geo.city });
        }
    }
});
