const path = require('path');
const fs = require('fs');

/**
 * Domus Secure Entry Point
 */

// Initialisation du Loader de Bytecode
const { loadBytecode } = require('./loader');

const mainJsPath = path.join(__dirname, 'main.js');
const bundledJscPath = path.join(__dirname, 'main.jsc');

// 🔄 GESTION DES MISES À JOUR ATOMIQUES (SWAP DANS APPDATA SEULEMENT)
const UPDATE_STAGING_DIR = path.join(
    process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
    'DomusPro'
);
const updatePath      = path.join(UPDATE_STAGING_DIR, 'main.jsc.update');
const updateMetaPath  = path.join(UPDATE_STAGING_DIR, 'metadata.json.update');
const appDataJscPath  = path.join(UPDATE_STAGING_DIR, 'main.jsc');
const appDataMetaPath = path.join(UPDATE_STAGING_DIR, 'metadata.json');
const updateFlagPath  = path.join(UPDATE_STAGING_DIR, 'just-updated.flag');

// Si une mise à jour est en attente, on la swap dans le dossier utilisateur AppData (writable !)
if (fs.existsSync(updatePath)) {
    try {
        console.log("[DOMUS] Application d'une mise à jour système dans AppData...");
        if (fs.existsSync(appDataJscPath)) fs.unlinkSync(appDataJscPath);
        fs.renameSync(updatePath, appDataJscPath);
        
        if (fs.existsSync(updateMetaPath)) {
            if (fs.existsSync(appDataMetaPath)) fs.unlinkSync(appDataMetaPath);
            fs.renameSync(updateMetaPath, appDataMetaPath);
        }
        
        // 🏁 Écrire le drapeau "vient d'être mis à jour" pour afficher le toast au démarrage
        fs.writeFileSync(updateFlagPath, JSON.stringify({ updatedAt: new Date().toISOString() }));
        console.log("[DOMUS] Mise à jour installée avec succès dans AppData.");
    } catch (err) {
        console.error("[DOMUS] Échec de l'application de la mise à jour :", err.message);
    }
}

// Fonction de comparaison de versions sémantiques (x.y.z)
function compareVersions(v1, v2) {
    const clean = v => v.replace(/^v/i, '').split('.').map(Number);
    const a = clean(v1);
    const b = clean(v2);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const av = a[i] || 0, bv = b[i] || 0;
        if (av > bv) return 1;
        if (av < bv) return -1;
    }
    return 0;
}

// Récupérer la version embarquée (bundled) et celle d'AppData
const bundledPackageJson = require('../package.json');
const bundledVersion = bundledPackageJson.version || '1.0.0';

let appDataVersion = '0.0.0';
if (fs.existsSync(appDataMetaPath)) {
    try {
        const meta = JSON.parse(fs.readFileSync(appDataMetaPath, 'utf8'));
        appDataVersion = meta.version || '0.0.0';
    } catch (e) {}
}

// Si la version physique (bundled) installée sur le PC est plus récente ou identique à l'AppData,
// on nettoie l'AppData pour forcer l'utilisation du nouveau binaire physique propre.
if (compareVersions(bundledVersion, appDataVersion) >= 0) {
    console.log(`[DOMUS] Version physique installée (${bundledVersion}) plus récente ou égale à l'update cache (${appDataVersion}). Nettoyage d'AppData...`);
    try {
        if (fs.existsSync(appDataJscPath)) fs.unlinkSync(appDataJscPath);
        if (fs.existsSync(appDataMetaPath)) fs.unlinkSync(appDataMetaPath);
        if (fs.existsSync(updatePath)) fs.unlinkSync(updatePath);
        if (fs.existsSync(updateMetaPath)) fs.unlinkSync(updateMetaPath);
    } catch (err) {
        console.error("[DOMUS] Erreur de nettoyage d'AppData :", err.message);
    }
}

// Déterminer quel binaire charger (priorité à la version AppData mise à jour, sinon la version bundled d'origine)
let activeJscPath = null;
if (fs.existsSync(appDataJscPath)) {
    activeJscPath = appDataJscPath;
    console.log("[DOMUS] Utilisation du binaire de mise à jour dans AppData.");
} else if (fs.existsSync(bundledJscPath)) {
    activeJscPath = bundledJscPath;
    console.log("[DOMUS] Utilisation du binaire d'origine (bundled).");
}

if (activeJscPath) {
    console.log("[DOMUS] Démarrage en mode BLINDÉ (Production)");
    try {
        // Charger le bytecode compilé du binaire actif
        const fn = loadBytecode(activeJscPath);
        
        // Simuler le module Node.js en utilisant les chemins d'origine (bundled)
        // pour préserver la résolution relative des fichiers statiques et assets d'app.asar
        const m = {
            exports: {},
            require: require,
            id: bundledJscPath,
            filename: bundledJscPath,
            loaded: false,
            parent: module,
            children: []
        };
        
        const requireProxy = function(id) {
            // Si require relatif (ex: ./security), on le résout par rapport au dossier bundled d'origine !
            if (id.startsWith('.')) {
                const resolved = path.resolve(__dirname, id);
                return require(resolved);
            }
            return require(id);
        };
        
        requireProxy.resolve = require.resolve;
        requireProxy.main = process.mainModule;
        requireProxy.extensions = require.extensions;
        requireProxy.cache = require.cache;
        
        // Exécution du bytecode en lui passant l'ancien __dirname
        fn(m.exports, requireProxy, m, bundledJscPath, __dirname);
        m.loaded = true;
        module.exports = m.exports;
        
    } catch (err) {
        const errorLog = path.join(require('os').homedir(), 'domus-error.log');
        fs.writeFileSync(errorLog, `[CRITICAL ERROR] ${new Date().toISOString()}\n${err.stack}\n`);
        console.error("[DOMUS CRITICAL ERROR] Échec de l'exécution du bytecode :", err);
        process.exit(1);
    }
} else {
    // Mode Développement (sans bytecode)
    console.log("[DOMUS] Démarrage en mode SOURCE (Développement)");
    require('./main.js');
}

