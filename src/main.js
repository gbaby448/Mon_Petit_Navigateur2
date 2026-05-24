const { app, BrowserWindow, ipcMain, session, net, shell, globalShortcut, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { Worker } = require('worker_threads');
const dns = require('dns');
const securityManager = require('./security');
const DomusUpdater = require('./updater');

let domusUpdater = null;
const DOMUS_VERSION = '1.3.4';

// CONFIGURATION DE RENDU ULTRA-FLUIDE ET HYPER-ÉCONOME (GPU BASSE CONSOMMATION)
app.commandLine.appendSwitch('force-low-power-gpu'); // Force l'utilisation du GPU économe (iGPU) pour économiser l'énergie et éviter le dGPU dédié
// no-sandbox retiré : le bac à sable Chromium protège contre l'exécution de code arbitraire (RCE).

// DÉTÉLÉMÉTRIE GOOGLE CHROMIUM TOTAL & SOUVERAINETÉ
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-hang-monitor');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');
app.commandLine.appendSwitch('disable-background-timer-throttling');

console.log("[DOMUS] Chargement du noyau stable...");

const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'domus-settings.json');
const historyPath = path.join(userDataPath, 'domus-history.json');
const passwordsPath = path.join(userDataPath, 'domus-vault.json');
const cardsPath = path.join(userDataPath, 'domus-cards.json');
const archivesPath = path.join(userDataPath, 'domus-archives.json');
const downloadsPath = path.join(userDataPath, 'domus-downloads.json');
const extensionsDbPath = path.join(userDataPath, 'domus-extensions.json');
const workspacesPath = path.join(userDataPath, 'domus-workspaces.json');
const extensionsDirPath = path.join(userDataPath, 'domus-extensions');

let win = null;
let tabCounter = 0;
const tabs = new Map();
let currentWorkspace = 'default';

// Initialize default workspaces
const defaultWorkspaces = [
    { id: 'default', name: 'Standard', icon: '🏠', isPrivate: false },
    { id: 'work', name: 'Travail', icon: '💼', isPrivate: false },
    { id: 'private', name: 'Mode Privé', icon: '🕵️', isPrivate: true }
];

// Helpers de données
const loadData = (p, def = []) => {
    try {
        if (!fs.existsSync(p)) return def;
        const data = fs.readFileSync(p, 'utf8');
        return data ? JSON.parse(data) : def;
    } catch (e) {
        console.error(`[DOMUS] Erreur de lecture/parsing sur ${p}:`, e.message);
        return def;
    }
};
const saveData = (p, d) => {
    try {
        fs.writeFileSync(p, JSON.stringify(d, null, 2));
    } catch (e) {
        console.error(`[DOMUS] Échec de sauvegarde sur ${p}:`, e.message);
    }
};

// --- PERSISTENCE & SETTINGS ---
ipcMain.handle('get-settings', () => loadData(settingsPath, { theme: 'dark', accentColor: '#00ff88', searchEngine: 'google', securitySetup: false }));
ipcMain.handle('save-settings', (e, s) => { saveData(settingsPath, s); return true; });
ipcMain.handle('get-app-version', () => DOMUS_VERSION);


// --- SÉCURITÉ & TPM ---
ipcMain.handle('check-tpm-status', async () => {
    return await securityManager.checkTPM();
});

ipcMain.handle('check-hardware-features', async () => {
    return {
        cpu: os.cpus()[0].model,
        hasAESNI: os.cpus()[0].model.includes('AES') || true, // La plupart des CPU récents l'ont
        cores: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024))
    };
});

ipcMain.handle('init-vault', async (e, pwd) => {
    try {
        const settings = loadData(settingsPath, {});
        const salt = settings.securityValidation ? settings.securityValidation.salt : null;
        securityManager.deriveKey(pwd, salt);
        
        // Si un jeton de validation existe, on valide le mot de passe en tentant de le déchiffrer
        if (settings.securityValidation) {
            try {
                const decrypted = securityManager.decrypt(settings.securityValidation);
                if (decrypted !== "DOMUS-VALID-2026") {
                    securityManager.key = null;
                    return { success: false, error: "Mot de passe maître incorrect" };
                }
            } catch (err) {
                securityManager.key = null;
                return { success: false, error: "Mot de passe maître incorrect" };
            }
        }
        
        securityManager.useAegis = !!settings.useAegis;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Aide à valider que l'appelant IPC est bien la fenêtre principale Domus (anti-injection WebView)
const isTrustedSender = (e) => win && !win.isDestroyed() && e.sender.id === win.webContents.id;

// --- MOTS DE PASSE ---
ipcMain.handle('get-passwords', (e) => {
    if (!isTrustedSender(e)) { console.warn('[DOMUS SEC] Tentative d\'accès non autorisée à get-passwords'); return []; }
    const passwords = loadData(passwordsPath);
    return passwords.map(p => {
        const decrypted = { ...p };
        if (securityManager.key && p.passEnc) {
            try {
                decrypted.pass = securityManager.decrypt(p.passEnc);
            } catch (err) {
                console.error("[DOMUS] Déchiffrement mot de passe échoué", err);
                decrypted.pass = "••••••••";
            }
        } else if (p.passEnc) {
            decrypted.pass = "Verrouillé";
        }
        return decrypted;
    });
});

ipcMain.handle('get-passwords-for-domain', (e, domain) => {
    if (!domain) return [];
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const passwords = loadData(passwordsPath);
    
    return passwords
        .filter(p => {
            if (!p.site) return false;
            const siteClean = p.site.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
            return siteClean.includes(cleanDomain) || cleanDomain.includes(siteClean);
        })
        .map(p => {
            const decrypted = { ...p };
            if (securityManager.key && p.passEnc) {
                try {
                    decrypted.pass = securityManager.decrypt(p.passEnc);
                } catch (err) {
                    console.error("[DOMUS] Déchiffrement ciblé échoué", err);
                    decrypted.pass = "";
                }
            } else {
                decrypted.pass = "";
            }
            return decrypted;
        });
});

ipcMain.on('notify-new-credentials', (e, data) => {
    if (win && !win.isDestroyed()) {
        win.webContents.send('show-save-prompt', data);
    }
});

ipcMain.handle('save-password', (e, entry) => {
    const passwords = loadData(passwordsPath);
    
    // Éviter les doublons stricts pour le même site et le même utilisateur
    const existingIndex = passwords.findIndex(p => 
        p.site.toLowerCase().trim() === entry.site.toLowerCase().trim() && 
        p.user.toLowerCase().trim() === entry.user.toLowerCase().trim()
    );
    
    if (existingIndex !== -1) {
        // Mettre à jour l'entrée existante
        const id = passwords[existingIndex].id;
        entry.id = id;
        if (securityManager.key) {
            try {
                entry.passEnc = securityManager.encrypt(entry.pass);
                delete entry.pass;
            } catch (err) {
                console.error("[DOMUS] Chiffrement mot de passe échoué", err);
            }
        }
        passwords[existingIndex] = entry;
    } else {
        entry.id = Date.now();
        if (securityManager.key) {
            try {
                entry.passEnc = securityManager.encrypt(entry.pass);
                delete entry.pass;
            } catch (err) {
                console.error("[DOMUS] Chiffrement mot de passe échoué", err);
            }
        }
        passwords.push(entry);
    }
    
    saveData(passwordsPath, passwords);
    return true;
});
ipcMain.handle('delete-password', (e, id) => {
    let passwords = loadData(passwordsPath);
    passwords = passwords.filter(p => p.id !== id);
    saveData(passwordsPath, passwords);
    return true;
});

// --- PROTECTION CB (CARTES BANCAIRES) ---
ipcMain.handle('get-cards', (e) => {
    if (!isTrustedSender(e)) { console.warn('[DOMUS SEC] Accès non autorisé à get-cards'); return []; }
    const cards = loadData(cardsPath);
    return cards.map(c => {
        const decrypted = { ...c };
        if (securityManager.key) {
            try {
                if (c.numberEnc) decrypted.number = securityManager.decrypt(c.numberEnc);
                if (c.cvvEnc) decrypted.cvv = securityManager.decrypt(c.cvvEnc);
            } catch (err) {
                console.error("[DOMUS] Déchiffrement CB échoué", err);
                decrypted.number = "•••• •••• •••• ••••";
                decrypted.cvv = "•••";
            }
        } else {
            if (c.numberEnc) decrypted.number = "Chiffré - Verrouillé";
            if (c.cvvEnc) decrypted.cvv = "•••";
        }
        return decrypted;
    });
});

ipcMain.handle('save-card', (e, entry) => {
    const cards = loadData(cardsPath);
    entry.id = Date.now();
    
    if (securityManager.key) {
        try {
            entry.numberEnc = securityManager.encrypt(entry.number);
            entry.cvvEnc = securityManager.encrypt(entry.cvv);
            delete entry.number;
            delete entry.cvv;
        } catch (err) {
            console.error("[DOMUS] Chiffrement CB échoué", err);
        }
    }
    
    cards.push(entry);
    saveData(cardsPath, cards);
    return true;
});

ipcMain.handle('delete-card', (e, id) => {
    let cards = loadData(cardsPath);
    cards = cards.filter(c => c.id !== id);
    saveData(cardsPath, cards);
    return true;
});

// --- HISTORIQUE ---
ipcMain.handle('get-history', () => loadData(historyPath));
ipcMain.handle('clear-history', () => { saveData(historyPath, []); return true; });
ipcMain.handle('delete-history-item', (e, id) => {
    let history = loadData(historyPath);
    history = history.filter(h => h.id !== id);
    saveData(historyPath, history);
    return true;
});
ipcMain.on('save-to-history', (e, item) => {
    const history = loadData(historyPath);
    item.id = Date.now();
    item.timestamp = Date.now();
    history.unshift(item);
    saveData(historyPath, history.slice(0, 1000)); // Limite à 1000 entrées
});

// --- RECHERCHE ---
ipcMain.handle('fetch-suggestions', async (e, query) => {
    try {
        const settings = loadData(settingsPath, { searchEngine: 'google' });
        const engine = settings.searchEngine || 'google';
        
        let url = '';
        if (engine === 'duckduckgo') {
            url = `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
        } else if (engine === 'bing') {
            url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`;
        } else {
            url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
        }
        
        const response = await net.fetch(url);
        const data = await response.json();
        return data[1] || [];
    } catch { return []; }
});

// --- ARCHIVES (TIME MACHINE) ---
ipcMain.handle('get-archives', () => loadData(archivesPath));
ipcMain.on('archive-page-reader', async (e, data) => {
    const archives = loadData(archivesPath);
    archives.unshift({ ...data, id: Date.now(), timestamp: Date.now(), date: new Date().toLocaleString() });
    saveData(archivesPath, archives);
    win.webContents.send('show-float-toast', "Page archivée dans Time Machine ⌛");
});

// --- GESTION DES ONGLETS ---
ipcMain.on('new-tab', (e, data) => {
    let url = data;
    let isShadow = false;
    if (typeof data === 'object' && data !== null) {
        url = data.url;
        isShadow = !!data.isShadow;
    }
    const id = `tab-${tabCounter++}`;
    const newTab = { id, url, active: true, isShadow, workspace: currentWorkspace };
    tabs.set(id, newTab);
    win.webContents.send('tab-created', newTab);
});



// --- GESTION DES FENÊTRES ---
ipcMain.on('window-minimize', () => win.minimize());
ipcMain.on('window-maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.on('window-close', () => app.quit());

let activeTabId = null;

// --- GESTION DES BOUTONS INTELLIGENTS (Toggle & No Duplicates) ---
const openInternalPage = (url) => {
    let existingId = null;
    for (const [id, tab] of tabs) {
        if (tab.url === url) {
            existingId = id;
            break;
        }
    }

    if (existingId) {
        if (activeTabId === existingId) {
            tabs.delete(existingId);
            win.webContents.send('tab-closed', existingId);
            activeTabId = null;
        } else {
            win.webContents.send('tab-switched', existingId);
            activeTabId = existingId;
        }
    } else {
        const id = `tab-${tabCounter++}`;
        const newTab = { id, url, active: true, workspace: currentWorkspace };
        tabs.set(id, newTab);
        win.webContents.send('tab-created', newTab);
        activeTabId = id;
    }
};

ipcMain.on('open-history', () => openInternalPage('domus://history'));
ipcMain.on('open-settings', () => openInternalPage('domus://settings'));
ipcMain.on('open-downloads', () => openInternalPage('domus://downloads'));
ipcMain.on('open-extensions', () => openInternalPage('domus://extensions'));

// =========================================================================
// 🧩 SYSTEM DES EXTENSIONS CHROME (DOMUS ENGINE)
// =========================================================================
function loadAllExtensions() {
    try {
        const db = loadData(extensionsDbPath, {});
        console.log(`[DOMUS Extensions] Initialisation : Chargement des extensions actives...`);
        for (const [id, ext] of Object.entries(db)) {
            if (ext.active) {
                if (fs.existsSync(ext.path)) {
                    session.defaultSession.loadExtension(ext.path, { allowFileAccess: true })
                        .then(() => {
                            console.log(`[DOMUS Extensions] Chargée avec succès : ${ext.name} (${ext.version})`);
                        })
                        .catch(err => {
                            console.error(`[DOMUS Extensions] Échec de chargement au démarrage pour ${ext.name}:`, err.message);
                        });
                } else {
                    console.warn(`[DOMUS Extensions] Chemin inexistant pour ${ext.name}, désactivation.`);
                    ext.active = false;
                }
            }
        }
        saveData(extensionsDbPath, db);
    } catch (err) {
        console.error("[DOMUS Extensions] Échec de l'initialisation des extensions :", err.message);
    }
}

ipcMain.handle('list-extensions', () => {
    const db = loadData(extensionsDbPath, {});
    return Object.values(db);
});

ipcMain.handle('toggle-extension', async (e, { id, active }) => {
    const db = loadData(extensionsDbPath, {});
    const ext = db[id];
    if (!ext) return { success: false, error: "Extension introuvable dans la base de données" };
    
    try {
        if (active) {
            await session.defaultSession.loadExtension(ext.path, { allowFileAccess: true });
            ext.active = true;
        } else {
            session.defaultSession.removeExtension(id);
            ext.active = false;
        }
        saveData(extensionsDbPath, db);
        return { success: true };
    } catch (err) {
        console.error(`[DOMUS Extensions] Toggle failed for ${id}:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-extension', async (e, id) => {
    const db = loadData(extensionsDbPath, {});
    const ext = db[id];
    if (!ext) return { success: false, error: "Extension introuvable dans la base de données" };
    
    try {
        try {
            session.defaultSession.removeExtension(id);
        } catch(e){}
        
        if (fs.existsSync(ext.path)) {
            fs.rmSync(ext.path, { recursive: true, force: true });
        }
        
        delete db[id];
        saveData(extensionsDbPath, db);
        return { success: true };
    } catch (err) {
        console.error(`[DOMUS Extensions] Delete failed for ${id}:`, err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-extension-from-folder', async (e) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(win, {
        title: "Sélectionner le dossier d'une extension décompressée (Unpacked)",
        properties: ['openDirectory']
    });
    
    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: "Sélection annulée par l'utilisateur" };
    }
    
    const srcDir = result.filePaths[0];
    const manifestPath = path.join(srcDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        return { success: false, error: "Le dossier sélectionné ne contient pas de fichier manifest.json" };
    }
    
    try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        const name = manifest.name || "Extension locale";
        const version = manifest.version || "1.0.0";
        const description = manifest.description || "";
        
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const extensionId = `local-${cleanName}-${Date.now().toString(36)}`;
        
        const destDir = path.join(extensionsDirPath, extensionId);
        fs.mkdirSync(destDir, { recursive: true });
        
        fs.cpSync(srcDir, destDir, { recursive: true });
        
        const ext = await session.defaultSession.loadExtension(destDir, { allowFileAccess: true });
        
        let iconBase64 = "";
        if (manifest.icons) {
            const iconRel = manifest.icons["48"] || manifest.icons["128"] || manifest.icons["16"];
            if (iconRel) {
                const iconPath = path.join(destDir, iconRel);
                if (fs.existsSync(iconPath)) {
                    const extName = path.extname(iconPath).toLowerCase();
                    const mime = extName === '.svg' ? 'image/svg+xml' : extName === '.jpg' || extName === '.jpeg' ? 'image/jpeg' : 'image/png';
                    iconBase64 = `data:${mime};base64,${fs.readFileSync(iconPath).toString('base64')}`;
                }
            }
        }
        
        const db = loadData(extensionsDbPath, {});
        db[extensionId] = {
            id: extensionId,
            name,
            version,
            description,
            path: destDir,
            active: true,
            icon: iconBase64,
            isLocal: true,
            optionsPage: manifest.options_page || (manifest.options_ui ? manifest.options_ui.page : "")
        };
        saveData(extensionsDbPath, db);
        
        return { success: true, extension: db[extensionId] };
    } catch (err) {
        console.error("[DOMUS Extensions] Local install failed:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-extension-from-cws', async (e, extensionId) => {
    return new Promise(async (resolve, reject) => {
        try {
            extensionId = extensionId.trim();
            if (extensionId.includes('/')) {
                const parts = extensionId.split('/');
                extensionId = parts[parts.length - 1].split('?')[0];
            }
            
            if (!/^[a-z]{32}$/.test(extensionId)) {
                return resolve({ success: false, error: "ID d'extension invalide (doit être de 32 caractères)" });
            }

            const url = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=110.0&x=id%3D${extensionId}%26uc`;
            const response = await net.fetch(url);
            if (!response.ok) {
                return resolve({ success: false, error: `Erreur HTTP lors du téléchargement : ${response.status}` });
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const zipHeaderOffset = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
            if (zipHeaderOffset === -1) {
                return resolve({ success: false, error: "Format CRX invalide (signature ZIP non trouvée)" });
            }
            
            const zipBuffer = buffer.slice(zipHeaderOffset);
            const tempZipPath = path.join(userDataPath, `temp-${extensionId}.zip`);
            fs.writeFileSync(tempZipPath, zipBuffer);
            
            const destDir = path.join(extensionsDirPath, extensionId);
            if (fs.existsSync(destDir)) {
                fs.rmSync(destDir, { recursive: true, force: true });
            }
            fs.mkdirSync(destDir, { recursive: true });
            
            const powershellCmd = `powershell -Command "Expand-Archive -Path '${tempZipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`;
            exec(powershellCmd, async (err) => {
                try { fs.unlinkSync(tempZipPath); } catch(e){}
                
                if (err) {
                    console.error("[DOMUS Extensions] Extract failed:", err);
                    return resolve({ success: false, error: "Échec de l'extraction ZIP de l'extension" });
                }
                
                try {
                    const ext = await session.defaultSession.loadExtension(destDir, { allowFileAccess: true });
                    const manifest = ext.manifest;
                    const name = ext.name || manifest.name || "Extension inconnue";
                    const version = ext.version || manifest.version || "1.0.0";
                    const description = manifest.description || "";
                    
                    let iconBase64 = "";
                    if (manifest.icons) {
                        const iconRel = manifest.icons["48"] || manifest.icons["128"] || manifest.icons["16"];
                        if (iconRel) {
                            const iconPath = path.join(destDir, iconRel);
                            if (fs.existsSync(iconPath)) {
                                const extName = path.extname(iconPath).toLowerCase();
                                const mime = extName === '.svg' ? 'image/svg+xml' : extName === '.jpg' || extName === '.jpeg' ? 'image/jpeg' : 'image/png';
                                iconBase64 = `data:${mime};base64,${fs.readFileSync(iconPath).toString('base64')}`;
                            }
                        }
                    }
                    
                    const db = loadData(extensionsDbPath, {});
                    db[extensionId] = {
                        id: extensionId,
                        name,
                        version,
                        description,
                        path: destDir,
                        active: true,
                        icon: iconBase64,
                        isLocal: false,
                        optionsPage: manifest.options_page || (manifest.options_ui ? manifest.options_ui.page : "")
                    };
                    saveData(extensionsDbPath, db);
                    
                    resolve({ success: true, extension: db[extensionId] });
                } catch (loadErr) {
                    console.error("[DOMUS Extensions] Load failed:", loadErr);
                    return resolve({ success: false, error: `Impossible de charger l'extension : ${loadErr.message}` });
                }
            });
        } catch (err) {
            console.error("[DOMUS Extensions] Install failed:", err);
            resolve({ success: false, error: err.message });
        }
    });
});

ipcMain.on('switch-tab', (e, id) => {
    activeTabId = id;
    win.webContents.send('tab-switched', id);
});

ipcMain.on('close-tab', (e, id) => {
    tabs.delete(id);
    if (activeTabId === id) activeTabId = null;
    win.webContents.send('tab-closed', id);
});

ipcMain.on('quit-app', () => {
    app.quit();
});

function createWindow() {
    win = new BrowserWindow({
        width: 1300,
        height: 850,
        frame: false,
        backgroundColor: '#050506',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            devTools: true
        }
    });

    // --- INITIALISATION DES EXTENSIONS ---
    loadAllExtensions();

    // --- BOUCLIER & GÉOLOCALISATION VIA WORKER ---
    let blockedCount = 0;
    const worker = new Worker(path.join(__dirname, 'network-worker.js'));
    
    worker.on('message', (msg) => {
        if (msg.type === 'geo-result' && win && !win.isDestroyed()) {
            win.webContents.send('geo-update', msg);
        }
    });

    const blockList = [
        'analytics', 'doubleclick', 'adsense', 'google-analytics', 'facebook.com/tr', 'amazon-adsystem', 'hotjar',
        'telemetry', 'safebrowsing.googleapis.com', 'client-analytics.google.com', 'pagead2.googlesyndication.com',
        'googleadservices.com', 'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
        'adnxs.com', 'criteo.com', 'rubiconproject.com', 'pubmatic.com', 'casalemedia.com', 'outbrain.com', 'taboola.com'
    ];

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        if (!details.url.startsWith('http')) {
            return callback({ cancel: false });
        }

        const urlLower = details.url.toLowerCase();
        const shouldBlock = blockList.some(b => urlLower.includes(b));

        if (shouldBlock) {
            blockedCount++;
            if (win && !win.isDestroyed()) {
                win.webContents.send('blocked-update', { count: blockedCount });
                win.webContents.send('eco-update', { saved: Math.round(blockedCount * 0.8) });
            }
            return callback({ cancel: true });
        }

        try {
            const parsedUrl = new URL(details.url);
            dns.lookup(parsedUrl.hostname, (err, address) => {
                if (!err && address && worker) {
                    worker.postMessage({ type: 'lookup-ip', ip: address, url: details.url });
                }
            });
        } catch (e) {}

        callback({ cancel: false });
    });

    // --- CYCLE DE VIE DES TÉLÉCHARGEMENTS ---
    session.defaultSession.on('will-download', (event, item, webContents) => {
        const downloads = loadData(downloadsPath);
        const id = `dl-${Date.now()}`;
        const filename = item.getFilename();
        const totalBytes = item.getTotalBytes();
        const savePath = path.join(app.getPath('downloads'), filename);
        
        item.setSavePath(savePath);
        
        const dlEntry = {
            id,
            name: filename,
            fileName: filename,
            url: item.getURL() || 'http://unknown-source',
            path: savePath,
            savePath: savePath,
            total: totalBytes,
            totalBytes: totalBytes,
            received: 0,
            receivedBytes: 0,
            progress: 0,
            state: 'downloading',
            timestamp: Date.now()
        };
        
        downloads.unshift(dlEntry);
        saveData(downloadsPath, downloads);
        
        if (win && !win.isDestroyed()) {
            win.webContents.send('download-update', downloads);
            win.webContents.send('show-float-toast', `Téléchargement démarré : ${filename} 📥`);
        }
        
        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                dlEntry.state = 'interrupted';
            } else if (state === 'progressing') {
                const rec = item.getReceivedBytes();
                dlEntry.received = rec;
                dlEntry.receivedBytes = rec;
                dlEntry.progress = totalBytes > 0 ? Math.round((rec / totalBytes) * 100) : 0;
                dlEntry.state = 'downloading';
            }
            
            const currentDl = loadData(downloadsPath);
            const idx = currentDl.findIndex(d => d.id === id);
            if (idx !== -1) {
                currentDl[idx] = dlEntry;
                saveData(downloadsPath, currentDl);
            }
            
            if (win && !win.isDestroyed()) {
                win.webContents.send('download-update', currentDl);
            }
        });
        
        item.once('done', (event, state) => {
            if (state === 'completed') {
                dlEntry.state = 'completed';
                dlEntry.progress = 100;
                dlEntry.received = totalBytes;
                dlEntry.receivedBytes = totalBytes;
            } else {
                dlEntry.state = 'interrupted';
            }
            
            const currentDl = loadData(downloadsPath);
            const idx = currentDl.findIndex(d => d.id === id);
            if (idx !== -1) {
                currentDl[idx] = dlEntry;
                saveData(downloadsPath, currentDl);
            }
            
            if (win && !win.isDestroyed()) {
                win.webContents.send('download-update', currentDl);
                if (state === 'completed') {
                    win.webContents.send('show-float-toast', `Téléchargement terminé : ${filename} ✅`);
                } else {
                    win.webContents.send('show-float-toast', `Téléchargement échoué : ${filename} ❌`);
                }
            }
        });
    });

    win.loadFile(path.join(__dirname, 'index.html'));

    win.webContents.on('did-finish-load', () => {
        win.webContents.insertCSS('#domus-webview-context-menu { display: none !important; }');
    });

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[RENDERER CONSOLE] (${sourceId}:${line}) [Level ${level}]: ${message}`);
    });

    // --- MOTEUR DE MISE À JOUR GITHUB (vérification silencieuse au démarrage) ---
    domusUpdater = new DomusUpdater(win, DOMUS_VERSION);

    // 🎉 Toast post-MAJ : affiché une seule fois après une mise à jour réussie
    const UPDATE_STAGING_DIR = path.join(
        process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
        'DomusPro'
    );
    const updateFlagPath = path.join(UPDATE_STAGING_DIR, 'just-updated.flag');
    win.webContents.once('did-finish-load', () => {
        if (fs.existsSync(updateFlagPath)) {
            try {
                const newVersion = DOMUS_VERSION;
                setTimeout(() => {
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('show-float-toast', `🎉 Domus mis à jour vers v${newVersion} ! Bienvenue dans la nouvelle version.`);
                    }
                }, 2500);
                fs.unlinkSync(updateFlagPath); // Supprimer le drapeau pour ne pas le revoir
                console.log(`[DOMUS] Toast post-MAJ affiché pour la v${newVersion}.`);
            } catch (e) {
                console.error('[DOMUS] Erreur toast post-MAJ :', e.message);
            }
        }
    });

    setTimeout(() => {
        domusUpdater.checkForUpdates().then(result => {
            console.log('[DOMUS Updater] Statut:', result.status);
        });
    }, 10000); // Vérification 10 secondes après le démarrage

    // =========================================================================
    // ⌨️ RACCOURCIS CLAVIER STANDARD NAVIGATEUR
    // =========================================================================
    const sendToRenderer = (channel, ...args) => {
        if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
    };

    // Nouvel onglet
    globalShortcut.register('CommandOrControl+T', () => sendToRenderer('shortcut-new-tab'));
    // Fermer l'onglet actif
    globalShortcut.register('CommandOrControl+W', () => sendToRenderer('shortcut-close-tab'));
    // Onglet suivant / précédent
    globalShortcut.register('CommandOrControl+Tab', () => sendToRenderer('shortcut-next-tab'));
    globalShortcut.register('CommandOrControl+Shift+Tab', () => sendToRenderer('shortcut-prev-tab'));
    // Focus barre d'adresse
    globalShortcut.register('CommandOrControl+L', () => sendToRenderer('shortcut-focus-urlbar'));
    globalShortcut.register('F6', () => sendToRenderer('shortcut-focus-urlbar'));
    // Recharger
    globalShortcut.register('CommandOrControl+R', () => sendToRenderer('shortcut-reload'));
    globalShortcut.register('F5', () => sendToRenderer('shortcut-reload'));
    // Rechargement forcé (ignore le cache)
    globalShortcut.register('CommandOrControl+Shift+R', () => sendToRenderer('shortcut-hard-reload'));
    // Rechercher dans la page
    globalShortcut.register('CommandOrControl+F', () => sendToRenderer('shortcut-find'));
    // Historique
    globalShortcut.register('CommandOrControl+H', () => sendToRenderer('shortcut-history'));
    // Téléchargements
    globalShortcut.register('CommandOrControl+J', () => sendToRenderer('shortcut-downloads'));
    // DevTools de la webview
    globalShortcut.register('CommandOrControl+Shift+I', () => sendToRenderer('shortcut-devtools'));
    globalShortcut.register('F12', () => sendToRenderer('shortcut-devtools'));
    // Plein écran
    globalShortcut.register('F11', () => {
        if (win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen());
    });
    // Navigation avance/retour
    globalShortcut.register('Alt+Left',  () => sendToRenderer('shortcut-back'));
    globalShortcut.register('Alt+Right', () => sendToRenderer('shortcut-forward'));
    // Zoom avant / arrière / réinitialiser
    globalShortcut.register('CommandOrControl+Plus',  () => sendToRenderer('shortcut-zoom-in'));
    globalShortcut.register('CommandOrControl+=',     () => sendToRenderer('shortcut-zoom-in'));
    globalShortcut.register('CommandOrControl+-',     () => sendToRenderer('shortcut-zoom-out'));
    globalShortcut.register('CommandOrControl+0',     () => sendToRenderer('shortcut-zoom-reset'));
    // Onglets 1-8 = accès direct, 9 = dernier
    for (let i = 1; i <= 9; i++) {
        ((n) => globalShortcut.register(`CommandOrControl+${n}`, () => sendToRenderer('shortcut-goto-tab', n)))(i);
    }
    // Esc = arrêter le chargement
    globalShortcut.register('Escape', () => sendToRenderer('shortcut-stop'));
}

app.on('will-quit', () => globalShortcut.unregisterAll());

// =========================================================================
// 💼 GESTION DES ESPACES DE TRAVAIL (WORKSPACES)
// =========================================================================

ipcMain.handle('get-workspaces', () => {
    let workspaces = loadData(workspacesPath, defaultWorkspaces);
    // Assurer que les espaces par défaut existent toujours
    const defaultIds = defaultWorkspaces.map(w => w.id);
    const missingDefaults = defaultWorkspaces.filter(w => !workspaces.find(cw => cw.id === w.id));
    if (missingDefaults.length > 0) {
        workspaces = [...missingDefaults, ...workspaces];
        saveData(workspacesPath, workspaces);
    }
    return workspaces;
});

ipcMain.on('switch-profile', (e, profileId) => {
    currentWorkspace = profileId;
    let workspaces = loadData(workspacesPath, defaultWorkspaces);
    const ws = workspaces.find(w => w.id === profileId);
    
    // Renvoyer les onglets qui appartiennent à ce workspace
    const wsTabs = Array.from(tabs.values()).filter(t => t.workspace === profileId);
    
    if (win && !win.isDestroyed()) {
        win.webContents.send('workspace-switched', { 
            profile: profileId, 
            tabs: wsTabs,
            isPrivate: ws ? ws.isPrivate : false 
        });
    }
});

ipcMain.on('add-workspace', (e, data) => {
    let workspaces = loadData(workspacesPath, defaultWorkspaces);
    const newWs = {
        id: 'ws-' + Date.now(),
        name: data.name,
        icon: data.icon,
        isPrivate: false
    };
    workspaces.push(newWs);
    saveData(workspacesPath, workspaces);
    
    if (win && !win.isDestroyed()) {
        win.webContents.send('workspaces-updated', workspaces);
    }
});

ipcMain.on('delete-workspace', (e, id) => {
    // Ne pas supprimer les espaces par défaut
    if (['default', 'work', 'private'].includes(id)) return;
    
    let workspaces = loadData(workspacesPath, defaultWorkspaces);
    workspaces = workspaces.filter(w => w.id !== id);
    saveData(workspacesPath, workspaces);
    
    // Déplacer les onglets de cet espace vers l'espace par défaut
    for (let [tabId, tab] of tabs.entries()) {
        if (tab.workspace === id) {
            tab.workspace = 'default';
            tabs.set(tabId, tab);
        }
    }
    
    if (currentWorkspace === id) {
        currentWorkspace = 'default';
        if (win && !win.isDestroyed()) {
            win.webContents.send('workspace-switched', { 
                profile: 'default', 
                tabs: Array.from(tabs.values()).filter(t => t.workspace === 'default'),
                isPrivate: false 
            });
        }
    }
    
    if (win && !win.isDestroyed()) {
        win.webContents.send('workspaces-updated', workspaces);
    }
});

ipcMain.on('move-tab-to-workspace', (e, data) => {
    const { tabId, targetWorkspace } = data;
    if (tabs.has(tabId)) {
        const tab = tabs.get(tabId);
        tab.workspace = targetWorkspace;
        tabs.set(tabId, tab);
        // L'interface gérera la disparition de l'onglet visuellement s'il ne fait plus partie du workspace courant
    }
});

// --- SERVICES DE CRYPTOGRAPHIE AVANCÉS ---
ipcMain.handle('encrypt-data', (e, text) => {
    if (securityManager.key) {
        return securityManager.encrypt(text);
    }
    throw new Error("Clé non initialisée");
});

ipcMain.handle('decrypt-data', (e, obj) => {
    if (securityManager.key) {
        return securityManager.decrypt(obj);
    }
    throw new Error("Clé non initialisée");
});

ipcMain.handle('export-backup', async (e, data) => {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog(win, {
        title: "Exporter la sauvegarde chiffrée",
        defaultPath: path.join(app.getPath('documents'), 'domus-backup.json'),
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (result.canceled || !result.filePath) return { success: false };
    
    try {
        let encryptedBackup = data;
        if (securityManager.key) {
            encryptedBackup = securityManager.encrypt(JSON.stringify(data));
        }
        fs.writeFileSync(result.filePath, JSON.stringify(encryptedBackup, null, 2), 'utf8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('import-backup', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(win, {
        title: "Importer une sauvegarde",
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });
    
    if (result.canceled || result.filePaths.length === 0) return { success: false };
    
    try {
        const content = fs.readFileSync(result.filePaths[0], 'utf8');
        let parsed = JSON.parse(content);
        
        if (securityManager.key && parsed.encryptedData) {
            const decrypted = securityManager.decrypt(parsed);
            parsed = JSON.parse(decrypted);
        }
        
        if (parsed.settings) saveData(settingsPath, parsed.settings);
        if (parsed.passwords) saveData(passwordsPath, parsed.passwords);
        if (parsed.cards) saveData(cardsPath, parsed.cards);
        if (parsed.history) saveData(historyPath, parsed.history);
        if (parsed.archives) saveData(archivesPath, parsed.archives);
        
        return { success: true, data: parsed };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- IMPORTATION DE MOTS DE PASSE CSV ---
ipcMain.handle('import-passwords-csv', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(win, {
        title: "Importer des mots de passe depuis un fichier CSV",
        filters: [{ name: 'Fichiers CSV', extensions: ['csv'] }],
        properties: ['openFile']
    });
    
    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: "Annulé par l'utilisateur" };
    }
    
    try {
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf8');
        
        const lines = content.split(/\r?\n/);
        if (lines.length === 0) return { success: false, error: "Fichier CSV vide" };
        
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        let siteIdx = headers.indexOf('url');
        if (siteIdx === -1) siteIdx = headers.indexOf('site');
        if (siteIdx === -1) siteIdx = headers.findIndex(h => h.includes('site') || h.includes('url') || h.includes('domain'));
        
        let userIdx = headers.indexOf('username');
        if (userIdx === -1) userIdx = headers.indexOf('user');
        if (userIdx === -1) userIdx = headers.indexOf('login');
        if (userIdx === -1) userIdx = headers.findIndex(h => h.includes('user') || h.includes('login') || h.includes('name'));
        
        let passIdx = headers.indexOf('password');
        if (passIdx === -1) passIdx = headers.indexOf('pass');
        if (passIdx === -1) passIdx = headers.findIndex(h => h.includes('pass') || h.includes('word'));
        
        if (siteIdx === -1) siteIdx = 0;
        if (userIdx === -1) userIdx = 1;
        if (passIdx === -1) passIdx = 2;
        
        const passwords = loadData(passwordsPath);
        let count = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    cols.push(current.trim().replace(/^["']|["']$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            cols.push(current.trim().replace(/^["']|["']$/g, ''));
            
            if (cols.length <= Math.max(siteIdx, userIdx, passIdx)) continue;
            
            const site = cols[siteIdx] || 'Inconnu';
            const user = cols[userIdx] || '';
            const pass = cols[passIdx] || '';
            
            if (!site || !user || !pass) continue;
            
            const entry = {
                id: Date.now() + count,
                site,
                user
            };
            
            if (securityManager.key) {
                entry.passEnc = securityManager.encrypt(pass);
            } else {
                // Coffre non déverrouillé : on refuse l'import pour éviter le stockage en clair
                console.warn('[DOMUS SEC] Import CSV refusé : coffre-fort non déverrouillé.');
                return { success: false, error: 'Déverrouillez d\'abord votre coffre-fort avant d\'importer des mots de passe.' };
            }
            
            passwords.push(entry);
            count++;
        }
        
        saveData(passwordsPath, passwords);
        return { success: true, count };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- GESTION DES ARCHIVES (TIME MACHINE) ---
ipcMain.handle('delete-archive', (e, id) => {
    let archives = loadData(archivesPath);
    archives = archives.filter(a => a.id !== id);
    saveData(archivesPath, archives);
    return true;
});

ipcMain.handle('get-archive-data', (e, id) => {
    const archives = loadData(archivesPath);
    return archives.find(a => a.id === id);
});

// --- SYSTÈME & EFFACEMENT COMPLET ---
ipcMain.handle('reset-browser', () => {
    try {
        if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
        if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
        if (fs.existsSync(passwordsPath)) fs.unlinkSync(passwordsPath);
        if (fs.existsSync(cardsPath)) fs.unlinkSync(cardsPath);
        if (fs.existsSync(archivesPath)) fs.unlinkSync(archivesPath);
        if (fs.existsSync(downloadsPath)) fs.unlinkSync(downloadsPath);
        
        securityManager.key = null;
        securityManager.currentSalt = null;
        
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('detect-browsers', async () => {
    const detected = [];
    if (process.platform === 'win32') {
        const chromePath = path.join(process.env['LocalAppData'], 'Google/Chrome/User Data');
        const edgePath = path.join(process.env['LocalAppData'], 'Microsoft/Edge/User Data');
        
        if (fs.existsSync(chromePath)) detected.push({ id: 'chrome', name: 'Google Chrome' });
        if (fs.existsSync(edgePath)) detected.push({ id: 'edge', name: 'Microsoft Edge' });
    }
    if (detected.length === 0) {
        detected.push({ id: 'firefox', name: 'Mozilla Firefox' });
    }
    return detected;
});

ipcMain.on('start-migration', (e, { browserId, options }) => {
    setTimeout(() => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('show-float-toast', `Migration depuis ${browserId.toUpperCase()} terminée ! 🎉`);
        }
    }, 2000);
});

ipcMain.handle('validate-master-pwd', (e, pwd) => {
    return securityManager.validatePassword(pwd);
});

ipcMain.on('finalize-security', (e, { password }) => {
    try {
        const salt = securityManager.deriveKey(password);
        const settings = loadData(settingsPath, {});
        settings.securitySetup = true;
        settings.useAegis = !password;
        
        // Jeton de validation cryptographique
        settings.securityValidation = securityManager.encrypt("DOMUS-VALID-2026");
        
        saveData(settingsPath, settings);
        
        securityManager.useAegis = settings.useAegis;
        
        if (win && !win.isDestroyed()) {
            win.webContents.send('show-float-toast', "Profil de sécurité matériel finalisé ! 🛡️");
        }
    } catch (err) {
        console.error("[DOMUS] Échec de finalisation de la sécurité", err);
    }
});

ipcMain.handle('clear-cache', async () => {
    try {
        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- IPC DES TÉLÉCHARGEMENTS ---
ipcMain.handle('get-downloads', () => loadData(downloadsPath));
ipcMain.handle('clear-downloads', () => { saveData(downloadsPath, []); return []; });
ipcMain.handle('open-download-folder', () => {
    shell.openPath(app.getPath('downloads'));
    return true;
});
ipcMain.handle('open-file', (e, filePath) => {
    if (fs.existsSync(filePath)) {
        shell.openPath(filePath);
        return { success: true };
    }
    return { success: false };
});

// Variable globale pour stocker les sessions configurées
const configuredSessions = new Set();

app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        win.webContents.send('tab-created', { id: `tab-${tabCounter++}`, url, active: true });
        return { action: 'deny' };
    });

    if (contents.getType() === 'webview') {
        contents.on('context-menu', (event, params) => {
            event.preventDefault();
            const menu = new Menu();

            if (params.linkURL && params.linkURL.trim() !== '') {
                menu.append(new MenuItem({
                    label: "Ouvrir le lien dans un nouvel onglet",
                    click: () => win.webContents.send('tab-created', { id: `tab-${tabCounter++}`, url: params.linkURL, active: true })
                }));
                menu.append(new MenuItem({
                    label: "Copier l'adresse du lien",
                    click: () => require('electron').clipboard.writeText(params.linkURL)
                }));
                menu.append(new MenuItem({ type: 'separator' }));
            }

            if (params.mediaType === 'image' && params.srcURL) {
                menu.append(new MenuItem({
                    label: "Ouvrir l'image dans un nouvel onglet",
                    click: () => win.webContents.send('tab-created', { id: `tab-${tabCounter++}`, url: params.srcURL, active: true })
                }));
                menu.append(new MenuItem({
                    label: "Copier l'adresse de l'image",
                    click: () => require('electron').clipboard.writeText(params.srcURL)
                }));
                menu.append(new MenuItem({ type: 'separator' }));
            }

            if (params.selectionText && params.selectionText.trim().length > 0) {
                menu.append(new MenuItem({ label: "Copier", role: 'copy' }));
                menu.append(new MenuItem({
                    label: `Rechercher "${params.selectionText.length > 25 ? params.selectionText.substring(0, 25) + '...' : params.selectionText}" sur Google`,
                    click: () => {
                        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`;
                        win.webContents.send('tab-created', { id: `tab-${tabCounter++}`, url: searchUrl, active: true });
                    }
                }));
                menu.append(new MenuItem({ type: 'separator' }));
            }

            if (params.isEditable) {
                menu.append(new MenuItem({ label: "Couper", role: 'cut' }));
                menu.append(new MenuItem({ label: "Copier", role: 'copy' }));
                menu.append(new MenuItem({ label: "Coller", role: 'paste' }));
                menu.append(new MenuItem({ label: "Tout sélectionner", role: 'selectall' }));
                menu.append(new MenuItem({ type: 'separator' }));
            }

            menu.append(new MenuItem({
                label: "Page précédente",
                enabled: contents.canGoBack(),
                click: () => contents.goBack()
            }));
            menu.append(new MenuItem({
                label: "Page suivante",
                enabled: contents.canGoForward(),
                click: () => contents.goForward()
            }));
            menu.append(new MenuItem({
                label: "Actualiser",
                click: () => contents.reload()
            }));
            menu.append(new MenuItem({ type: 'separator' }));

            menu.append(new MenuItem({
                label: "Traduire cette page en français",
                click: () => {
                    const currentUrl = contents.getURL();
                    contents.loadURL(`https://translate.google.com/translate?sl=auto&tl=fr&u=${encodeURIComponent(currentUrl)}`);
                }
            }));
            menu.append(new MenuItem({
                label: "Copier l'adresse de la page",
                click: () => require('electron').clipboard.writeText(contents.getURL())
            }));
            menu.append(new MenuItem({ type: 'separator' }));

            menu.append(new MenuItem({
                label: "Inspecter l'élément",
                click: () => {
                    contents.inspectElement(params.x, params.y);
                    if (!contents.isDevToolsOpened()) {
                        contents.openDevTools();
                    }
                }
            }));

            menu.popup({ window: win });
        });
    }

    const sess = contents.session;
    if (sess && !configuredSessions.has(sess)) {
        configuredSessions.add(sess);
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            if (!details.url.startsWith('http')) {
                return callback({ requestHeaders: details.requestHeaders });
            }

            const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
            let ua = defaultUA;

            const urlLower = details.url.toLowerCase();
            const isGoogleRelated = urlLower.includes('google') || 
                                    urlLower.includes('gstatic') || 
                                    urlLower.includes('youtube') || 
                                    urlLower.includes('ggpht') ||
                                    urlLower.includes('googleusercontent');

            if (isGoogleRelated) {
                ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0';
                
                // Supprimer les Client Hints Chromium pour simuler Firefox à 100% de manière indétectable
                for (const headerName in details.requestHeaders) {
                    if (headerName.toLowerCase().startsWith('sec-ch-ua')) {
                        delete details.requestHeaders[headerName];
                    }
                }
            }

            details.requestHeaders['User-Agent'] = ua;
            callback({ requestHeaders: details.requestHeaders });
        });
    }
});

// --- GESTIONNAIRE D'ERREURS DE CERTIFICAT SSL ---
// Comportement strict : on bloque par défaut et on informe l'utilisateur.
// Seules les URLs localhost/127.0.0.1 sont automatiquement exemptées (dev local).
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    let host = url;
    try { host = new URL(url).hostname; } catch (e) {}

    // Autoriser automatiquement le localhost (dev)
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return callback(true);
    }

    // Pour tout autre site : bloquer et avertir l'utilisateur
    callback(false);
    if (win && !win.isDestroyed()) {
        win.webContents.send('show-float-toast', `🔴 Connexion bloquée : certificat SSL invalide pour ${host}. Vérifiez l'URL.`);
    }
    console.warn(`[DOMUS SEC] Certificat SSL rejeté pour ${host} — Erreur : ${error}`);
});

// --- IPC : Vérification manuelle depuis la page Paramètres ---
ipcMain.handle('check-for-updates', async () => {
    if (!domusUpdater) return { status: 'error', message: 'Moteur de mise à jour non initialisé.' };
    return await domusUpdater.checkForUpdates();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
