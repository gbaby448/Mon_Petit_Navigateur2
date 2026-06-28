const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Domus Secure Entry Point
 */

// Détection du mode développement
const isDev = !app.isPackaged;
if (isDev) {
    console.log("[DOMUS] Mode développement détecté. Les mises à jour AppData sont ignorées.");
}

const { loadBytecode } = require('./loader');
const { execSync } = require('child_process');

// 🔄 GESTION DES MISES À JOUR ATOMIQUES (SWAP DANS APPDATA SEULEMENT)
const UPDATE_STAGING_DIR = path.join(
    process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
    'DomusPro'
);

// Nettoyage des résidus de renommages (.old)
function cleanupOldFiles() {
    try {
        if (!fs.existsSync(UPDATE_STAGING_DIR)) return;
        const files = fs.readdirSync(UPDATE_STAGING_DIR);
        for (const file of files) {
            if (file.endsWith('.old')) {
                const filePath = path.join(UPDATE_STAGING_DIR, file);
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    // Toujours verrouillé, on ignore silencieusement
                }
            }
        }
    } catch (e) {}
}

// Lancer le nettoyage au boot
cleanupOldFiles();

function killOtherInstances() {
    try {
        console.log("[DOMUS] Nettoyage des processus persistants...");
        execSync(`taskkill /F /IM DomusPro.exe /FI "PID ne ${process.pid}"`, { stdio: 'ignore' });
    } catch (e) {}
}

function sleepSync(ms) {
    try {
        const sab = new SharedArrayBuffer(4);
        const int32 = new Int32Array(sab);
        Atomics.wait(int32, 0, 0, ms);
    } catch (e) {
        const start = Date.now();
        while (Date.now() - start < ms) {}
    }
}

function safeRenameSync(src, dest, retries = 5, delay = 200) {
    for (let i = 0; i < retries; i++) {
        try {
            if (fs.existsSync(dest)) {
                const oldDest = dest + '.old';
                try {
                    if (fs.existsSync(oldDest)) {
                        fs.unlinkSync(oldDest);
                    }
                    fs.renameSync(dest, oldDest);
                } catch (err) {
                    // Si le .old par défaut est verrouillé, on crée un nom unique avec timestamp
                    const uniqueOldDest = `${dest}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.old`;
                    fs.renameSync(dest, uniqueOldDest);
                }
            }
            fs.renameSync(src, dest);
            console.log(`[DOMUS] Remplacement réussi de ${dest}`);
            return true;
        } catch (err) {
            console.warn(`[DOMUS] Tentative de remplacement ${i + 1}/${retries} échouée pour ${dest} : ${err.message}`);
            if (i === 0) {
                killOtherInstances();
            }
            if (i < retries - 1) {
                sleepSync(delay);
            }
        }
    }
    throw new Error(`Impossible de remplacer le fichier ${dest} après ${retries} tentatives.`);
}

const mainJsPath = path.join(__dirname, 'main.js');
const bundledJscPath = path.join(__dirname, 'main.jsc');

// Double mode : app.asar (complet) ou main.jsc (partiel pour rétrocompatibilité)
const updateAsarPath  = path.join(UPDATE_STAGING_DIR, 'app.asar.update');
const appDataAsarPath = path.join(UPDATE_STAGING_DIR, 'app.asar');

const updatePath      = path.join(UPDATE_STAGING_DIR, 'main.jsc.update');
const appDataJscPath  = path.join(UPDATE_STAGING_DIR, 'main.jsc');

const updateMetaPath  = path.join(UPDATE_STAGING_DIR, 'metadata.json.update');
const appDataMetaPath = path.join(UPDATE_STAGING_DIR, 'metadata.json');
const updateFlagPath  = path.join(UPDATE_STAGING_DIR, 'just-updated.flag');

// Si une mise à jour ASAR ou JSC est en attente, on la swap
if (!isDev && fs.existsSync(updateAsarPath)) {
    try {
        console.log("[DOMUS] Application d'une mise à jour ASAR complète dans AppData...");
        safeRenameSync(updateAsarPath, appDataAsarPath);
        
        // Nettoyer l'ancien format partiel s'il existe pour éviter tout conflit
        try {
            if (fs.existsSync(appDataJscPath)) fs.unlinkSync(appDataJscPath);
        } catch (e) {}
        
        if (fs.existsSync(updateMetaPath)) {
            safeRenameSync(updateMetaPath, appDataMetaPath);
        }
        
        fs.writeFileSync(updateFlagPath, JSON.stringify({ updatedAt: new Date().toISOString() }));
        console.log("[DOMUS] Mise à jour ASAR installée avec succès.");
    } catch (err) {
        console.error("[DOMUS] Échec de l'application de la mise à jour ASAR :", err.message);
        try {
            const errorLog = path.join(require('os').homedir(), 'domus-error.log');
            fs.appendFileSync(errorLog, `[UPDATE ASAR ERROR] ${new Date().toISOString()}\n${err.stack}\n`);
        } catch (e) {}
    }
} else if (!isDev && fs.existsSync(updatePath)) {
    try {
        console.log("[DOMUS] Application d'une mise à jour JSC partielle dans AppData...");
        safeRenameSync(updatePath, appDataJscPath);
        
        if (fs.existsSync(updateMetaPath)) {
            safeRenameSync(updateMetaPath, appDataMetaPath);
        }
        
        fs.writeFileSync(updateFlagPath, JSON.stringify({ updatedAt: new Date().toISOString() }));
        console.log("[DOMUS] Mise à jour JSC installée avec succès.");
    } catch (err) {
        console.error("[DOMUS] Échec de l'application de la mise à jour JSC :", err.message);
        try {
            const errorLog = path.join(require('os').homedir(), 'domus-error.log');
            fs.appendFileSync(errorLog, `[UPDATE JSC ERROR] ${new Date().toISOString()}\n${err.stack}\n`);
        } catch (e) {}
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
if (!isDev && compareVersions(bundledVersion, appDataVersion) >= 0) {
    console.log(`[DOMUS] Version physique installée (${bundledVersion}) plus récente ou égale à l'update cache (${appDataVersion}). Nettoyage d'AppData...`);
    killOtherInstances();
    sleepSync(100);
    
    const safeDelete = (p) => {
        try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (e) {
            console.warn(`[DOMUS] Échec de suppression de ${p} : ${e.message}`);
        }
    };
    
    safeDelete(appDataAsarPath);
    safeDelete(appDataJscPath);
    safeDelete(appDataMetaPath);
    safeDelete(updateAsarPath);
    safeDelete(updatePath);
    safeDelete(updateMetaPath);
}

// Déterminer quel binaire charger (priorité à l'app.asar complet, puis main.jsc, puis bundled)
let activeJscPath = null;
let activeDirname = __dirname;
let activeVersion = bundledVersion;

const appDataAsarJscPath = path.join(appDataAsarPath, 'src', 'main.jsc');

const canUseAppData = !isDev && compareVersions(appDataVersion, bundledVersion) > 0;

if (canUseAppData && fs.existsSync(appDataAsarPath) && fs.statSync(appDataAsarPath).size > 100000) {
    activeJscPath = appDataAsarJscPath;
    activeDirname = path.join(appDataAsarPath, 'src');
    activeVersion = appDataVersion;
    console.log("[DOMUS] Utilisation de l'application complète mise à jour dans AppData (app.asar).");
} else if (canUseAppData && fs.existsSync(appDataJscPath)) {
    activeJscPath = appDataJscPath;
    activeDirname = __dirname;
    activeVersion = appDataVersion;
    console.log("[DOMUS] Utilisation du binaire de mise à jour partiel dans AppData (main.jsc).");
} else if (fs.existsSync(bundledJscPath)) {
    activeJscPath = bundledJscPath;
    activeDirname = __dirname;
    activeVersion = bundledVersion;
    console.log("[DOMUS] Utilisation du binaire d'origine (bundled).");
}

if (activeJscPath) {
    process.env.DOMUS_ACTIVE_VERSION = activeVersion;
    console.log("[DOMUS] Démarrage en mode BLINDÉ (Production)");
    try {
        // Charger le bytecode compilé du binaire actif
        const fn = loadBytecode(activeJscPath);
        
        // Simuler le module Node.js en utilisant les chemins d'origine (bundled) ou d'update (activeDirname)
        const m = {
            exports: {},
            require: require,
            id: activeJscPath,
            filename: activeJscPath,
            loaded: false,
            parent: module,
            children: []
        };
        
        const requireProxy = function(id) {
            // Si require relatif, on le résout par rapport au dossier actif (update ou bundled)
            if (id.startsWith('.')) {
                const resolved = path.resolve(activeDirname, id);
                return require(resolved);
            }
            return require(id);
        };
        
        requireProxy.resolve = require.resolve;
        requireProxy.main = process.mainModule;
        requireProxy.extensions = require.extensions;
        requireProxy.cache = require.cache;
        
        // Exécution du bytecode en lui passant l'activeDirname (pour charger les assets et HTML associés)
        fn(m.exports, requireProxy, m, activeJscPath, activeDirname);
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

